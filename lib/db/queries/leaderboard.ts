import { desc, sql } from "drizzle-orm";
import { db } from "../index";
import { models, matches } from "../schema";

export interface LeaderboardEntry {
  id: number;
  name: string;
  openrouterId: string;
  eloRating: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  winDelta: number;
  avgPrecision: number | null;
}

export function getLeaderboard(): LeaderboardEntry[] {
  const allModels = db
    .select()
    .from(models)
    .orderBy(desc(models.eloRating))
    .all();

  return allModels.map((model) => {
    // Calculate average CPL across all analyzed matches for this model
    const whiteCpls = db
      .select({ cpl: matches.whiteAvgCpl })
      .from(matches)
      .where(
        sql`${matches.whiteModelId} = ${model.id} AND ${matches.whiteAvgCpl} IS NOT NULL`
      )
      .all();

    const blackCpls = db
      .select({ cpl: matches.blackAvgCpl })
      .from(matches)
      .where(
        sql`${matches.blackModelId} = ${model.id} AND ${matches.blackAvgCpl} IS NOT NULL`
      )
      .all();

    const allCpls = [
      ...whiteCpls.map((r) => r.cpl!),
      ...blackCpls.map((r) => r.cpl!),
    ];

    // Values now store accuracy (0-100) directly, not CPL
    const avgPrecision =
      allCpls.length > 0
        ? allCpls.reduce((sum, v) => sum + v, 0) / allCpls.length
        : null;

    return {
      id: model.id,
      name: model.name,
      openrouterId: model.openrouterId,
      eloRating: model.eloRating,
      gamesPlayed: model.gamesPlayed,
      wins: model.wins,
      draws: model.draws,
      losses: model.losses,
      points: model.wins * 3 + model.draws,
      winDelta: model.wins - model.losses,
      avgPrecision,
    };
  });
}
