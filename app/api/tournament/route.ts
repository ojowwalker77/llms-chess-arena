import { NextResponse } from "next/server";
import * as tournamentQueries from "@/lib/db/queries/tournaments";
import * as modelQueries from "@/lib/db/queries/models";

export const dynamic = "force-dynamic";

export async function GET() {
  const tournaments = tournamentQueries.getAllTournaments();
  return NextResponse.json(tournaments);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, modelIds } = body;

  if (!name || !modelIds || !Array.isArray(modelIds) || modelIds.length < 2) {
    return NextResponse.json(
      { error: "name and modelIds (array of >= 2 IDs) are required" },
      { status: 400 }
    );
  }

  const existingModels = modelQueries.getModelsByIds(modelIds);
  if (existingModels.length !== modelIds.length) {
    return NextResponse.json(
      { error: "One or more model IDs not found" },
      { status: 400 }
    );
  }

  const tournament = tournamentQueries.createTournament({ name, modelIds });

  return NextResponse.json(tournament, { status: 201 });
}
