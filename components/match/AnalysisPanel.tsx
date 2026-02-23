"use client";

import {
  classifyMove,
  getCriticalSwing,
  winProbability,
  QUALITY_META,
  type MoveQuality,
} from "@/lib/chess/analysis";

interface MoveData {
  moveNumber: number;
  color: "white" | "black";
  san: string;
  engineEval: number | null;
}

interface AnalysisPanelProps {
  matchId: number;
  existingWhiteCpl: number | null;
  existingBlackCpl: number | null;
  moves?: MoveData[];
}

interface QualityCounts {
  brilliant: number;
  great: number;
  best: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
}

function countQualities(
  moves: MoveData[],
  side: "white" | "black"
): QualityCounts {
  const counts: QualityCounts = {
    brilliant: 0,
    great: 0,
    best: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };

  for (let i = 0; i < moves.length; i++) {
    if (moves[i].color !== side) continue;
    const prevEval = i === 0 ? 0 : moves[i - 1].engineEval;
    const quality = classifyMove(
      prevEval,
      moves[i].engineEval,
      moves[i].color,
      moves[i].moveNumber
    );
    if (quality && quality in counts) {
      counts[quality as keyof QualityCounts]++;
    }
  }

  return counts;
}

function getKeyMoments(
  moves: MoveData[]
): Array<{ index: number; move: MoveData; swing: number; quality: MoveQuality }> {
  const moments: Array<{
    index: number;
    move: MoveData;
    swing: number;
    quality: MoveQuality;
  }> = [];

  for (let i = 0; i < moves.length; i++) {
    const prevEval = i === 0 ? 0 : moves[i - 1].engineEval;
    const swing = getCriticalSwing(prevEval, moves[i].engineEval);
    if (swing !== 0) {
      const quality = classifyMove(
        prevEval,
        moves[i].engineEval,
        moves[i].color,
        moves[i].moveNumber
      );
      moments.push({ index: i, move: moves[i], swing, quality });
    }
  }

  // Sort by absolute swing, return top 5
  return moments
    .sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing))
    .slice(0, 5);
}

function QualityRow({
  label,
  icon,
  color,
  count,
}: {
  label: string;
  icon: string;
  color: string;
  count: number;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`font-bold w-4 text-center ${color}`}>{icon}</span>
      <span className="text-zinc-400">{count}</span>
      <span className="text-zinc-500">{label}</span>
    </div>
  );
}

function QualityBreakdown({ counts }: { counts: QualityCounts }) {
  return (
    <div className="space-y-0.5">
      <QualityRow label="brilliant" icon="!!" color={QUALITY_META.brilliant.color} count={counts.brilliant} />
      <QualityRow label="great" icon="!" color={QUALITY_META.great.color} count={counts.great} />
      <QualityRow label="best" icon="★" color={QUALITY_META.best.color} count={counts.best} />
      <QualityRow label="good" icon="·" color="text-zinc-400" count={counts.good} />
      <QualityRow label="inaccuracy" icon="?!" color={QUALITY_META.inaccuracy.color} count={counts.inaccuracy} />
      <QualityRow label="mistake" icon="?" color={QUALITY_META.mistake.color} count={counts.mistake} />
      <QualityRow label="blunder" icon="??" color={QUALITY_META.blunder.color} count={counts.blunder} />
    </div>
  );
}

export function AnalysisPanel({
  existingWhiteCpl,
  existingBlackCpl,
  moves,
}: AnalysisPanelProps) {
  if (existingWhiteCpl === null || existingBlackCpl === null) {
    return null;
  }

  const whiteAccuracy = existingWhiteCpl;
  const blackAccuracy = existingBlackCpl;

  const hasEvals = moves && moves.some((m) => m.engineEval !== null);
  const whiteCounts = hasEvals ? countQualities(moves!, "white") : null;
  const blackCounts = hasEvals ? countQualities(moves!, "black") : null;
  const keyMoments = hasEvals ? getKeyMoments(moves!) : [];

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 space-y-4">
      <h3 className="text-sm font-medium text-zinc-300">
        Stockfish Analysis
      </h3>

      {/* Accuracy + move quality */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xs text-zinc-500">White Accuracy</span>
            <span
              className={`text-lg font-mono font-medium ${
                whiteAccuracy >= 80
                  ? "text-green-400"
                  : whiteAccuracy >= 50
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {whiteAccuracy.toFixed(1)}%
            </span>
          </div>
          {whiteCounts && <QualityBreakdown counts={whiteCounts} />}
        </div>
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xs text-zinc-500">Black Accuracy</span>
            <span
              className={`text-lg font-mono font-medium ${
                blackAccuracy >= 80
                  ? "text-green-400"
                  : blackAccuracy >= 50
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {blackAccuracy.toFixed(1)}%
            </span>
          </div>
          {blackCounts && <QualityBreakdown counts={blackCounts} />}
        </div>
      </div>

      {/* Key Moments */}
      {keyMoments.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
            Key Moments
          </h4>
          <div className="space-y-1">
            {keyMoments.map((moment) => {
              const favorText =
                moment.swing > 0 ? "→ White" : "→ Black";
              const swingColor =
                moment.swing > 0 ? "text-zinc-200" : "text-zinc-400";
              const q =
                moment.quality && moment.quality !== "good"
                  ? QUALITY_META[moment.quality]
                  : null;

              return (
                <div
                  key={moment.index}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="font-mono text-zinc-500 w-8">
                    {moment.move.moveNumber}.
                    {moment.move.color === "black" ? ".." : ""}
                  </span>
                  <span className="font-mono text-zinc-300">
                    {moment.move.san}
                  </span>
                  {q && (
                    <span className={`font-bold ${q.color}`}>{q.icon}</span>
                  )}
                  <span className="text-amber-400">
                    ⚡ {Math.abs(moment.swing).toFixed(0)}%
                  </span>
                  <span className={swingColor}>{favorText}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
