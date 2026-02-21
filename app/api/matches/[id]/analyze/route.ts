import { NextResponse } from "next/server";
import * as matchQueries from "@/lib/db/queries/matches";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = parseInt(id, 10);

  if (isNaN(matchId)) {
    return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
  }

  const match = matchQueries.getMatchById(matchId);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const body = await request.json();
  const { evaluations } = body;

  if (!evaluations || !Array.isArray(evaluations)) {
    return NextResponse.json(
      { error: "evaluations array is required" },
      { status: 400 }
    );
  }

  // Get all moves for this match
  const moves = matchQueries.getMatchMoves(matchId);

  if (evaluations.length !== moves.length) {
    return NextResponse.json(
      {
        error: `evaluations length (${evaluations.length}) doesn't match moves count (${moves.length})`,
      },
      { status: 400 }
    );
  }

  // Update each move's engine eval and compute average accuracy per color
  let whiteAccSum = 0;
  let whiteMoveCount = 0;
  let blackAccSum = 0;
  let blackMoveCount = 0;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const evaluation = evaluations[i];

    matchQueries.updateMoveEval(move.id, evaluation.eval);

    const acc = evaluation.accuracy;
    if (acc !== undefined && acc !== null) {
      if (move.color === "white") {
        whiteAccSum += acc;
        whiteMoveCount++;
      } else {
        blackAccSum += acc;
        blackMoveCount++;
      }
    }
  }

  // Store accuracy (0-100) in the existing avg_cpl columns
  const whiteAccuracy =
    whiteMoveCount > 0 ? Math.round((whiteAccSum / whiteMoveCount) * 10) / 10 : 0;
  const blackAccuracy =
    blackMoveCount > 0 ? Math.round((blackAccSum / blackMoveCount) * 10) / 10 : 0;

  matchQueries.updateMatchAnalysis(matchId, whiteAccuracy, blackAccuracy);

  return NextResponse.json({
    success: true,
    whiteAccuracy,
    blackAccuracy,
  });
}
