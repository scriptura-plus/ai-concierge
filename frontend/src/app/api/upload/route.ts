import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (filename && request.body && token) {
    const blob = await put(filename, request.body, {
      access: "public",
      token: token,
    });
    return NextResponse.json(blob);
  }
  return NextResponse.json({ error: "File not found." }, { status: 400 });
}