import type { Pairing, Round } from "./types";

/**
 * Generate round-robin rounds using the circle method.
 * Each round has N/2 games. First half = original colors, second half = mirrored.
 * For 12 models: 22 rounds × 6 games = 132 total.
 */
export function generateRoundRobinRounds(modelIds: number[]): Round[] {
  const n = modelIds.length;
  const ids = n % 2 === 0 ? [...modelIds] : [...modelIds, -1];
  const total = ids.length;
  const half = total / 2;
  const numRounds = total - 1;

  const rounds: Round[] = [];

  // First half: original colors
  for (let r = 0; r < numRounds; r++) {
    const pairings: Pairing[] = [];
    const rotated = [ids[0]];
    for (let i = 1; i < total; i++) {
      rotated.push(ids[((i - 1 + r) % (total - 1)) + 1]);
    }
    for (let i = 0; i < half; i++) {
      const white = rotated[i];
      const black = rotated[total - 1 - i];
      if (white !== -1 && black !== -1) {
        pairings.push({ whiteId: white, blackId: black });
      }
    }
    rounds.push({ roundNumber: r + 1, pairings, isReverse: false });
  }

  // Second half: mirror colors
  for (let r = 0; r < numRounds; r++) {
    const original = rounds[r];
    rounds.push({
      roundNumber: numRounds + r + 1,
      pairings: original.pairings.map((p) => ({
        whiteId: p.blackId,
        blackId: p.whiteId,
      })),
      isReverse: true,
    });
  }

  return rounds;
}

/**
 * Flatten rounds into a flat pairing list (backward compat).
 */
export function generateRoundRobinPairings(modelIds: number[]): Pairing[] {
  return generateRoundRobinRounds(modelIds).flatMap((r) => r.pairings);
}
