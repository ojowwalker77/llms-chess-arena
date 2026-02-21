import { eq } from "drizzle-orm";
import { db } from "../index";
import { models, type NewModel } from "../schema";

export function getAllModels() {
  return db.select().from(models).all();
}

export function getModelById(id: number) {
  return db.select().from(models).where(eq(models.id, id)).get();
}

export function getModelsByIds(ids: number[]) {
  return db
    .select()
    .from(models)
    .all()
    .filter((m) => ids.includes(m.id));
}

export function createModel(data: Pick<NewModel, "name" | "openrouterId">) {
  return db.insert(models).values(data).returning().get();
}

export function updateModelStats(
  id: number,
  stats: {
    eloRating: number;
    gamesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
  }
) {
  return db.update(models).set(stats).where(eq(models.id, id)).run();
}
