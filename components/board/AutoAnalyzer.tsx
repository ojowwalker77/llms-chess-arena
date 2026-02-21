"use client";

import { useEffect, useRef, useState } from "react";
import { useStockfish } from "@/hooks/useStockfish";

interface MoveData {
  id: number;
  fenAfter: string;
  color: "white" | "black";
  engineEval: number | null;
}

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Lichess win% conversion: centipawns → win probability (0-100)
function winPct(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// Lichess per-move accuracy formula
function calcMoveAccuracy(wpBefore: number, wpAfter: number): number {
  const winDiff = wpBefore - wpAfter;
  const raw = 103.1668 * Math.exp(-0.04354 * winDiff) - 3.1669 + 1;
  return Math.min(100, Math.max(0, raw));
}

/**
 * Invisible component that auto-analyzes a completed match.
 * Runs Stockfish on each position, then POSTs results to the server.
 */
export function AutoAnalyzer({
  matchId,
  moves,
  onComplete,
  onProgress,
}: {
  matchId: number;
  moves: MoveData[];
  onComplete?: () => void;
  onProgress?: (current: number, total: number) => void;
}) {
  const { evaluate, ready } = useStockfish();
  const startedRef = useRef(false);
  const [status, setStatus] = useState<"waiting" | "analyzing" | "done">("waiting");

  // Skip if already analyzed (all moves have engineEval)
  const alreadyAnalyzed = moves.length > 0 && moves.every((m) => m.engineEval !== null);

  useEffect(() => {
    if (!ready || startedRef.current || alreadyAnalyzed || moves.length === 0) return;
    startedRef.current = true;

    (async () => {
      setStatus("analyzing");

      // Evaluate starting position first
      const startEval = await evaluate(STARTING_FEN);
      let prevCp = startEval.cp;

      const evaluations: Array<{ eval: number; accuracy: number }> = [];

      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        const result = await evaluate(move.fenAfter);

        // Lichess-style accuracy: convert to win% then measure loss
        const wpBefore = move.color === "white" ? winPct(prevCp) : 100 - winPct(prevCp);
        const wpAfter = move.color === "white" ? winPct(result.cp) : 100 - winPct(result.cp);
        const accuracy = calcMoveAccuracy(wpBefore, wpAfter);

        evaluations.push({ eval: result.cp, accuracy });
        prevCp = result.cp;

        onProgress?.(i + 1, moves.length);
      }

      // POST to server
      try {
        await fetch(`/api/matches/${matchId}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evaluations }),
        });
      } catch {
        // Failed to save — evals still visible locally this session
      }

      setStatus("done");
      onComplete?.();
    })();
  }, [ready, alreadyAnalyzed, moves, matchId, evaluate, onComplete, onProgress]);

  if (alreadyAnalyzed || status === "done") return null;

  if (status === "analyzing") {
    return (
      <div className="text-xs text-zinc-500 flex items-center gap-2">
        <span className="animate-pulse">Analyzing with Stockfish...</span>
      </div>
    );
  }

  return null;
}
