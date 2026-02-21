import { NextResponse } from "next/server";
import * as matchQueries from "@/lib/db/queries/matches";

export const dynamic = "force-dynamic";

export async function GET() {
  const matches = matchQueries.getRecentMatches(50);
  return NextResponse.json(matches);
}
