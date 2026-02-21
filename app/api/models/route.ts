import { NextResponse } from "next/server";
import * as modelQueries from "@/lib/db/queries/models";

export async function GET() {
  const models = modelQueries.getAllModels();
  return NextResponse.json(models);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, openrouterId } = body;

  if (!name || !openrouterId) {
    return NextResponse.json(
      { error: "name and openrouterId are required" },
      { status: 400 }
    );
  }

  try {
    const model = modelQueries.createModel({ name, openrouterId });
    return NextResponse.json(model, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create model";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
