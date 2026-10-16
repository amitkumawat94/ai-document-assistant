import type { Request, Response } from "express";
import { getEmbedding } from "../services/embedding.service";
import { searchSimilarChunks } from "../services/qdrant.service";
import { generateAnswerFromContext } from "../services/llm.service";


export async function searchAnswer(req: Request, res: Response) {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({
                success: false,
                message: "Question is required",
            });
        }

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const questionEmbedding: any[] = await getEmbedding(question);

        const results = await searchSimilarChunks(questionEmbedding, 3);

        const context = results.map((match, index) => {
            return `Chunk ${index + 1}:\n${match.payload?.text}`;
        })
        .join("\n\n");
        for await (const answerChunk of generateAnswerFromContext(question, context)) {
            res.write(answerChunk);
        }

        return res.end();
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to chat.";
        if (res.headersSent) {
            res.write(`\n\n${message}`);
            return res.end();
            }
        res.status(500).json({
            success: false,
            message: "Semantic search failed",
        });
    }
}
