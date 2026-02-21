import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matches, moves } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  // Find completed matches where whiteAvgCpl is null (not analyzed)
  const unanalyzed = db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "completed"),
        isNull(matches.whiteAvgCpl)
      )
    )
    .all();

  // For each, get its moves
  const results = unanalyzed.map((match) => {
    const matchMoves = db
      .select()
      .from(moves)
      .where(eq(moves.matchId, match.id))
      .orderBy(moves.id)
      .all();

    return { match, moves: matchMoves };
  });

  return NextResponse.json(results);
}
