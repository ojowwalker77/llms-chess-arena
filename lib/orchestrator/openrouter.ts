const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Call OpenRouter with a single prompt (no tool calling).
 * Returns the model's text response.
 */
export async function callOpenRouter(
  model: string,
  prompt: string,
  options?: { timeout?: number }
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const controller = new AbortController();
  const timeoutMs = options?.timeout || 120000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://chess-llm-arena.local",
        "X-Title": "Chess LLM Arena",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenRouter HTTP ${response.status}: ${errorBody}`
      );
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`OpenRouter error: ${data.error.message}`);
    }

    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error("OpenRouter returned no choices");
    }

    return choice.message?.content || "";
  } finally {
    clearTimeout(timeoutId);
  }
}
