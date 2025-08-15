import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
    try {
        const { question, blobUrl } = await req.json();
        const resp = await fetch(blobUrl, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
        if (!resp.ok) return NextResponse.json({ error: "Cannot read blob" }, { status: 400 });
        const text = await resp.text();
        
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `Answer ONLY from the document below. If not found, say you don't know.\n\nQuestion: ${question}\n\nDocument:\n"""${text}"""`;
        const result = await model.generateContent(prompt);
        
        return NextResponse.json({ answer: result.response.text() });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "ask-file failed" }, { status: 500 });
    }
}