import { NextResponse } from "next/server";
import * as modelQueries from "@/lib/db/queries/models";
import * as matchQueries from "@/lib/db/queries/matches";
import { runGame } from "@/lib/orchestrator/game-runner";

export async function POST(request: Request) {
  const body = await request.json();
  const { whiteModelId, blackModelId, tournamentId } = body;

  if (!whiteModelId || !blackModelId) {
    return NextResponse.json(
      { error: "whiteModelId and blackModelId are required" },
      { status: 400 }
    );
  }

  const whiteModel = modelQueries.getModelById(whiteModelId);
  const blackModel = modelQueries.getModelById(blackModelId);

  if (!whiteModel || !blackModel) {
    return NextResponse.json(
      { error: "One or both models not found" },
      { status: 404 }
    );
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

  return NextResponse.json({ id: match.id, status: "running" }, { status: 201 });
}
