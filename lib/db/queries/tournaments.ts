import { eq, desc } from "drizzle-orm";
import { db } from "../index";
import { tournaments } from "../schema";

export function createTournament(data: { name: string; modelIds: number[] }) {
  return db
    .insert(tournaments)
    .values({
      name: data.name,
      modelIds: JSON.stringify(data.modelIds),
    })
    .returning()
    .get();
}

export function getTournamentById(id: number) {
  return db.select().from(tournaments).where(eq(tournaments.id, id)).get();
}

export function getAllTournaments() {
  return db.select().from(tournaments).orderBy(desc(tournaments.id)).all();
}

export function updateTournamentStatus(
  id: number,
  status: "pending" | "running" | "completed" | "failed"
) {
  const updates: Record<string, unknown> = { status };
  if (status === "completed" || status === "failed") {
    updates.completedAt = new Date().toISOString();
  }
  return db.update(tournaments).set(updates).where(eq(tournaments.id, id)).run();
}
