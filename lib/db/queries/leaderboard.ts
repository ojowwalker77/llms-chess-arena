import { desc, sql } from "drizzle-orm";
import { db } from "../index";
import { models, matches, moves } from "../schema";
import { estimateElo } from "@/lib/chess/analysis";

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
  totalMovesPlayed: number;
  avgPrecision: number | null;
  avgAcpl: number | null;
  estimatedElo: number | null;
}

export function getLeaderboard(): LeaderboardEntry[] {
  const allModels = db
    .select()
    .from(models)
    .orderBy(desc(models.eloRating))
    .all();

  return allModels.map((model) => {
    // Calculate average precision across all analyzed matches for this model
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

    const allPrecisions = [
      ...whiteCpls.map((r) => r.cpl!),
      ...blackCpls.map((r) => r.cpl!),
    ];

    const avgPrecision =
      allPrecisions.length > 0
        ? allPrecisions.reduce((sum, v) => sum + v, 0) / allPrecisions.length
        : null;

    // Compute actual ACPL from raw per-move engine evals
    // This queries all moves where this model played, across all analyzed matches
    const acplResult = db
      .select({
        avgCpl: sql<number | null>`AVG(cpl)`,
      })
      .from(
        sql`(
          SELECT
            m2.engine_eval - LAG(m2.engine_eval, 1, 0) OVER (PARTITION BY m2.match_id ORDER BY m2.id) AS raw_diff,
            m2.color,
            CASE
              WHEN m2.color = 'white' THEN MAX(0, LAG(m2.engine_eval, 1, 0) OVER (PARTITION BY m2.match_id ORDER BY m2.id) - m2.engine_eval)
              ELSE MAX(0, m2.engine_eval - LAG(m2.engine_eval, 1, 0) OVER (PARTITION BY m2.match_id ORDER BY m2.id))
            END AS cpl
          FROM moves m2
          JOIN matches ma ON ma.id = m2.match_id
          WHERE m2.engine_eval IS NOT NULL
            AND ma.status = 'completed'
            AND (
              (m2.color = 'white' AND ma.white_model_id = ${model.id})
              OR (m2.color = 'black' AND ma.black_model_id = ${model.id})
            )
        )`
      )
      .get();

    const avgAcpl = acplResult?.avgCpl ?? null;

    // Total half-moves played across all completed matches
    const movesResult = db
      .select({ total: sql<number>`COALESCE(SUM(${matches.totalMoves}), 0)` })
      .from(matches)
      .where(
        sql`(${matches.whiteModelId} = ${model.id} OR ${matches.blackModelId} = ${model.id}) AND ${matches.status} = 'completed'`
      )
      .get();

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
      totalMovesPlayed: movesResult?.total ?? 0,
      avgPrecision,
      avgAcpl,
      estimatedElo: avgAcpl !== null ? estimateElo(avgAcpl) : null,
    };
  });
}
