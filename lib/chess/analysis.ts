/**
 * Shared chess analysis utilities.
 * Used by both client components and server-side code.
 */

export type MoveQuality =
  | "brilliant"
  | "great"
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | null;

/**
 * Classify a move based on centipawn loss between the previous and current eval.
 * Evals are always from white's perspective.
 */
export function classifyMove(
  prevEval: number | null,
  currEval: number | null,
  color: "white" | "black",
  moveNumber: number
): MoveQuality {
  if (prevEval === null || currEval === null) return null;

  let cpl: number;
  if (color === "white") {
    cpl = Math.max(0, prevEval - currEval);
  } else {
    cpl = Math.max(0, currEval - prevEval);
  }

  if (cpl > 200) return "blunder";
  if (cpl > 100) return "mistake";
  if (cpl > 50) return "inaccuracy";

  const absEval = Math.abs(currEval);

  // Brilliant: very precise move in a sharp/complex position, later in the game
  if (moveNumber >= 10 && cpl <= 2 && absEval > 300) return "brilliant";

  // Great: precise move maintaining a big advantage
  if (moveNumber >= 6 && cpl <= 5 && absEval > 200) return "great";

  // Best: engine's top move in a non-trivial position
  if (moveNumber >= 6 && cpl === 0 && absEval > 50) return "best";

  // Good: reasonable move, small centipawn loss
  if (cpl <= 10) return "good";

  return null;
}

/**
 * Convert centipawn eval to win probability percentage (0-100).
 * Uses the Lichess formula.
 */
export function winProbability(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/**
 * Estimate ELO rating from average centipawn loss (ACPL).
 *
 * Uses the well-known Lichess community formula: ELO = 3100 * e^(-0.01 * ACPL)
 *
 * Benchmarks (from Lichess data):
 *   ACPL < 21  → GM (2500+)
 *   ACPL < 34  → Master (2200+)
 *   ACPL < 54  → Expert (1800+)
 *   ACPL < 95  → Average (1200+)
 *   ACPL > 100 → Beginner (<1200)
 */
export function estimateElo(acpl: number): number {
  if (acpl < 0) acpl = 0;
  const elo = 3100 * Math.exp(-0.01 * acpl);
  return Math.max(200, Math.min(3200, Math.round(elo)));
}

/**
 * Detect whether a move caused a critical swing in win probability.
 * Returns the swing amount (positive = favoring white, negative = favoring black),
 * or 0 if it's not a critical moment.
 */
export function getCriticalSwing(
  prevEval: number | null,
  currEval: number | null,
  threshold = 15
): number {
  if (prevEval === null || currEval === null) return 0;
  const prevWp = winProbability(prevEval);
  const currWp = winProbability(currEval);
  const swing = currWp - prevWp;
  return Math.abs(swing) >= threshold ? swing : 0;
}

export const QUALITY_META: Record<
  Exclude<MoveQuality, null>,
  { icon: string; color: string; title: string }
> = {
  brilliant: { icon: "!!", color: "text-cyan-400", title: "Brilliant" },
  great: { icon: "!", color: "text-blue-400", title: "Great move" },
  best: { icon: "★", color: "text-green-400", title: "Best move" },
  good: { icon: "", color: "", title: "Good move" },
  inaccuracy: { icon: "?!", color: "text-yellow-400", title: "Inaccuracy" },
  mistake: { icon: "?", color: "text-orange-400", title: "Mistake" },
  blunder: { icon: "??", color: "text-red-400", title: "Blunder" },
};
