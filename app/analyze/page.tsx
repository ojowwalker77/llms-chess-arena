"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useStockfish } from "@/hooks/useStockfish";

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

interface MoveData {
  id: number;
  color: "white" | "black";
  fenAfter: string;
  engineEval: number | null;
}

interface MatchData {
  match: { id: number; whiteModelId: number; blackModelId: number };
  moves: MoveData[];
}

export default function AnalyzePage() {
  const { evaluate, ready } = useStockfish();
  const [queue, setQueue] = useState<MatchData[]>([]);
  const [currentMatch, setCurrentMatch] = useState<number | null>(null);
  const [moveProgress, setMoveProgress] = useState("");
  const [completed, setCompleted] = useState<number[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "running" | "done">("loading");
  const startedRef = useRef(false);

  // Fetch unanalyzed matches
  useEffect(() => {
    fetch("/api/matches/unanalyzed")
      .then((r) => r.json())
      .then((data: MatchData[]) => {
        // Filter out matches with 0 moves
        const valid = data.filter((d) => d.moves.length > 0);
        setQueue(valid);
        setStatus(valid.length > 0 ? "ready" : "done");
      });
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    setStatus("running");

    for (const item of queue) {
      setCurrentMatch(item.match.id);
      setMoveProgress(`0/${item.moves.length}`);

      let prevCp = 0; // starting position
      const evaluations: Array<{ eval: number; accuracy: number }> = [];

      // Evaluate starting position
      try {
        const startEval = await evaluate(STARTING_FEN);
        prevCp = startEval.cp;
      } catch {
        prevCp = 0;
      }

      for (let i = 0; i < item.moves.length; i++) {
        const move = item.moves[i];
        const result = await evaluate(move.fenAfter);

        // Lichess-style accuracy: convert to win% then measure loss
        const wpBefore = move.color === "white" ? winPct(prevCp) : 100 - winPct(prevCp);
        const wpAfter = move.color === "white" ? winPct(result.cp) : 100 - winPct(result.cp);
        const accuracy = calcMoveAccuracy(wpBefore, wpAfter);

        evaluations.push({ eval: result.cp, accuracy });
        prevCp = result.cp;
        setMoveProgress(`${i + 1}/${item.moves.length}`);
      }

      // POST results
      try {
        await fetch(`/api/matches/${item.match.id}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evaluations }),
        });
      } catch {
        // continue to next match
      }

      setCompleted((prev) => [...prev, item.match.id]);
    }

    setStatus("done");
    setCurrentMatch(null);
  }, [ready, queue, evaluate]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bulk Stockfish Analysis</h1>

      {status === "loading" && (
        <p className="text-zinc-400">Loading unanalyzed matches...</p>
      )}

      {status === "ready" && (
        <div>
          <p className="text-zinc-300 mb-4">
            {queue.length} match{queue.length !== 1 ? "es" : ""} need analysis.
          </p>
          <button
            onClick={runAnalysis}
            disabled={!ready}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium transition-colors disabled:opacity-50"
          >
            {ready ? "Start Analysis" : "Loading Stockfish..."}
          </button>
        </div>
      )}

      {status === "running" && (
        <div className="space-y-3">
          <p className="text-zinc-300">
            Analyzing match #{currentMatch} ({moveProgress} moves)
          </p>
          <div className="text-sm text-zinc-500">
            Completed: {completed.length}/{queue.length}
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${(completed.length / queue.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {status === "done" && (
        <div>
          <p className="text-green-400 font-medium">
            All done! {completed.length} match{completed.length !== 1 ? "es" : ""} analyzed.
          </p>
          <a href="/" className="text-sm text-zinc-400 hover:text-zinc-200 mt-2 inline-block">
            &larr; Back to Leaderboard
          </a>
        </div>
      )}
    </div>
  );
}
