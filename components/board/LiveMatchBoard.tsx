"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { MoveList } from "./MoveList";
import { EvalBar } from "./EvalBar";
import { useStockfish } from "@/hooks/useStockfish";
import { getLabLogo } from "@/lib/ui/logos";

interface MoveData {
  id: number;
  moveNumber: number;
  color: "white" | "black";
  san: string;
  fenAfter: string;
  engineEval: number | null;
  thinking: string | null;
}

const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function LiveMatchBoard({
  matchId,
  initialMoves,
  initialStatus,
  whiteModel,
  blackModel,
  whiteOpenrouterId,
  blackOpenrouterId,
}: {
  matchId: number;
  initialMoves: MoveData[];
  initialStatus: string;
  whiteModel: string;
  blackModel: string;
  whiteOpenrouterId?: string;
  blackOpenrouterId?: string;
}) {
  const [moves, setMoves] = useState<MoveData[]>(initialMoves);
  const [status, setStatus] = useState(initialStatus);
  const [result, setResult] = useState<string | null>(null);
  const [resultReason, setResultReason] = useState<string | null>(null);
  const [followLive, setFollowLive] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(
    initialMoves.length > 0 ? initialMoves.length - 1 : -1
  );
  const [boardWidth, setBoardWidth] = useState(480);
  const [localEvals, setLocalEvals] = useState<Record<number, number>>({});
  const prevMovesLen = useRef(initialMoves.length);
  const evaledRef = useRef(new Set<number>());
  const { evaluate, ready: sfReady } = useStockfish();

  const isLive = status === "running";

  // Poll for new moves
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}`);
        if (!res.ok) return;
        const data = await res.json();
        setMoves(data.moves || []);
        setStatus(data.status);
        if (data.result) setResult(data.result);
        if (data.resultReason) setResultReason(data.resultReason);
      } catch { /* keep trying */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [matchId, isLive]);

  // Client-side Stockfish eval
  useEffect(() => {
    if (!sfReady) return;
    for (const move of moves) {
      if (move.engineEval !== null || evaledRef.current.has(move.id)) continue;
      evaledRef.current.add(move.id);
      evaluate(move.fenAfter).then((res) => {
        setLocalEvals((prev) => ({ ...prev, [move.id]: res.cp }));
      });
    }
  }, [moves, sfReady, evaluate]);

  // Auto-follow latest
  useEffect(() => {
    if (followLive && moves.length > prevMovesLen.current) {
      setCurrentIndex(moves.length - 1);
    }
    prevMovesLen.current = moves.length;
  }, [moves.length, followLive]);

  function handleManualNav(index: number) {
    setCurrentIndex(index);
    if (index < moves.length - 1) setFollowLive(false);
  }

  const currentFen =
    currentIndex === -1
      ? STARTING_FEN
      : moves[currentIndex]?.fenAfter || STARTING_FEN;

  const currentEval =
    currentIndex >= 0
      ? moves[currentIndex]?.engineEval ?? localEvals[moves[currentIndex]?.id] ?? null
      : null;

  // Responsive board size
  useEffect(() => {
    function updateSize() {
      const width = Math.min(window.innerWidth - 120, 640);
      setBoardWidth(Math.max(320, width));
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFollowLive(false);
        setCurrentIndex((i) => Math.max(-1, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((i) => {
          const next = Math.min(moves.length - 1, i + 1);
          if (next === moves.length - 1) setFollowLive(true);
          return next;
        });
      } else if (e.key === "Home") {
        e.preventDefault();
        setFollowLive(false);
        setCurrentIndex(-1);
      } else if (e.key === "End") {
        e.preventDefault();
        setFollowLive(true);
        setCurrentIndex(moves.length - 1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moves.length]);

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

  // Determine who is thinking (live only)
  const isWhiteTurn = moves.length % 2 === 0; // even = white's turn
  const thinkingModel = isLive ? (isWhiteTurn ? whiteModel : blackModel) : null;

  return (
    <div>
      {/* Live indicator */}
      {isLive && (
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-sm font-medium text-red-400">LIVE</span>
          <button
            onClick={() => {
              setFollowLive(true);
              setCurrentIndex(moves.length - 1);
            }}
            className={`text-xs px-2 py-0.5 rounded ${
              followLive
                ? "bg-red-500/20 text-red-300"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {followLive ? "Following latest" : "Click to follow"}
          </button>
        </div>
      )}

      {/* Game over banner */}
      {!isLive && resultLabel && (
        <div className="flex items-center gap-3 mb-3 bg-zinc-800/50 rounded-lg px-4 py-2">
          <span className="font-mono text-lg font-bold text-zinc-100">
            {resultLabel}
          </span>
          {resultReason && (
            <span className="bg-zinc-700 px-2 py-0.5 rounded text-xs text-zinc-300">
              {resultReason}
            </span>
          )}
        </div>
      )}

      <div style={{ maxWidth: boardWidth + 40 }}>
        {/* Black player bar */}
        <PlayerBar
          name={blackModel}
          logo={blackLogo}
          colorClass="bg-zinc-800 border border-zinc-600"
          isThinking={isLive && !isWhiteTurn}
        />

        {/* Board + Eval */}
        <div className="flex gap-2">
          <div style={{ height: boardWidth }}>
            <EvalBar eval={currentEval} />
          </div>
          <div style={{ width: boardWidth }}>
            <Chessboard
              options={{
                position: currentFen,
                allowDragging: false,
                animationDurationInMs: 300,
                darkSquareStyle: { backgroundColor: "#b58863" },
                lightSquareStyle: { backgroundColor: "#f0d9b5" },
              }}
            />
          </div>
        </div>

        {/* White player bar */}
        <PlayerBar
          name={whiteModel}
          logo={whiteLogo}
          colorClass="bg-white"
          isThinking={isLive && isWhiteTurn}
        />

        {/* Controls */}
        <div className="flex items-center gap-1 mt-2">
          <ControlButton onClick={() => handleManualNav(-1)} title="Start">
            <SkipBackIcon />
          </ControlButton>
          <ControlButton
            onClick={() => handleManualNav(Math.max(-1, currentIndex - 1))}
            title="Previous"
          >
            <StepBackIcon />
          </ControlButton>
          <ControlButton
            onClick={() => {
              const next = Math.min(moves.length - 1, currentIndex + 1);
              setCurrentIndex(next);
              if (next === moves.length - 1) setFollowLive(true);
            }}
            title="Next"
          >
            <StepForwardIcon />
          </ControlButton>
          <ControlButton
            onClick={() => {
              setFollowLive(true);
              setCurrentIndex(moves.length - 1);
            }}
            title="End"
          >
            <SkipForwardIcon />
          </ControlButton>
          <span className="ml-auto text-sm text-zinc-500 font-mono">
            {currentIndex === -1
              ? "Start"
              : `Move ${Math.ceil((currentIndex + 1) / 2)}`}
            {" / "}{Math.ceil(moves.length / 2)}
          </span>
        </div>

        {/* Move list */}
        <div className="mt-3 bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-800 text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Moves
          </div>
          <MoveList
            moves={moves}
            currentIndex={currentIndex}
            onSelectMove={handleManualNav}
          />
        </div>
      </div>

      {/* LLM Response - collapsible */}
      {currentIndex >= 0 && moves[currentIndex]?.thinking && (
        <details className="mt-3 bg-zinc-900 rounded-lg border border-zinc-800" style={{ maxWidth: boardWidth + 40 }}>
          <summary className="px-4 py-2 cursor-pointer text-sm text-zinc-400 hover:text-zinc-200 select-none flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                moves[currentIndex].color === "white"
                  ? "bg-zinc-200"
                  : "bg-zinc-600"
              }`}
            />
            {moves[currentIndex].color === "white" ? whiteModel : blackModel}
            {" \u2014 Move "}{moves[currentIndex].moveNumber} response
          </summary>
          <div className="px-4 pb-3 max-h-60 overflow-y-auto">
            <ResponseLog thinking={moves[currentIndex].thinking} />
          </div>
        </details>
      )}
    </div>
  );
}

function PlayerBar({
  name,
  logo,
  colorClass,
  isThinking,
}: {
  name: string;
  logo: string | null;
  colorClass: string;
  isThinking?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className={`w-4 h-4 rounded-sm shrink-0 ${colorClass}`} />
      {logo && <img src={logo} alt="" className="w-5 h-5 shrink-0" />}
      <span className="font-semibold text-base text-zinc-100">{name}</span>
      {isThinking && (
        <span className="text-xs text-amber-400 animate-pulse">Thinking...</span>
      )}
    </div>
  );
}

function ResponseLog({ thinking }: { thinking: string }) {
  try {
    const parsed = JSON.parse(thinking);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
      return (
        <div className="space-y-2 text-sm">
          {parsed.map((text: string, i: number) => (
            <pre key={i} className="text-xs text-zinc-400 whitespace-pre-wrap">{text}</pre>
          ))}
        </div>
      );
    }
    if (Array.isArray(parsed)) {
      return (
        <div className="space-y-3 text-sm">
          {parsed.map((msg: Record<string, unknown>, i: number) => (
            <div key={i} className="space-y-1">
              {typeof msg.content === "string" && msg.content && (
                <p className="text-zinc-300 whitespace-pre-wrap">{msg.content}</p>
              )}
              {Array.isArray(msg.tool_calls) &&
                msg.tool_calls.map((tc: Record<string, unknown>, j: number) => {
                  const fn = tc.function as Record<string, unknown> | undefined;
                  return (
                    <div key={j} className="bg-zinc-800/50 rounded px-3 py-2 font-mono text-xs">
                      <span className="text-blue-400">{fn?.name ? String(fn.name) : "unknown"}</span>
                      <span className="text-zinc-500">(</span>
                      <span className="text-zinc-400">{fn?.arguments ? String(fn.arguments) : ""}</span>
                      <span className="text-zinc-500">)</span>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      );
    }
  } catch { /* not JSON */ }
  return <pre className="text-xs text-zinc-400 whitespace-pre-wrap">{thinking}</pre>;
}

// --- Control button + SVG icons ---

function ControlButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}

function SkipBackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="3" width="2" height="10" />
      <path d="M13 3L6 8l7 5V3z" />
    </svg>
  );
}

function StepBackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12 3L5 8l7 5V3z" />
    </svg>
  );
}

function StepForwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 3l7 5-7 5V3z" />
    </svg>
  );
}

function SkipForwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 3l7 5-7 5V3z" />
      <rect x="12" y="3" width="2" height="10" />
    </svg>
  );
}
