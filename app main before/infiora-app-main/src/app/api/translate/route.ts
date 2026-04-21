import { NextResponse } from "next/server";
import { Translate } from "@google-cloud/translate/build/src/v2";

// Ensure your API key is in .env.local WITHOUT the NEXT_PUBLIC_ prefix
const translateClient = new Translate({
  key: process.env.GOOGLE_TRANSLATE_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { texts, targetLang } = await request.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ translations: [] });
    }

    // Google Translate SDK supports passing an array of strings for batching
    const [translations] = await translateClient.translate(texts, targetLang);

    // Ensure we always return an array even if only one string was sent
    const results = Array.isArray(translations) ? translations : [translations];

    return NextResponse.json({ translations: results });
  } catch (error: any) {
    console.error("Translation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
