import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = parseInt(id, 10);

  const match = db.select().from(matches).where(eq(matches.id, matchId)).get();
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const newStarred = match.starred ? 0 : 1;
  db.update(matches).set({ starred: newStarred }).where(eq(matches.id, matchId)).run();

  return NextResponse.json({ starred: !!newStarred });
}
