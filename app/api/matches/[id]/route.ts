import { NextResponse } from "next/server";
import * as matchQueries from "@/lib/db/queries/matches";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = parseInt(id, 10);

  if (isNaN(matchId)) {
    return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
  }

  const match = matchQueries.getMatchWithModels(matchId);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const moves = matchQueries.getMatchMoves(matchId);

  return NextResponse.json({ ...match, moves });
}
