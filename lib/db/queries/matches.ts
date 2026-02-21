import { eq, desc, sql } from "drizzle-orm";
import { db } from "../index";
import { matches, moves, models } from "../schema";

export function createMatch(data: {
  tournamentId?: number;
  whiteModelId: number;
  blackModelId: number;
}) {
  return db.insert(matches).values(data).returning().get();
}

export function getMatchById(id: number) {
  return db.select().from(matches).where(eq(matches.id, id)).get();
}

export function getMatchWithModels(id: number) {
  const match = db.select().from(matches).where(eq(matches.id, id)).get();
  if (!match) return null;

  const whiteModel = db
    .select()
    .from(models)
    .where(eq(models.id, match.whiteModelId))
    .get();
  const blackModel = db
    .select()
    .from(models)
    .where(eq(models.id, match.blackModelId))
    .get();

  return { ...match, whiteModel, blackModel };
}

export function getMatchMoves(matchId: number) {
  return db
    .select()
    .from(moves)
    .where(eq(moves.matchId, matchId))
    .orderBy(moves.id)
    .all();
}

export function getRecentMatches(limit = 20) {
  return db.select().from(matches).orderBy(desc(matches.id)).limit(limit).all();
}

export function getMatchesByTournament(tournamentId: number) {
  return db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId))
    .orderBy(matches.id)
    .all();
}

export function insertMove(data: {
  matchId: number;
  moveNumber: number;
  color: "white" | "black";
  san: string;
  uci: string;
  fenAfter: string;
  thinking?: string;
}) {
  return db.insert(moves).values(data).returning().get();
}

export function updateMatchStatus(
  matchId: number,
  status: "pending" | "running" | "completed" | "failed"
) {
  return db
    .update(matches)
    .set({ status })
    .where(eq(matches.id, matchId))
    .run();
}

export function completeMatch(
  matchId: number,
  result: "white" | "black" | "draw",
  reason: string,
  pgn: string,
  totalMoves: number
) {
  return db
    .update(matches)
    .set({
      result,
      resultReason: reason,
      pgn,
      totalMoves,
      status: "completed" as const,
      completedAt: new Date().toISOString(),
    })
    .where(eq(matches.id, matchId))
    .run();
}


export function updateMatchAnalysis(
  matchId: number,
  whiteAvgCpl: number,
  blackAvgCpl: number
) {
  return db
    .update(matches)
    .set({ whiteAvgCpl, blackAvgCpl })
    .where(eq(matches.id, matchId))
    .run();
}

export function updateMoveEval(moveId: number, engineEval: number) {
  return db
    .update(moves)
    .set({ engineEval })
    .where(eq(moves.id, moveId))
    .run();
}

export function getRunningMatch() {
  return db
    .select()
    .from(matches)
    .where(eq(matches.status, "running" as const))
    .limit(1)
    .get();
}

export function getMatchByTournamentPairing(
  tournamentId: number,
  whiteModelId: number,
  blackModelId: number
) {
  return db
    .select()
    .from(matches)
    .where(
      sql`${matches.tournamentId} = ${tournamentId} AND ${matches.whiteModelId} = ${whiteModelId} AND ${matches.blackModelId} = ${blackModelId}`
    )
    .get();
}

export function deleteMatchAndMoves(matchId: number) {
  db.delete(moves).where(eq(moves.matchId, matchId)).run();
  db.delete(matches).where(eq(matches.id, matchId)).run();
}
