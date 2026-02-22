/**
 * Browser-side Stockfish WASM analyzer.
 * Uses a Web Worker to run Stockfish in a separate thread.
 */

export interface PositionEval {
  eval: number;
  bestMove: string;
  depth: number;
}

export interface MoveAnalysis {
  eval: number;
  cpl: number;
}

export class StockfishAnalyzer {
  private worker: Worker | null = null;
  private ready = false;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker("/stockfish/stockfish.js");
      } catch (e) {
        reject(new Error(`Failed to load Stockfish worker: ${e}`));
        return;
      }

      let receivedUciOk = false;

      this.worker.onmessage = (e: MessageEvent) => {
        const line = e.data as string;
        if (line === "uciok") {
          receivedUciOk = true;
          this.worker!.postMessage("isready");
        }
        if (line === "readyok" && receivedUciOk) {
          this.ready = true;
          resolve();
        }
      };

      this.worker.onerror = (e) => {
        reject(new Error(`Stockfish worker error: ${e.message}`));
      };

      this.worker.postMessage("uci");

      setTimeout(() => {
        if (!this.ready) {
          reject(new Error("Stockfish initialization timed out"));
        }
      }, 10000);
    });
  }

  async evaluatePosition(fen: string, depth = 18): Promise<PositionEval> {
    if (!this.worker || !this.ready) {
      throw new Error("Stockfish not initialized");
    }

    return new Promise((resolve) => {
      let lastEval = 0;
      let lastDepth = 0;
      let bestMove = "";

      const handler = (e: MessageEvent) => {
        const line = e.data as string;

        if (line.includes("score cp")) {
          const cpMatch = line.match(/score cp (-?\d+)/);
          const depthMatch = line.match(/depth (\d+)/);
          if (cpMatch) lastEval = parseInt(cpMatch[1]);
          if (depthMatch) lastDepth = parseInt(depthMatch[1]);
        }

        if (line.includes("score mate")) {
          const mateMatch = line.match(/score mate (-?\d+)/);
          if (mateMatch) {
            const mateIn = parseInt(mateMatch[1]);
            lastEval = mateIn > 0 ? 99999 : -99999;
          }
        }

        if (line.startsWith("bestmove")) {
          bestMove = line.split(" ")[1] || "";
          this.worker!.removeEventListener("message", handler);
          resolve({ eval: lastEval, bestMove, depth: lastDepth });
        }
      };

      this.worker!.addEventListener("message", handler);
      this.worker!.postMessage("ucinewgame");
      this.worker!.postMessage(`position fen ${fen}`);
      this.worker!.postMessage(`go depth ${depth}`);
    });
  }

  async analyzeGame(
    moves: Array<{ fenAfter: string; color: "white" | "black" }>,
    onProgress?: (current: number, total: number) => void,
    depth = 16,
  ): Promise<MoveAnalysis[]> {
    const startingFen =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const startEval = await this.evaluatePosition(startingFen, depth);

    const results: MoveAnalysis[] = [];
    let prevEval = startEval.eval;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const posEval = await this.evaluatePosition(move.fenAfter, depth);

      let cpl: number;
      if (move.color === "white") {
        cpl = Math.max(0, prevEval - posEval.eval);
      } else {
        cpl = Math.max(0, posEval.eval - prevEval);
      }

      results.push({ eval: posEval.eval, cpl });
      prevEval = posEval.eval;

      onProgress?.(i + 1, moves.length);
    }

    return results;
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
    }
  }
}
