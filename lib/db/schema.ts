import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const models = sqliteTable("models", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  openrouterId: text("openrouter_id").notNull().unique(),
  eloRating: real("elo_rating").notNull().default(1500),
  gamesPlayed: integer("games_played").notNull().default(0),
  wins: integer().notNull().default(0),
  draws: integer().notNull().default(0),
  losses: integer().notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const tournaments = sqliteTable("tournaments", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  status: text()
    .$type<"pending" | "running" | "completed" | "failed" | "paused">()
    .notNull()
    .default("pending"),
  modelIds: text("model_ids").notNull(), // JSON array of model IDs
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
});

export const matches = sqliteTable("matches", {
  id: integer().primaryKey({ autoIncrement: true }),
  tournamentId: integer("tournament_id").references(() => tournaments.id),
  whiteModelId: integer("white_model_id")
    .notNull()
    .references(() => models.id),
  blackModelId: integer("black_model_id")
    .notNull()
    .references(() => models.id),
  result: text().$type<"white" | "black" | "draw" | null>(),
  resultReason: text("result_reason"), // checkmate, stalemate, timeout, invalid_move, resignation, 50move, repetition, insufficient, max_moves
  pgn: text(),
  whiteAvgCpl: real("white_avg_cpl"),
  blackAvgCpl: real("black_avg_cpl"),
  status: text()
    .$type<"pending" | "running" | "completed" | "failed">()
    .notNull()
    .default("pending"),
  totalMoves: integer("total_moves").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
  starred: integer().notNull().default(0),
});

export const moves = sqliteTable("moves", {
  id: integer().primaryKey({ autoIncrement: true }),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id),
  moveNumber: integer("move_number").notNull(), // 1-based full move number
  color: text().$type<"white" | "black">().notNull(),
  san: text().notNull(), // e.g. "e4", "Nf3", "O-O"
  uci: text().notNull(), // e.g. "e2e4" -- needed for Stockfish
  fenAfter: text("fen_after").notNull(),
  thinking: text(), // LLM's text response alongside the move
  engineEval: real("engine_eval"), // centipawn eval, set after analysis
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Type exports for use across the app
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type Tournament = typeof tournaments.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Move = typeof moves.$inferSelect;
