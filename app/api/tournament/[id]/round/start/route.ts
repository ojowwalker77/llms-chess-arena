import { NextResponse } from "next/server";
import * as tournamentQueries from "@/lib/db/queries/tournaments";
import * as matchQueries from "@/lib/db/queries/matches";
import { generateRoundRobinRounds } from "@/lib/tournament/manager";
import { startMatch } from "@/lib/orchestrator/start-match";

export async function POST(
  request: Request,
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

  const body = await request.json();
  const { roundNumber } = body;

  if (!roundNumber || typeof roundNumber !== "number") {
    return NextResponse.json(
      { error: "roundNumber is required" },
      { status: 400 }
    );
  }

  const modelIds: number[] = JSON.parse(tournament.modelIds);
  const rounds = generateRoundRobinRounds(modelIds);
  const round = rounds.find((r) => r.roundNumber === roundNumber);

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const started: number[] = [];

  for (const pairing of round.pairings) {
    // Skip if match already exists for this pairing
    const existing = matchQueries.getMatchByTournamentPairing(
      tournamentId,
      pairing.whiteId,
      pairing.blackId
    );
    if (existing) continue;

    const result = startMatch({
      whiteModelId: pairing.whiteId,
      blackModelId: pairing.blackId,
      tournamentId,
    });

    if (result.matchId) {
      started.push(result.matchId);
    }
  }

  return NextResponse.json(
    { started, count: started.length },
    { status: 201 }
  );
}
