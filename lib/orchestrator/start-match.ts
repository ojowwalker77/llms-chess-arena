import * as modelQueries from "@/lib/db/queries/models";
import * as matchQueries from "@/lib/db/queries/matches";
import { runGame } from "./game-runner";

/**
 * Create a match and fire-and-forget the game runner.
 * Returns the match ID on success.
 */
export function startMatch(params: {
  whiteModelId: number;
  blackModelId: number;
  tournamentId?: number;
}): { matchId: number; error?: never } | { matchId?: never; error: string } {
  const { whiteModelId, blackModelId, tournamentId } = params;

  const whiteModel = modelQueries.getModelById(whiteModelId);
  const blackModel = modelQueries.getModelById(blackModelId);

  if (!whiteModel || !blackModel) {
    return { error: "One or both models not found" };
  }

  const match = matchQueries.createMatch({
    whiteModelId,
    blackModelId,
    ...(tournamentId ? { tournamentId } : {}),
  });

  // Fire-and-forget: run game in background
  runGame({
    matchId: match.id,
    whiteModel: {
      id: whiteModel.id,
      name: whiteModel.name,
      openrouterId: whiteModel.openrouterId,
    },
    blackModel: {
      id: blackModel.id,
      name: blackModel.name,
      openrouterId: blackModel.openrouterId,
    },
  })
    .then((outcome) => {
      const wModel = modelQueries.getModelById(whiteModelId)!;
      const bModel = modelQueries.getModelById(blackModelId)!;

      let whiteWinInc = 0,
        whiteDrawInc = 0,
        whiteLossInc = 0;
      let blackWinInc = 0,
        blackDrawInc = 0,
        blackLossInc = 0;

      if (outcome.result === "draw") {
        whiteDrawInc = 1;
        blackDrawInc = 1;
      } else if (outcome.result === "white") {
        whiteWinInc = 1;
        blackLossInc = 1;
      } else {
        whiteLossInc = 1;
        blackWinInc = 1;
      }

      modelQueries.updateModelStats(whiteModelId, {
        eloRating: wModel.eloRating,
        gamesPlayed: wModel.gamesPlayed + 1,
        wins: wModel.wins + whiteWinInc,
        draws: wModel.draws + whiteDrawInc,
        losses: wModel.losses + whiteLossInc,
      });

      modelQueries.updateModelStats(blackModelId, {
        eloRating: bModel.eloRating,
        gamesPlayed: bModel.gamesPlayed + 1,
        wins: bModel.wins + blackWinInc,
        draws: bModel.draws + blackDrawInc,
        losses: bModel.losses + blackLossInc,
      });

      console.log(
        `[Match ${match.id}] ${whiteModel.name} vs ${blackModel.name}: ${outcome.result} (${outcome.reason})`
      );
    })
    .catch((error) => {
      console.error(`[Match ${match.id}] failed:`, error);
      matchQueries.updateMatchStatus(match.id, "failed");
    });

  return { matchId: match.id };
}
