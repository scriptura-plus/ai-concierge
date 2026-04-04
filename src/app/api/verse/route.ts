import { NextResponse } from "next/server";
import { getVerseText } from "@/lib/bible/getVerseText";

export async function POST(req: Request) {
  try {
    const { book, chapter, verse } = await req.json();

    const safeBook = String(book ?? "").trim();
    const safeChapter = String(chapter ?? "").trim();
    const safeVerse = String(verse ?? "").trim();

    if (!safeBook || !safeChapter || !safeVerse) {
      return NextResponse.json(
        { error: "book, chapter, and verse are required." },
        { status: 400 }
      );
    }

    const verseText = await getVerseText(safeBook, safeChapter, safeVerse);

    if (!verseText) {
      return NextResponse.json(
        { error: "Failed to load verse text from WEB API." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reference: `${safeBook} ${safeChapter}:${safeVerse}`,
      verseText,
    });
  } catch (error) {
    console.error("Verse API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while loading verse text.",
      },
      { status: 500 }
    );
  }
}
