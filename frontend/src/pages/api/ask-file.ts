import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { question, blobUrl } = req.body || {};
    if (!question || typeof question !== "string") return res.status(400).json({ error: "question required" });
    if (!blobUrl || typeof blobUrl !== "string") return res.status(400).json({ error: "blobUrl required" });
    const resp = await fetch(blobUrl, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
    if (!resp.ok) return res.status(400).json({ error: "cannot read blob" });
    const text = await resp.text();
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GOOGLE_API_KEY missing" });
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Answer ONLY from the document below. If not found, say you don't know.\n\nQuestion: ${question}\n\nDocument:\n"""${text}"""`;
    const result = await model.generateContent(prompt);
    return res.status(200).json({ answer: result.response.text() });
  } catch (e: any) { return res.status(500).json({ error: e?.message || "ask-file failed" }); }
}
