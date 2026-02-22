"use client";

interface Move {
  id: number;
  moveNumber: number;
  color: "white" | "black";
  san: string;
  engineEval: number | null;
}

type MoveQuality = "great" | "best" | "inaccuracy" | "mistake" | "blunder" | null;

function classifyMove(
  prevEval: number | null,
  currEval: number | null,
  color: "white" | "black",
  moveNumber: number
): MoveQuality {
  if (prevEval === null || currEval === null) return null;

  let cpl: number;
  if (color === "white") {
    cpl = Math.max(0, prevEval - currEval);
  } else {
    cpl = Math.max(0, currEval - prevEval);
  }

  if (cpl > 200) return "blunder";
  if (cpl > 100) return "mistake";
  if (cpl > 50) return "inaccuracy";

  if (moveNumber >= 6 && cpl <= 5) {
    const absEval = Math.abs(currEval);
    if (absEval > 200) return "great";
    if (cpl === 0 && absEval > 50) return "best";
  }

  return null;
}

const QUALITY_ICONS: Record<string, { icon: string; color: string; title: string }> = {
  great: { icon: "!", color: "text-blue-400", title: "Great move" },
  best: { icon: "★", color: "text-green-400", title: "Best move" },
  inaccuracy: { icon: "?!", color: "text-yellow-400", title: "Inaccuracy" },
  mistake: { icon: "?", color: "text-orange-400", title: "Mistake" },
  blunder: { icon: "??", color: "text-red-400", title: "Blunder" },
};

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

  // Group into pairs
  const pairs: Array<{
    moveNumber: number;
    white?: { san: string; index: number; quality: MoveQuality };
    black?: { san: string; index: number; quality: MoveQuality };
  }> = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const entry = { san: move.san, index: i, quality: qualities[i] };
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
  move: { san: string; index: number; quality: MoveQuality };
  isActive: boolean;
  onClick: () => void;
}) {
  const q = move.quality && QUALITY_ICONS[move.quality];

  return (
    <button
      onClick={onClick}
      className={`py-1 px-2 text-left hover:bg-zinc-800 transition-colors flex items-center gap-1 ${
        isActive ? "bg-amber-500/20 text-white" : "text-zinc-300"
      }`}
    >
      <span>{move.san}</span>
      {q && (
        <span className={`text-[10px] font-bold ${q.color}`} title={q.title}>
          {q.icon}
        </span>
      )}
    </button>
  );
}
