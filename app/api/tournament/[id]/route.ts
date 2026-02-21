import { NextResponse } from "next/server";
import * as tournamentQueries from "@/lib/db/queries/tournaments";
import * as matchQueries from "@/lib/db/queries/matches";
import * as modelQueries from "@/lib/db/queries/models";
import { generateRoundRobinRounds } from "@/lib/tournament/manager";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tournamentId = parseInt(id, 10);

  if (isNaN(tournamentId)) {
    return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
  }

  const tournament = tournamentQueries.getTournamentById(tournamentId);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const modelIds: number[] = JSON.parse(tournament.modelIds);
  const models = modelQueries.getModelsByIds(modelIds);
  const modelMap = new Map(models.map((m) => [m.id, m]));

  const allRounds = generateRoundRobinRounds(modelIds);

  let totalCompleted = 0;
  let totalRunning = 0;
  let totalGames = 0;

  const rounds = allRounds.map((round) => {
    let roundCompleted = 0;
    let roundRunning = 0;

    const pairings = round.pairings.map((p) => {
      totalGames++;
      const existing = matchQueries.getMatchByTournamentPairing(
        tournamentId,
        p.whiteId,
        p.blackId
      );
      if (existing?.status === "completed") {
        totalCompleted++;
        roundCompleted++;
      }
      if (existing?.status === "running") {
        totalRunning++;
        roundRunning++;
      }

      const wm = modelMap.get(p.whiteId);
      const bm = modelMap.get(p.blackId);

      return {
        whiteModel: wm
          ? { id: wm.id, name: wm.name, openrouterId: wm.openrouterId }
          : null,
        blackModel: bm
          ? { id: bm.id, name: bm.name, openrouterId: bm.openrouterId }
          : null,
        match: existing
          ? {
              id: existing.id,
              status: existing.status,
              result: existing.result,
              resultReason: existing.resultReason,
            }
          : null,
      };
    });

    const roundStatus =
      roundCompleted === round.pairings.length
        ? "completed"
        : roundCompleted > 0 || roundRunning > 0
          ? "partial"
          : "pending";

    return {
      roundNumber: round.roundNumber,
      isReverse: round.isReverse,
      pairings,
      status: roundStatus,
    };
  });

  return NextResponse.json({
    ...tournament,
    modelIds,
    rounds,
    stats: { total: totalGames, completed: totalCompleted, running: totalRunning },
  });
}
