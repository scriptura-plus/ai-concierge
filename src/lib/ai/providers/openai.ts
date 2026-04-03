export function extractOpenAIText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const pieces =
    data?.output
      ?.flatMap((item: any) => item?.content ?? [])
      ?.map((part: any) => {
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.output_text === "string") return part.output_text;
        return "";
      })
      ?.filter(Boolean) ?? [];

  return pieces.join("").trim();
}

export async function runOpenAIJsonPrompt(args: {
  apiKey: string;
  prompt: string;
  model?: string;
  maxOutputTokens?: number;
}) {
  const {
    apiKey,
    prompt,
    model = "gpt-5.4-mini",
    maxOutputTokens = 3000,
  } = args;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_output_tokens: maxOutputTokens,
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    return {
      ok: false as const,
      responseText,
      rawText: "",
      data: null,
    };
  }

  let data: any;

  try {
    data = JSON.parse(responseText);
  } catch {
    return {
      ok: false as const,
      responseText,
      rawText: responseText || "",
      data: null,
    };
  }

  const rawText = extractOpenAIText(data);

  return {
    ok: true as const,
    responseText,
    rawText,
    data,
  };
}
