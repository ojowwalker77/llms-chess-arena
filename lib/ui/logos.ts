const LAB_LOGOS: Record<string, string> = {
  anthropic: "/logos/Claude AI.svg",
  openai: "/logos/OpenAI-dark.svg",
  google: "/logos/Gemini.svg",
  deepseek: "/logos/DeepSeek.svg",
  "x-ai": "/logos/Grok-dark.svg",
  moonshotai: "/logos/Kimi.svg",
};

// Fallback for models routed through gateways (e.g. opencode/)
const MODEL_NAME_LOGOS: Array<{ pattern: string; logo: string }> = [
  { pattern: "glm", logo: "/logos/GLM.svg" },
  { pattern: "minimax", logo: "/logos/MiniMax.svg" },
];

export function getLabLogo(openrouterId: string): string | null {
  const org = openrouterId.split("/")[0];
  if (LAB_LOGOS[org]) return LAB_LOGOS[org];

  const lower = openrouterId.toLowerCase();
  for (const { pattern, logo } of MODEL_NAME_LOGOS) {
    if (lower.includes(pattern)) return logo;
  }

  return null;
}
