"use client";

import { FormEvent, useState } from "react";

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

type Message = {
	role: "assistant" | "user";
	content: string;
};

type DocumentChunk = {
	index: number;
	text: string;
	start: number;
	end: number;
};

type UploadResponse = {
	success: boolean;
	message?: string;
	file?: {
		name: string;
		size: number;
		pages: number;
	};
	textLength?: number;
	chunks?: DocumentChunk[];
};

type SearchResponse = {
	success: boolean;
	message?: string;
	question?: string;
};

const initialMessages: Message[] = [
	{
		role: "assistant",
		content: "Upload a PDF, then ask a question about the document.",
	},
];

export default function RagChatPage() {
	const [fileName, setFileName] = useState("");
	const [uploadStatus, setUploadStatus] = useState("");
	const [question, setQuestion] = useState("");
	const [messages, setMessages] = useState<Message[]>(initialMessages);
	const [isSearching, setIsSearching] = useState(false);

	function updateMessageContent(messageIndex: number, content: string) {
		setMessages((currentMessages) =>
			currentMessages.map((message, index) =>
				index === messageIndex ? { ...message, content } : message,
			),
		);
	}

	async function handleFileUpload(file: File) {
		setFileName(file.name);
		setUploadStatus("Uploading and extracting PDF...");

		const formData = new FormData();
		formData.append("file", file);

		try {
			const response = await fetch(`${API_BASE_URL}/documents/upload`, {
				method: "POST",
				body: formData,
			});
			const data = (await response.json()) as UploadResponse;

			if (!response.ok || !data.success) {
				throw new Error(data.message ?? "Unable to upload this PDF.");
			}

			const pageCount = data.file?.pages ?? 0;
			const chunkCount = data.chunks?.length ?? 0;

			setUploadStatus(
				`Extracted ${chunkCount} chunks from ${pageCount} pages.`,
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to upload this PDF.";

			setUploadStatus(message);
		}
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedQuestion = question.trim();
		if (!trimmedQuestion) {
			return;
		}

		setIsSearching(true);
		setQuestion("");
		const assistantMessageIndex = messages.length + 1;
		setMessages((currentMessages) => [
			...currentMessages,
			{ role: "user", content: trimmedQuestion },
			{ role: "assistant", content: "" },
		]);

		try {
			const response = await fetch(`${API_BASE_URL}/search`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ question: trimmedQuestion }),
			});

			if (!response.ok) {
				let message = "Unable to search this document.";

				try {
					const data = (await response.json()) as SearchResponse;
					message = data.message ?? message;
				} catch {
					const responseText = await response.text();
					message = responseText || message;
				}

				throw new Error(message);
			}

			if (!response.body) {
				throw new Error("Streaming is not supported by this browser.");
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let streamedAnswer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}

				streamedAnswer += decoder.decode(value, { stream: true });
				updateMessageContent(assistantMessageIndex, streamedAnswer);
			}

			streamedAnswer += decoder.decode();
			updateMessageContent(
				assistantMessageIndex,
				streamedAnswer.trim() || "No answer was returned for this question.",
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to search this document.";

			console.error("Search API error:", error);
			updateMessageContent(assistantMessageIndex, message);
		} finally {
			setIsSearching(false);
		}
	}

	return (
		<main className="min-h-screen bg-[#f8fafc] px-4 py-6 text-[#111827] sm:px-6">
			<section className="mx-auto flex w-full max-w-4xl flex-col gap-5">
				<header>
					<h1 className="text-2xl font-semibold tracking-normal">
						Document Chat
					</h1>
				</header>

				<section className="rounded-lg border border-[#d8dee8] bg-white p-4 shadow-sm">
					<label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#aeb8c8] bg-[#f8fafc] px-4 py-8 text-center transition hover:border-[#64748b] hover:bg-[#f1f5f9]">
						<span className="text-sm font-semibold text-[#111827]">
							Upload PDF
						</span>
						<span className="mt-1 text-sm text-[#64748b]">
							Choose a file from your device
						</span>
						<input
							className="sr-only"
							type="file"
							accept="application/pdf"
							onChange={(event) => {
								const selectedFile = event.target.files?.[0];
								if (selectedFile) {
									handleFileUpload(selectedFile);
								}
							}}
						/>
					</label>

					<p className="mt-3 truncate text-sm text-[#475569]">
						{fileName ? `Selected: ${fileName}` : "No file selected"}
					</p>
					{uploadStatus ? (
						<p className="mt-2 text-sm text-[#475569]">{uploadStatus}</p>
					) : null}
				</section>

				<section className="flex min-h-[560px] flex-col rounded-lg border border-[#d8dee8] bg-white shadow-sm">
					<div className="flex-1 space-y-4 overflow-y-auto p-4">
						{messages.map((message, index) => (
							<div
								key={`${message.role}-${index}`}
								className={`flex ${
									message.role === "user" ? "justify-end" : "justify-start"
								}`}
							>
								<div
									className={`max-w-[min(720px,88%)] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-6 ${
										message.role === "user"
											? "bg-[#111827] text-white"
											: "bg-[#f1f5f9] text-[#1f2937]"
									}`}
								>
									{message.content || "Thinking..."}
								</div>
							</div>
						))}
					</div>

					<form
						className="border-t border-[#e2e8f0] p-4"
						onSubmit={handleSubmit}
					>
						<div className="flex flex-col gap-3 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] p-3 sm:flex-row">
							<textarea
								className="min-h-20 flex-1 resize-none bg-transparent text-sm leading-6 text-[#111827] outline-none placeholder:text-[#64748b]"
								onChange={(event) => setQuestion(event.target.value)}
								placeholder="Ask a question about the uploaded PDF..."
								value={question}
							/>
							<button
								className="h-11 rounded-md bg-[#111827] px-5 text-sm font-semibold text-white transition hover:bg-[#374151] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
								disabled={!question.trim() || isSearching}
								type="submit"
							>
								{isSearching ? "Searching" : "Send"}
							</button>
						</div>
					</form>
				</section>
			</section>
		</main>
	);
}
