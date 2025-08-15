import type { NextApiRequest, NextApiResponse } from "next";
import { put } from "@vercel/blob";
export const config = { api: { bodyParser: false } };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return res.status(500).json({ error: "BLOB token missing" });
    const chunks: Uint8Array[] = []; for await (const chunk of req) chunks.push(chunk as Uint8Array);
    const buf = Buffer.concat(chunks);
    const { url } = await put(`upload-${Date.now()}.txt`, buf, {
      access: "public", token, contentType: "text/plain; charset=utf-8",
    });
    return res.status(200).json({ url });
  } catch (e: any) { return res.status(500).json({ error: e?.message || "Upload failed" }); }
}
