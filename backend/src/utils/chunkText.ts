import { getEmbedding } from "../services/embedding.service";

export type TextChunk = {
	id: number;
	vector: any[];
	payload: any;
};

const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_OVERLAP = 200;

export async function chunkText(
	text: string,
	chunkSize = DEFAULT_CHUNK_SIZE,
	overlap = DEFAULT_OVERLAP,
): Promise<TextChunk[]> {
	const normalizedText = text.replace(/\s+/g, " ").trim();

	if (!normalizedText) {
		return [];
	}

	const chunks: TextChunk[] = [];
	let start = 0;
	let id:number = 1;
	while (start < normalizedText.length) {
		const targetEnd = Math.min(start + chunkSize, normalizedText.length);
		const end = findChunkEnd(normalizedText, start, targetEnd, chunkSize);
		const chunk = normalizedText.slice(start, end).trim();

		if (chunk) {
			chunks.push({
				id: id,
				vector: await getEmbedding(chunk),
				payload: {
					text: chunk,
					chunkIndex: chunks.length,
				},
			});
		}

		if (end >= normalizedText.length) {
			break;
		}
		id = id+1;
		start = Math.max(end - overlap, start + 1);
	}

	return chunks;
}


function findChunkEnd(
	text: string,
	start: number,
	targetEnd: number,
	chunkSize: number,
) {
	if (targetEnd >= text.length) {
		return text.length;
	}

	const sentenceEnd = Math.max(
		text.lastIndexOf(". ", targetEnd),
		text.lastIndexOf("? ", targetEnd),
		text.lastIndexOf("! ", targetEnd),
	);

	if (sentenceEnd > start + chunkSize / 2) {
		return sentenceEnd + 1;
	}

	const wordEnd = text.lastIndexOf(" ", targetEnd);
	if (wordEnd > start) {
		return wordEnd;
	}

	return targetEnd;
}

