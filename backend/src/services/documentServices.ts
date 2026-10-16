import { PDFParse } from "pdf-parse";
import { chunkText } from "../utils/chunkText";
import type { TextChunk } from "../utils/chunkText";
import { qdrant } from "../services/qdrant.service";

type ExtractPdfInput = {
	buffer: Buffer;
	fileName: string;
	fileSize: number;
};

type ExtractPdfResult = {
	file: {
		name: string;
		size: number;
		pages: number;
	};
	textLength: number;
	chunks: TextChunk[];
};

export async function extractChunkedTextFromPdf({
	buffer,
	fileName,
	fileSize,
}: ExtractPdfInput): Promise<ExtractPdfResult> {
	const parser = new PDFParse({ data: buffer });

	try {
		const result = await parser.getText();
		const chunks:any = await chunkText(result.text);
		await qdrant.createCollection("documents", {
		vectors: {
			size: 384,
			distance: "Cosine",
		},
		});
		await qdrant.upsert("documents", {
			wait: true,
			points: chunks,
		});
		return {
			file: {
				name: fileName,
				size: fileSize,
				pages: result.total,
			},
			textLength: result.text.length,
			chunks,
		};
	} finally {
		await parser.destroy();
	}
}
