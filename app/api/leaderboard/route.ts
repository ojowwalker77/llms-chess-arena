import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/db/queries/leaderboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const leaderboard = getLeaderboard();
  return NextResponse.json(leaderboard);
}
