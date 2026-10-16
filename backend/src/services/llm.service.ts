import "../config/env";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function* generateAnswerFromContext(
    question: string,
    context: string
):AsyncGenerator<string> {
    
    const stream = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        messages: [
            {
                role: "system",
                content: `
You are a helpful document assistant.
Answer only using the provided context.
If the answer is not available in the context, say:
"I could not find this information in the uploaded document."
Do not make up facts.
        `,
            },
            {
                role: "user",
                content: `
                    Context:
                    ${context}

                    Question:
                    ${question}
        `,
            },
        ],
        temperature: 0.2,
        stream: true,

    });
    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;

        if (content) {
            yield content;
        }
    }
    // return completion.choices[0]?.message?.content || "";
}