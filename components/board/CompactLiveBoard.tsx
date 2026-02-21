"use client";

import { useState, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { getLabLogo } from "@/lib/ui/logos";

interface MoveData {
  id: number;
  moveNumber: number;
  color: "white" | "black";
  san: string;
  fenAfter: string;
}

const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function CompactLiveBoard({
  matchId,
  whiteModel,
  blackModel,
  whiteOpenrouterId,
  blackOpenrouterId,
}: {
  matchId: number;
  whiteModel: string;
  blackModel: string;
  whiteOpenrouterId?: string;
  blackOpenrouterId?: string;
}) {
  const [moves, setMoves] = useState<MoveData[]>([]);
  const [status, setStatus] = useState("running");
  const [result, setResult] = useState<string | null>(null);
  const [resultReason, setResultReason] = useState<string | null>(null);
  const prevLen = useRef(0);

  const isLive = status === "running";

  // Poll for updates
  useEffect(() => {
    // Initial fetch
    fetchData();

    if (!isLive) return;
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);

    async function fetchData() {
      try {
        const res = await fetch(`/api/matches/${matchId}`);
        if (!res.ok) return;
        const data = await res.json();
        setMoves(data.moves || []);
        setStatus(data.status);
        if (data.result) setResult(data.result);
        if (data.resultReason) setResultReason(data.resultReason);
      } catch {
        /* keep trying */
      }
    }
  }, [matchId, isLive]);

  const currentFen =
    moves.length > 0 ? moves[moves.length - 1].fenAfter : STARTING_FEN;

  const moveCount = Math.ceil(moves.length / 2);
  const isWhiteTurn = moves.length % 2 === 0;
  const thinkingName = isLive
    ? isWhiteTurn
      ? whiteModel
      : blackModel
    : null;

  const resultLabel =
    result === "white"
      ? "1-0"
      : result === "black"
        ? "0-1"
        : result === "draw"
          ? "½-½"
          : null;

  const whiteLogo = whiteOpenrouterId ? getLabLogo(whiteOpenrouterId) : null;
  const blackLogo = blackOpenrouterId ? getLabLogo(blackOpenrouterId) : null;

  return (
    <a
      href={`/match/${matchId}`}
      className="block bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors"
    >
      {/* Black player bar */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="w-3 h-3 rounded-sm bg-zinc-700 border border-zinc-600 shrink-0" />
        {blackLogo && (
          <img src={blackLogo} alt="" className="w-4 h-4 shrink-0" />
        )}
        <span className="text-xs font-medium truncate text-zinc-300">
          {blackModel}
        </span>
        {isLive && !isWhiteTurn && (
          <span className="text-[10px] text-amber-400 animate-pulse ml-auto shrink-0">
            Thinking...
          </span>
        )}
      </div>

      {/* Board */}
      <div className="relative">
        <Chessboard
          options={{
            position: currentFen,
            allowDragging: false,
            animationDurationInMs: 200,
            darkSquareStyle: { backgroundColor: "#b58863" },
            lightSquareStyle: { backgroundColor: "#f0d9b5" },
          }}
        />

        {/* Result overlay */}
        {!isLive && resultLabel && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center">
              <span className="font-mono text-3xl font-bold text-white">
                {resultLabel}
              </span>
              {resultReason && (
                <p className="text-xs text-zinc-400 mt-1">{resultReason}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* White player bar */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="w-3 h-3 rounded-sm bg-white shrink-0" />
        {whiteLogo && (
          <img src={whiteLogo} alt="" className="w-4 h-4 shrink-0" />
        )}
        <span className="text-xs font-medium truncate text-zinc-300">
          {whiteModel}
        </span>
        {isLive && isWhiteTurn && (
          <span className="text-[10px] text-amber-400 animate-pulse ml-auto shrink-0">
            Thinking...
          </span>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1.5 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 font-mono">
          Move {moveCount}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[10px] text-red-400 font-medium">LIVE</span>
          </span>
        ) : (
          <span className="text-[10px] text-zinc-500">Completed</span>
        )}
      </div>
    </a>
  );
}
