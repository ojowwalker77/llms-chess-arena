const K_FACTOR = 32;

/**
 * Calculate new ELO ratings after a game.
 * @param scoreA - 1 for win, 0.5 for draw, 0 for loss (from A's perspective)
 */
export function calculateEloChange(
  ratingA: number,
  ratingB: number,
  scoreA: number
): { newRatingA: number; newRatingB: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const scoreB = 1 - scoreA;

  return {
    newRatingA: Math.round((ratingA + K_FACTOR * (scoreA - expectedA)) * 10) / 10,
    newRatingB: Math.round((ratingB + K_FACTOR * (scoreB - expectedB)) * 10) / 10,
  };
}
