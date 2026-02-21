import { Chess } from "chess.js";
import type { BoardState, MoveResult, GameResult } from "./types";

export class ChessGame {
  private game: Chess;

  constructor(fen?: string) {
    this.game = fen ? new Chess(fen) : new Chess();
  }

  getBoardState(): BoardState {
    return {
      fen: this.game.fen(),
      turn: this.game.turn() === "w" ? "white" : "black",
      moveHistory: this.game.history(),
      legalMoves: this.game.moves(),
      isCheck: this.game.isCheck(),
      isGameOver: this.game.isGameOver(),
      moveNumber: Math.ceil(this.game.moveNumber()),
    };
  }

  getLegalMoves(): string[] {
    return this.game.moves();
  }

  makeMove(san: string): MoveResult {
    try {
      const move = this.game.move(san);
      if (!move) {
        return { success: false, error: `Invalid move: ${san}` };
      }
      return {
        success: true,
        uci: move.from + move.to + (move.promotion || ""),
      };
    } catch {
      return { success: false, error: `Invalid move: ${san}` };
    }
  }

  getGameResult(): GameResult {
    if (!this.game.isGameOver()) {
      return { isOver: false };
    }

    if (this.game.isCheckmate()) {
      // The side whose turn it is has been checkmated (they lost)
      const winner = this.game.turn() === "w" ? "black" : "white";
      return { isOver: true, result: winner, reason: "checkmate" };
    }

    // All other endings are draws
    let reason = "draw";
    if (this.game.isStalemate()) reason = "stalemate";
    else if (this.game.isThreefoldRepetition()) reason = "repetition";
    else if (this.game.isInsufficientMaterial()) reason = "insufficient";
    else if (this.game.isDraw()) reason = "50move";

    return { isOver: true, result: "draw", reason };
  }

  pgn(): string {
    return this.game.pgn();
  }

  fen(): string {
    return this.game.fen();
  }

  history(): string[] {
    return this.game.history();
  }

  /** Get verbose history with from/to squares for UCI notation */
  historyVerbose() {
    return this.game.history({ verbose: true });
  }
}
