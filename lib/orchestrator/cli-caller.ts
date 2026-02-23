import { spawn } from "child_process";
import type { ChessGame } from "../chess/engine";
import { callOpenRouter } from "./openrouter";

export interface CliMoveResult {
  move: string;
  rawOutput: string;
}

export function isCliModel(openrouterId: string): boolean {
  return (
    openrouterId.startsWith("anthropic/") ||
    openrouterId.startsWith("openai/") ||
    openrouterId.startsWith("google/") ||
    openrouterId.startsWith("opencode/")
  );
}

/**
 * Routing:
 *   anthropic/*  → claude -p
 *   openai/*     → codex exec
 *   google/*     → gemini -p
 *   opencode/*   → opencode run
 */
function getCliCommand(openrouterId: string): {
  command: string;
  args: string[];
} {
  if (openrouterId.startsWith("anthropic/")) {
    const modelPart = openrouterId.replace("anthropic/", "");
    const cliModel = modelPart.replace(/\./g, "-");
    return {
      command: "claude",
      args: [
        "-p",
        "--model",
        cliModel,
        "--tools",
        "",
        "--no-session-persistence",
      ],
    };
  }

  if (openrouterId.startsWith("openai/")) {
    const modelPart = openrouterId.replace("openai/", "");
    return {
      command: "codex",
      args: [
        "exec",
        "-m",
        modelPart,
        "--skip-git-repo-check",
        "--ephemeral",
        "-",
      ],
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
  timeoutMs: number,
): Promise<string> {
  const { command, args } = getCliCommand(openrouterId);

  return new Promise<string>((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDECODE; // Prevent nested-session errors

    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env,
    });

    let stdout = "";
    let stderr = "";
    let resolved = false;

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();

      // Early exit: if we detect "MOVE: ..." or "RESIGN", kill the process
      // immediately instead of waiting for the CLI to finish
      if (!resolved && /^MOVE:\s*.+$/m.test(stdout)) {
        resolved = true;
        clearTimeout(timeout);
        proc.kill();
        resolve(stdout);
      }
    });
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill();
        const err = new Error("CLI process timed out");
        err.name = "AbortError";
        reject(err);
      }
    }, timeoutMs);

    proc.on("close", (exitCode) => {
      clearTimeout(timeout);
      if (resolved) return; // Already resolved via early detection
      resolved = true;
      if (exitCode !== 0) {
        reject(
          new Error(
            `CLI exited with code ${exitCode}: ${stderr.slice(0, 500)}`,
          ),
        );
      } else {
        resolve(stdout);
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      if (resolved) return;
      resolved = true;
      reject(err);
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
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
  legalMoves: string[],
): string | null {
  if (!text || legalMoves.length === 0) return null;

  // Strategy 0: RESIGN detection
  const resignMarker = text.match(/^MOVE:\s*RESIGN\b/im);
  if (resignMarker) return "RESIGN";
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.some((l) => /^RESIGN$/i.test(l))) return "RESIGN";

  const legalSet = new Set(legalMoves);
  const sortedMoves = [...legalMoves].sort((a, b) => b.length - a.length);

  // Strategy 1: MOVE: marker
  const moveMarker = text.match(/^MOVE:\s*(.+)$/m);
  if (moveMarker) {
    const candidate = moveMarker[1].trim();
    if (legalSet.has(candidate)) return candidate;
  }

  // Strategy 2: last non-empty line
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
  invalidMoveWarning?: string;
}): string {
  const {
    color,
    opponentName,
    fen,
    moveNumber,
    isCheck,
    legalMoves,
    moveHistory,
    invalidMoveWarning,
  } = params;

  const historyStr =
    moveHistory.length > 0 ? formatMoveHistory(moveHistory) : "(game start)";

  const checkWarning = isCheck
    ? "\n*** YOUR KING IS IN CHECK. You must resolve the check. ***\n"
    : "";

  const retryWarning = invalidMoveWarning
    ? `\n*** WARNING: Your previous move "${invalidMoveWarning}" was ILLEGAL. This is your LAST chance. Pick a move ONLY from the legal moves list below or you FORFEIT. ***\n`
    : "";

  return `You are playing chess as ${color} against ${opponentName}. Move ${moveNumber}.
${checkWarning}${retryWarning}
FEN: ${fen}

HISTORY: ${historyStr}

LEGAL MOVES: ${legalMoves.join(", ")}

Pick the strongest move. Be FAST — you have a strict timeout and will LOSE if you exceed it.

Output EXACTLY one line:
MOVE: <san>

The move MUST be one of the legal moves above. Output nothing after the MOVE line. If the position is not winnable the honered thing to do it to resign by responding: MOVE: RESIGN`;
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
  opponentName: string,
  invalidMoveWarning?: string,
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
    invalidMoveWarning,
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
  options: { timeoutMs: number; invalidMoveWarning?: string },
): Promise<CliMoveResult | null> {
  const prompt = buildChessPrompt(game, color, opponentName, options.invalidMoveWarning);
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
  options: { timeoutMs: number; invalidMoveWarning?: string },
): Promise<CliMoveResult | null> {
  const prompt = buildChessPrompt(game, color, opponentName, options.invalidMoveWarning);
  const rawOutput = await callOpenRouter(openrouterId, prompt, {
    timeout: options.timeoutMs,
  });
  const move = parseMoveFromText(rawOutput, game.getLegalMoves());

  if (!move) return null;
  return { move, rawOutput };
}
