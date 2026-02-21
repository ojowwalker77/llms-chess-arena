"use client";

import { useState, useEffect, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { MoveList } from "./MoveList";
import { EvalBar } from "./EvalBar";
import { AutoAnalyzer } from "./AutoAnalyzer";
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

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function ReplayBoard({
  moves: initialMoves,
  whiteModel,
  blackModel,
  whiteOpenrouterId,
  blackOpenrouterId,
  matchId,
}: {
  moves: MoveData[];
  whiteModel: string;
  blackModel: string;
  whiteOpenrouterId?: string;
  blackOpenrouterId?: string;
  matchId: number;
}) {
  const [moves, setMoves] = useState(initialMoves);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string | null>(null);
  const [boardWidth, setBoardWidth] = useState(480);

  const currentFen =
    currentIndex === -1 ? STARTING_FEN : moves[currentIndex].fenAfter;
  const currentEval =
    currentIndex >= 0 ? moves[currentIndex].engineEval : null;

  const goToStart = useCallback(() => setCurrentIndex(-1), []);
  const goToPrev = useCallback(
    () => setCurrentIndex((i) => Math.max(-1, i - 1)),
    []
  );
  const goToNext = useCallback(
    () => setCurrentIndex((i) => Math.min(moves.length - 1, i + 1)),
    [moves.length]
  );
  const goToEnd = useCallback(
    () => setCurrentIndex(moves.length - 1),
    [moves.length]
  );

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
        setAutoPlaying(false);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
        setAutoPlaying(false);
      } else if (e.key === "Home") {
        e.preventDefault();
        goToStart();
        setAutoPlaying(false);
      } else if (e.key === "End") {
        e.preventDefault();
        goToEnd();
        setAutoPlaying(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext, goToStart, goToEnd]);

  // Auto-play
  useEffect(() => {
    if (!autoPlaying) return;
    if (currentIndex >= moves.length - 1) {
      setAutoPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setCurrentIndex((i) => i + 1);
    }, 800);
    return () => clearTimeout(timer);
  }, [autoPlaying, currentIndex, moves.length]);

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

  const handleAnalysisComplete = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setMoves(data.moves || []);
      }
    } catch { /* ignore */ }
  }, [matchId]);

  const whiteLogo = whiteOpenrouterId ? getLabLogo(whiteOpenrouterId) : null;
  const blackLogo = blackOpenrouterId ? getLabLogo(blackOpenrouterId) : null;

  return (
    <>
      <AutoAnalyzer
        matchId={matchId}
        moves={moves}
        onComplete={handleAnalysisComplete}
        onProgress={(cur, total) => setAnalysisProgress(`${cur}/${total}`)}
      />
      {analysisProgress && !moves.every((m) => m.engineEval !== null) && (
        <div className="text-xs text-zinc-500 mb-2 flex items-center gap-2">
          <span className="animate-pulse">Analyzing with Stockfish ({analysisProgress})...</span>
        </div>
      )}

      <div style={{ maxWidth: boardWidth + 40 }}>
        {/* Black player bar */}
        <PlayerBar
          name={blackModel}
          logo={blackLogo}
          colorClass="bg-zinc-800 border border-zinc-600"
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
                animationDurationInMs: 200,
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
        />

        {/* Controls */}
        <div className="flex items-center gap-1 mt-2">
          <ControlButton onClick={goToStart} title="Start">
            <SkipBackIcon />
          </ControlButton>
          <ControlButton onClick={goToPrev} title="Previous">
            <StepBackIcon />
          </ControlButton>
          <button
            onClick={() => setAutoPlaying(!autoPlaying)}
            title={autoPlaying ? "Pause" : "Play"}
            className={`p-2 rounded transition-colors ${
              autoPlaying
                ? "bg-amber-500/20 text-amber-400"
                : "hover:bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {autoPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <ControlButton onClick={goToNext} title="Next">
            <StepForwardIcon />
          </ControlButton>
          <ControlButton onClick={goToEnd} title="End">
            <SkipForwardIcon />
          </ControlButton>
          <span className="ml-auto text-sm text-zinc-500 font-mono">
            {currentIndex === -1 ? "Start" : `Move ${Math.ceil((currentIndex + 1) / 2)}`}
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
            onSelectMove={setCurrentIndex}
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
    </>
  );
}

function PlayerBar({
  name,
  logo,
  colorClass,
}: {
  name: string;
  logo: string | null;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className={`w-4 h-4 rounded-sm shrink-0 ${colorClass}`} />
      {logo && <img src={logo} alt="" className="w-5 h-5 shrink-0" />}
      <span className="font-semibold text-base text-zinc-100">{name}</span>
    </div>
  );
}

function ResponseLog({ thinking }: { thinking: string }) {
  try {
    const parsed = JSON.parse(thinking);
    // New format: array of strings (raw CLI/API outputs)
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
      return (
        <div className="space-y-2 text-sm">
          {parsed.map((text: string, i: number) => (
            <pre key={i} className="text-xs text-zinc-400 whitespace-pre-wrap">{text}</pre>
          ))}
        </div>
      );
    }
    // Legacy format: array of message objects with content/tool_calls
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

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 3l9 5-9 5V3z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="3" width="4" height="10" />
      <rect x="9" y="3" width="4" height="10" />
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
