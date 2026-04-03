import { runOpenAIJsonPrompt } from "./providers/openai";

export type AIProvider = "openai";

export async function runModel(args: {
  provider?: AIProvider;
  prompt: string;
  model?: string;
  maxOutputTokens?: number;
}) {
  const provider = args.provider ?? "openai";

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        ok: false as const,
        error: "OPENAI_API_KEY is missing.",
        raw: "",
      };
    }

    const result = await runOpenAIJsonPrompt({
      apiKey,
      prompt: args.prompt,
      model: args.model,
      maxOutputTokens: args.maxOutputTokens,
    });

    if (!result.ok) {
      return {
        ok: false as const,
        error: "OpenAI request failed.",
        raw: result.rawText || result.responseText || "",
      };
    }

    return {
      ok: true as const,
      rawText: result.rawText,
      rawResponseText: result.responseText,
    };
  }

  return {
    ok: false as const,
    error: "Unsupported AI provider.",
    raw: "",
  };
}
