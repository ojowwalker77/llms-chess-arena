import { resolve } from "path";

const SF_PATH = resolve(
  process.cwd(),
  "node_modules/stockfish/bin/stockfish-18-single.js"
);

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
  const worker = new Worker(SF_PATH);

  return new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("Stockfish evaluation timed out"));
    }, 10000);

    let gotUciOk = false;
    let lastCp = 0;

    worker.onmessage = (e: MessageEvent) => {
      const line = String(e.data);

      if (line === "uciok") {
        gotUciOk = true;
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depth}`);
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
          worker.terminate();

          // Stockfish returns eval from side-to-move's perspective.
          // Normalize to white's perspective.
          const sideToMove = fen.split(" ")[1];
          const normalizedCp = sideToMove === "b" ? -lastCp : lastCp;
          resolve(normalizedCp);
        }
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(err);
    };

    worker.postMessage("uci");
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
