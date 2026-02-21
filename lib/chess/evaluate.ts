import { join } from "path";
import { spawn } from "child_process";

/**
 * Get the stockfish WASM JS path at runtime (not build time).
 * Constructed dynamically to prevent Turbopack from tracing it.
 */
function getStockfishPath(): string {
  const parts = ["node_modules", "stockfish", "bin", "stockfish-18-single.js"];
  return join(process.cwd(), ...parts);
}

/**
 * Evaluate a chess position server-side using the Stockfish WASM engine.
 * Returns centipawns from white's perspective.
 * Falls back to material count if Stockfish fails.
 */
export async function evaluatePosition(
  fen: string,
  depth = 12
): Promise<number> {
  try {
    return await evaluateWithStockfish(fen, depth);
  } catch (error) {
    console.warn(
      `Stockfish evaluation failed, falling back to material count:`,
      error instanceof Error ? error.message : error
    );
    return evaluateMaterial(fen);
  }
}

async function evaluateWithStockfish(
  fen: string,
  depth: number
): Promise<number> {
  const sfPath = getStockfishPath();

  return new Promise<number>((resolve, reject) => {
    const proc = spawn("node", [sfPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("Stockfish evaluation timed out"));
    }, 10000);

    let gotUciOk = false;
    let lastCp = 0;
    let buffer = "";

    proc.stdout.on("data", (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop()!; // keep incomplete line in buffer

      for (const line of lines) {
        if (line === "uciok") {
          gotUciOk = true;
          proc.stdin.write(`position fen ${fen}\n`);
          proc.stdin.write(`go depth ${depth}\n`);
        }

        if (gotUciOk) {
          if (line.includes("score cp")) {
            const m = line.match(/score cp (-?\d+)/);
            if (m) lastCp = parseInt(m[1]);
          }
          if (line.includes("score mate")) {
            const m = line.match(/score mate (-?\d+)/);
            if (m) lastCp = parseInt(m[1]) > 0 ? 99999 : -99999;
          }
          if (line.startsWith("bestmove")) {
            clearTimeout(timeout);
            proc.stdin.write("quit\n");
            proc.kill();

            // Stockfish returns eval from side-to-move's perspective.
            // Normalize to white's perspective.
            const sideToMove = fen.split(" ")[1];
            const normalizedCp = sideToMove === "b" ? -lastCp : lastCp;
            resolve(normalizedCp);
          }
        }
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.stdin.write("uci\n");
  });
}

/**
 * Simple material-count evaluation as fallback.
 * Returns centipawns from white's perspective.
 */
function evaluateMaterial(fen: string): number {
  const placement = fen.split(" ")[0];
  const values: Record<string, number> = {
    P: 100,
    N: 300,
    B: 300,
    R: 500,
    Q: 900,
    p: -100,
    n: -300,
    b: -300,
    r: -500,
    q: -900,
  };

  let score = 0;
  for (const ch of placement) {
    if (values[ch] !== undefined) {
      score += values[ch];
    }
  }
  return score;
}
