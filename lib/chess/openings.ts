/**
 * Opening classification using ECO codes.
 * Matches a game's move sequence against a static ECO database
 * using longest-prefix matching.
 */

import ecoData from "./eco.json";

interface EcoEntry {
  eco: string;
  name: string;
  moves: string;
}

interface Opening {
  eco: string;
  name: string;
  ply: number; // how many half-moves matched
}

/**
 * Parse a move string like "1.e4 e5 2.Nf3 Nc6 3.Bb5" into an array
 * of SAN moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"]
 */
function parseMoves(moveStr: string): string[] {
  return moveStr
    .replace(/\d+\./g, "") // strip move numbers
    .split(/\s+/)
    .filter((s) => s.length > 0);
}

// Pre-parse the ECO database on module load
const parsedEco: Array<{ eco: string; name: string; sans: string[] }> =
  (ecoData as EcoEntry[]).map((entry) => ({
    eco: entry.eco,
    name: entry.name,
    sans: parseMoves(entry.moves),
  }));

/**
 * Identify the opening from a list of SAN moves.
 * Uses longest-prefix matching against the ECO database.
 */
export function identifyOpening(gameMoves: string[]): Opening | null {
  let best: { eco: string; name: string; ply: number } | null = null;

  for (const entry of parsedEco) {
    const { eco, name, sans } = entry;
    if (sans.length === 0) continue;

    // Check if the game starts with this opening's moves
    let matched = true;
    const matchLen = Math.min(sans.length, gameMoves.length);
    if (matchLen === 0) continue;

    for (let i = 0; i < matchLen; i++) {
      if (sans[i] !== gameMoves[i]) {
        matched = false;
        break;
      }
    }

    // Only count if ALL of the opening's moves were matched
    if (matched && gameMoves.length >= sans.length) {
      if (!best || sans.length > best.ply) {
        best = { eco, name, ply: sans.length };
      }
    }
  }

  return best;
}
