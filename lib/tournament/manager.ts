import type { Pairing } from "./types";

/**
 * Generate round-robin pairings where each pair plays twice (swap colors).
 * Shuffled with a seeded PRNG so order is random but deterministic.
 */
export function generateRoundRobinPairings(modelIds: number[]): Pairing[] {
  const pairings: Pairing[] = [];
  for (let i = 0; i < modelIds.length; i++) {
    for (let j = i + 1; j < modelIds.length; j++) {
      pairings.push({ whiteId: modelIds[i], blackId: modelIds[j] });
      pairings.push({ whiteId: modelIds[j], blackId: modelIds[i] });
    }
  }

  // Seeded shuffle so it's random but stable across page loads
  let seed = 42;
  for (let i = pairings.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    const j = seed % (i + 1);
    [pairings[i], pairings[j]] = [pairings[j], pairings[i]];
  }

  return pairings;
}
