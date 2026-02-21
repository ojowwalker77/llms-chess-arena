import type { ChessGame } from "../chess/engine";
import { callOpenRouter } from "./openrouter";

export interface CliMoveResult {
  move: string;
  rawOutput: string;
}

/**
 * Determine if a model should use its native CLI instead of OpenRouter.
 */
export function isCliModel(openrouterId: string): boolean {
  return (
    openrouterId.startsWith("anthropic/") ||
    openrouterId.startsWith("openai/") ||
    openrouterId.startsWith("google/") ||
    openrouterId.startsWith("opencode/")
  );
}

/**
 * Map an openrouterId to the CLI command and args.
 *
 * Routing:
 *   anthropic/*  → claude -p
 *   openai/*     → codex exec
 *   google/*     → gemini -p
 *   opencode/*   → opencode run
 */
function getCliCommand(openrouterId: string): { command: string; args: string[] } {
  if (openrouterId.startsWith("anthropic/")) {
    const modelPart = openrouterId.replace("anthropic/", "");
    const cliModel = modelPart.replace(/\./g, "-");
    return {
      command: "claude",
      args: ["-p", "--model", cliModel, "--tools", "", "--no-session-persistence"],
    };
  }

  if (openrouterId.startsWith("openai/")) {
    const modelPart = openrouterId.replace("openai/", "");
    return {
      command: "codex",
      args: ["exec", "-m", modelPart, "--skip-git-repo-check", "--ephemeral", "-"],
    };
  }

  if (openrouterId.startsWith("google/")) {
    const modelPart = openrouterId.replace("google/", "");
    return {
      command: "gemini",
      args: ["-p", "", "-m", modelPart, "-o", "text"],
    };
  }

  if (openrouterId.startsWith("opencode/")) {
    // opencode run -m <provider/model> expects the full "opencode/model-name" ID
    return {
      command: "opencode",
      args: ["run", "-m", openrouterId, "--format", "default"],
    };
  }

  throw new Error(`Not a CLI model: ${openrouterId}`);
}

/**
 * Spawn a CLI process, pipe prompt to stdin, capture stdout.
 */
async function spawnCli(
  openrouterId: string,
  prompt: string,
  timeoutMs: number
): Promise<string> {
  const { command, args } = getCliCommand(openrouterId);

  const proc = Bun.spawn([command, ...args], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      // Prevent nested-session errors when running inside Claude Code
      CLAUDECODE: undefined,
    },
  });

  // Write prompt to stdin and close
  proc.stdin.write(prompt);
  proc.stdin.end();

  // Race between completion and timeout
  const outputPromise = (async () => {
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`CLI exited with code ${exitCode}: ${stderr.slice(0, 500)}`);
    }
    return output;
  })();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      proc.kill();
      const err = new Error("CLI process timed out");
      err.name = "AbortError";
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([outputPromise, timeoutPromise]);
}

/**
 * Parse a chess move (SAN) from free-text model output.
 *
 * Strategies (in priority order):
 * 1. Explicit "MOVE: <san>" marker
 * 2. Last non-empty line is a legal move
 * 3. **bold** or `backtick` formatted move
 * 4. Word-scan against legal moves (longest first)
 */
export function parseMoveFromText(
  text: string,
  legalMoves: string[]
): string | null {
  if (!text || legalMoves.length === 0) return null;

  const legalSet = new Set(legalMoves);
  const sortedMoves = [...legalMoves].sort((a, b) => b.length - a.length);

  // Strategy 1: MOVE: marker
  const moveMarker = text.match(/^MOVE:\s*(.+)$/m);
  if (moveMarker) {
    const candidate = moveMarker[1].trim();
    if (legalSet.has(candidate)) return candidate;
  }

  // Strategy 2: last non-empty line
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    if (legalSet.has(lastLine)) return lastLine;
  }

  // Strategy 3: **bold** or `backtick`
  const boldMatch = text.match(/\*\*([A-Za-z0-9+#=x\-]+)\*\*/);
  if (boldMatch && legalSet.has(boldMatch[1])) return boldMatch[1];

  const backtickMatch = text.match(/`([A-Za-z0-9+#=x\-]+)`/);
  if (backtickMatch && legalSet.has(backtickMatch[1])) return backtickMatch[1];

  // Strategy 4: scan for any legal move as a word boundary match
  for (const move of sortedMoves) {
    const escaped = move.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|[\\s(])${escaped}(?:[\\s).,;!?]|$)`, "m");
    if (regex.test(text)) return move;
  }

  return null;
}

/**
 * Build the single-shot chess prompt for a CLI model.
 */
function buildCliPrompt(params: {
  color: "white" | "black";
  opponentName: string;
  fen: string;
  moveNumber: number;
  isCheck: boolean;
  legalMoves: string[];
  moveHistory: string[];
}): string {
  const { color, opponentName, fen, moveNumber, isCheck, legalMoves, moveHistory } =
    params;

  const historyStr =
    moveHistory.length > 0 ? formatMoveHistory(moveHistory) : "(game start)";

  const checkWarning = isCheck
    ? "\n*** YOUR KING IS IN CHECK. You must resolve the check. ***\n"
    : "";

  return `You are playing chess as ${color} against ${opponentName}. It is move ${moveNumber}.
${checkWarning}
CURRENT POSITION (FEN): ${fen}

MOVE HISTORY: ${historyStr}

LEGAL MOVES: ${legalMoves.join(", ")}

Your goal is to win. Think about piece development, king safety, pawn structure, and tactical opportunities. You have 2 minutes to respond.

After your analysis, output your chosen move on its own line in EXACTLY this format:
MOVE: <your move>

The move MUST be exactly one of the legal moves listed above, in Standard Algebraic Notation (SAN).`;
}

function formatMoveHistory(moves: string[]): string {
  const pairs: string[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const num = Math.floor(i / 2) + 1;
    const white = moves[i];
    const black = moves[i + 1];
    pairs.push(black ? `${num}. ${white} ${black}` : `${num}. ${white}`);
  }
  return pairs.join(" ");
}

/**
 * Build the chess prompt for the current turn.
 */
export function buildChessPrompt(
  game: ChessGame,
  color: "white" | "black",
  opponentName: string
): string {
  const boardState = game.getBoardState();
  return buildCliPrompt({
    color,
    opponentName,
    fen: game.fen(),
    moveNumber: boardState.moveNumber,
    isCheck: boardState.isCheck,
    legalMoves: game.getLegalMoves(),
    moveHistory: game.history(),
  });
}

/**
 * Get a chess move via native CLI (claude, codex, gemini, opencode).
 */
export async function getCliMove(
  openrouterId: string,
  game: ChessGame,
  color: "white" | "black",
  opponentName: string,
  options: { timeoutMs: number }
): Promise<CliMoveResult | null> {
  const prompt = buildChessPrompt(game, color, opponentName);
  const rawOutput = await spawnCli(openrouterId, prompt, options.timeoutMs);
  const move = parseMoveFromText(rawOutput, game.getLegalMoves());

  if (!move) return null;
  return { move, rawOutput };
}

/**
 * Get a chess move via OpenRouter API (single prompt, no tool calling).
 */
export async function getOpenRouterMove(
  openrouterId: string,
  game: ChessGame,
  color: "white" | "black",
  opponentName: string,
  options: { timeoutMs: number }
): Promise<CliMoveResult | null> {
  const prompt = buildChessPrompt(game, color, opponentName);
  const rawOutput = await callOpenRouter(openrouterId, prompt, {
    timeout: options.timeoutMs,
  });
  const move = parseMoveFromText(rawOutput, game.getLegalMoves());

  if (!move) return null;
  return { move, rawOutput };
}
