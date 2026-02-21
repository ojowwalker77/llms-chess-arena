import { NextResponse } from "next/server";
import { startMatch } from "@/lib/orchestrator/start-match";

export async function POST(request: Request) {
  const body = await request.json();
  const { whiteModelId, blackModelId, tournamentId } = body;

  if (!whiteModelId || !blackModelId) {
    return NextResponse.json(
      { error: "whiteModelId and blackModelId are required" },
      { status: 400 }
    );
  }

  const result = startMatch({
    whiteModelId,
    blackModelId,
    ...(tournamentId ? { tournamentId } : {}),
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(
    { id: result.matchId, status: "running" },
    { status: 201 }
  );
}
