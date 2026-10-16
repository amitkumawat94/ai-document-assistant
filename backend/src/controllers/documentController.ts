import type { Request, Response } from "express";
import multer from "multer";
import { extractChunkedTextFromPdf } from "../services/documentServices";

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024,
	},
	fileFilter: (_request, file, callback) => {
		if (file.mimetype !== "application/pdf") {
			callback(new Error("Only PDF files are supported."));
			return;
		}

		callback(null, true);
	},
});

export async function uploadDocument(request: Request, response: Response) {
	upload.single("file")(request, response, async (uploadError) => {
		if (uploadError) {
			handleUploadError(uploadError, response);
			return;
		}

		await extractAndRespond(request, response);
	});
}

async function extractAndRespond(request: Request, response: Response) {
	if (!request.file) {
		response.status(400).json({
			success: false,
			message: "PDF file is required.",
		});
		return;
	}

	try {
		const result = await extractChunkedTextFromPdf({
			buffer: request.file.buffer,
			fileName: request.file.originalname,
			fileSize: request.file.size,
		});

		response.json({
			success: true,
			...result,
		});
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Unable to extract text from this PDF.";

		response.status(422).json({
			success: false,
			message,
		});
	}
}

function handleUploadError(error: unknown, response: Response) {
	if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
		response.status(413).json({
			success: false,
			message: "PDF file must be 10MB or smaller.",
		});
		return;
	}

	response.status(400).json({
		success: false,
		message: error instanceof Error ? error.message : "Invalid upload.",
	});
}
