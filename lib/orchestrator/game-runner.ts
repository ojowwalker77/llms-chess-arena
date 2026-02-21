import { ChessGame } from "../chess/engine";
import { evaluatePosition } from "../chess/evaluate";
import {
  isCliModel,
  getCliMove,
  getOpenRouterMove,
  type CliMoveResult,
} from "./cli-caller";
import * as matchQueries from "../db/queries/matches";
import type { GameConfig, GameOutcome } from "./types";

interface TurnResult {
  success: boolean;
  reason: string;
  san?: string;
  uci?: string;
  thinking?: string;
}

/**
 * Run a single chess game between two LLMs.
 * All models use the single-prompt approach:
 * - CLI models (anthropic, openai, google, opencode) → native CLI
 * - Others (deepseek, x-ai, moonshotai) → OpenRouter API
 */
export async function runGame(config: GameConfig): Promise<GameOutcome> {
  const game = new ChessGame();

  const maxHalfMoves = (config.maxMoves || 150) * 2;
  const maxRetries = config.maxRetries || 3;
  const turnTimeoutMs = config.turnTimeoutMs || 120000;

  matchQueries.updateMatchStatus(config.matchId, "running");

  let halfMoveCount = 0;

  while (!game.getGameResult().isOver && halfMoveCount < maxHalfMoves) {
    const boardState = game.getBoardState();
    const color = boardState.turn;
    const currentModel = color === "white" ? config.whiteModel : config.blackModel;
    const opponentModel = color === "white" ? config.blackModel : config.whiteModel;

    const turnResult = await executeTurn(
      currentModel,
      opponentModel,
      game,
      color,
      maxRetries,
      turnTimeoutMs
    );

    if (!turnResult.success) {
      // Evaluate position to determine winner fairly
      const evalCp = await evaluatePosition(game.fen());
      let result: "white" | "black" | "draw";
      if (evalCp > 0) result = "white";
      else if (evalCp < 0) result = "black";
      else result = "draw";

      console.log(
        `[Match ${config.matchId}] Forfeit by ${color} (${turnResult.reason}). Eval: ${evalCp}cp → ${result} wins`
      );

      finishGame(config.matchId, result, turnResult.reason, game, halfMoveCount);
      return { result, reason: turnResult.reason, totalHalfMoves: halfMoveCount };
    }

    // Persist the move
    const moveNumber = Math.ceil((halfMoveCount + 1) / 2);
    matchQueries.insertMove({
      matchId: config.matchId,
      moveNumber,
      color,
      san: turnResult.san!,
      uci: turnResult.uci!,
      fenAfter: game.fen(),
      thinking: turnResult.thinking,
    });

    halfMoveCount++;

    if (halfMoveCount % 10 === 0) {
      console.log(
        `[Match ${config.matchId}] ${halfMoveCount} half-moves played. FEN: ${game.fen()}`
      );
    }
  }

  // Game ended naturally or by max moves
  const gameResult = game.getGameResult();
  const result = gameResult.result || "draw";
  const reason = gameResult.isOver ? (gameResult.reason || "unknown") : "max_moves";

  finishGame(config.matchId, result, reason, game, halfMoveCount);
  return { result, reason, totalHalfMoves: halfMoveCount };
}

/**
 * Execute a single turn: get a move via CLI or OpenRouter, validate, apply.
 */
async function executeTurn(
  model: GameConfig["whiteModel"],
  opponent: GameConfig["blackModel"],
  game: ChessGame,
  color: "white" | "black",
  maxRetries: number,
  timeoutMs: number
): Promise<TurnResult> {
  const useCli = isCliModel(model.openrouterId);
  const allThinking: string[] = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let result: CliMoveResult | null;

    try {
      result = useCli
        ? await getCliMove(model.openrouterId, game, color, opponent.name, { timeoutMs })
        : await getOpenRouterMove(model.openrouterId, game, color, opponent.name, { timeoutMs });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { success: false, reason: "timeout" };
      }
      allThinking.push(
        `[Attempt ${attempt + 1}] Error: ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }

    if (!result) {
      allThinking.push(`[Attempt ${attempt + 1}] No parseable move from output`);
      continue;
    }

    allThinking.push(result.rawOutput);

    const moveResult = game.makeMove(result.move);
    if (moveResult.success) {
      return {
        success: true,
        reason: "ok",
        san: result.move,
        uci: moveResult.uci!,
        thinking: JSON.stringify(allThinking),
      };
    }

    allThinking.push(`[Attempt ${attempt + 1}] Engine rejected move: ${result.move}`);
  }

  return { success: false, reason: "invalid_move" };
}

function finishGame(
  matchId: number,
  result: "white" | "black" | "draw",
  reason: string,
  game: ChessGame,
  halfMoveCount: number
) {
  matchQueries.completeMatch(matchId, result, reason, game.pgn(), halfMoveCount);
}
