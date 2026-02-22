import { getRunningMatch } from "@/lib/db/queries/matches";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const match = getRunningMatch();

  if (!match) {
    return NextResponse.json({
      isLive: false,
      matchId: null,
      tournamentId: null,
    });
  }

  return NextResponse.json({
    isLive: true,
    matchId: match.id,
    tournamentId: match.tournamentId ?? null,
  });
}
