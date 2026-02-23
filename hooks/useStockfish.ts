"use client";

import { useRef, useCallback, useEffect, useState } from "react";

interface EvalResult {
  cp: number; // centipawns from white's perspective
  bestMove: string;
}

/**
 * Hook that manages a Stockfish WASM worker for position evaluation.
 * Evaluates positions on demand, returns eval in centipawns.
 */
export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<Array<{
    fen: string;
    resolve: (val: EvalResult) => void;
  }>>([]);
  const busyRef = useRef(false);
  const [ready, setReady] = useState(false);

  // Initialize Stockfish worker
  useEffect(() => {
    try {
      const worker = new Worker("/stockfish/stockfish.js");
      workerRef.current = worker;

      let gotUciOk = false;

      worker.onmessage = (e: MessageEvent) => {
        const line = e.data as string;
        if (line === "uciok") {
          gotUciOk = true;
          worker.postMessage("isready");
        }
        if (line === "readyok" && gotUciOk) {
          readyRef.current = true;
          setReady(true);
          processQueue();
        }
      };

      worker.postMessage("uci");
    } catch {
      // Stockfish failed to load — silently degrade
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      readyRef.current = false;
    };
  }, []);

  function processQueue() {
    if (busyRef.current || !readyRef.current || !workerRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;

    busyRef.current = true;
    const worker = workerRef.current;

    let lastCp = 0;
    let bestMove = "";

    const handler = (e: MessageEvent) => {
      const line = e.data as string;

      if (line.includes("score cp")) {
        const m = line.match(/score cp (-?\d+)/);
        if (m) lastCp = parseInt(m[1]);
      }
      if (line.includes("score mate")) {
        const m = line.match(/score mate (-?\d+)/);
        if (m) lastCp = parseInt(m[1]) > 0 ? 99999 : -99999;
      }
      if (line.startsWith("bestmove")) {
        bestMove = line.split(" ")[1] || "";
        worker.removeEventListener("message", handler);
        busyRef.current = false;
        // Stockfish returns eval from side-to-move's perspective.
        // Normalize to always be from white's perspective.
        const sideToMove = next.fen.split(" ")[1];
        const normalizedCp = sideToMove === "b" ? -lastCp : lastCp;
        next.resolve({ cp: normalizedCp, bestMove });
        processQueue(); // process next in queue
      }
    };

    worker.addEventListener("message", handler);
    worker.postMessage("ucinewgame");
    worker.postMessage(`position fen ${next.fen}`);
    worker.postMessage("go depth 20");
  }

  const evaluate = useCallback(
    (fen: string): Promise<EvalResult> => {
      return new Promise((resolve) => {
        queueRef.current.push({ fen, resolve });
        processQueue();
      });
    },
    []
  );

  return { evaluate, ready };
}
