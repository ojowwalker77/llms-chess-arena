export interface GameConfig {
  matchId: number;
  whiteModel: { id: number; name: string; openrouterId: string };
  blackModel: { id: number; name: string; openrouterId: string };
  maxMoves?: number; // default 150 full moves
  turnTimeoutMs?: number; // default 120000 (2 min)
  maxRetries?: number; // default 3
}

export interface GameOutcome {
  result: "white" | "black" | "draw";
  reason: string;
  totalHalfMoves: number;
}
