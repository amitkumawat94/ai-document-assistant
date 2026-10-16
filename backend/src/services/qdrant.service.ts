import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrant = new QdrantClient({
	host: "localhost",
	port: 6333,
});

export async function searchSimilarChunks(
	questionEmbedding: number[],
	limit = 3
) {
	const results = await qdrant.search("documents", {
		vector: questionEmbedding,
		limit,
		with_payload: true,
	});

	return results;
}