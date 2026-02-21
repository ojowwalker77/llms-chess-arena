export interface BoardState {
  fen: string;
  turn: "white" | "black";
  moveHistory: string[];
  legalMoves: string[];
  isCheck: boolean;
  isGameOver: boolean;
  moveNumber: number;
}

export interface MoveResult {
  success: boolean;
  error?: string;
  uci?: string;
}

export interface GameResult {
  isOver: boolean;
  result?: "white" | "black" | "draw";
  reason?: string;
}
