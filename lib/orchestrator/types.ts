export interface GameConfig {
  matchId: number;
  whiteModel: { id: number; name: string; openrouterId: string };
  blackModel: { id: number; name: string; openrouterId: string };
  maxMoves?: number; // default 150 full moves
  turnTimeoutMs?: number; // default 480000 (8 min) for CLI, 300000 (5 min) for OpenRouter
  maxRetries?: number; // default 1 (one retry with invalid move warning)
}

export interface GameOutcome {
  result: "white" | "black" | "draw";
  reason: string;
  totalHalfMoves: number;
}
