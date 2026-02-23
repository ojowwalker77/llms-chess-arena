"use client";

import {
  classifyMove,
  getCriticalSwing,
  QUALITY_META,
  type MoveQuality,
} from "@/lib/chess/analysis";

interface Move {
  id: number;
  moveNumber: number;
  color: "white" | "black";
  san: string;
  engineEval: number | null;
}

export function MoveList({
  moves,
  currentIndex,
  onSelectMove,
  className,
}: {
  moves: Move[];
  currentIndex: number;
  onSelectMove: (index: number) => void;
  className?: string;
}) {
  const qualities: MoveQuality[] = moves.map((move, i) => {
    const prevEval = i === 0 ? 0 : moves[i - 1].engineEval;
    return classifyMove(prevEval, move.engineEval, move.color, move.moveNumber);
  });

  const criticalSwings: number[] = moves.map((move, i) => {
    const prevEval = i === 0 ? 0 : moves[i - 1].engineEval;
    return getCriticalSwing(prevEval, move.engineEval);
  });

  // Group into pairs
  const pairs: Array<{
    moveNumber: number;
    white?: { san: string; index: number; quality: MoveQuality; critical: boolean };
    black?: { san: string; index: number; quality: MoveQuality; critical: boolean };
  }> = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const entry = {
      san: move.san,
      index: i,
      quality: qualities[i],
      critical: criticalSwings[i] !== 0,
    };
    if (move.color === "white") {
      pairs.push({ moveNumber: move.moveNumber, white: entry });
    } else {
      if (pairs.length > 0 && !pairs[pairs.length - 1].black) {
        pairs[pairs.length - 1].black = entry;
      } else {
        pairs.push({ moveNumber: move.moveNumber, black: entry });
      }
    }
  }

  return (
    <div className={className || "overflow-y-auto max-h-48 text-sm font-mono"}>
      {pairs.map((pair) => (
        <div
          key={pair.moveNumber}
          className="grid grid-cols-[2.5rem_1fr_1fr] items-stretch border-b border-zinc-800/30"
        >
          <div className="text-zinc-500 py-1 px-1 text-right">
            {pair.moveNumber}.
          </div>
          {pair.white ? (
            <MoveCell
              move={pair.white}
              isActive={currentIndex === pair.white.index}
              onClick={() => onSelectMove(pair.white!.index)}
            />
          ) : (
            <div />
          )}
          {pair.black ? (
            <MoveCell
              move={pair.black}
              isActive={currentIndex === pair.black.index}
              onClick={() => onSelectMove(pair.black!.index)}
            />
          ) : (
            <div />
          )}
        </div>
      ))}
    </div>
  );
}

function MoveCell({
  move,
  isActive,
  onClick,
}: {
  move: { san: string; index: number; quality: MoveQuality; critical: boolean };
  isActive: boolean;
  onClick: () => void;
}) {
  const q = move.quality && move.quality !== "good" ? QUALITY_META[move.quality] : null;

  return (
    <button
      onClick={onClick}
      className={`py-1 px-2 text-left hover:bg-zinc-800 transition-colors flex items-center gap-1 ${
        isActive ? "bg-amber-500/20 text-white" : "text-zinc-300"
      }`}
    >
      {move.critical && (
        <span className="text-[10px] text-amber-400" title="Turning point">
          ⚡
        </span>
      )}
      <span>{move.san}</span>
      {q && (
        <span className={`text-[10px] font-bold ${q.color}`} title={q.title}>
          {q.icon}
        </span>
      )}
    </button>
  );
}
