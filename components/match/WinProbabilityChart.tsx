"use client";

import { useMemo } from "react";
import { winProbability, getCriticalSwing } from "@/lib/chess/analysis";

interface MoveData {
  engineEval: number | null;
  color: "white" | "black";
  moveNumber: number;
  san: string;
}

const WIDTH = 600;
const HEIGHT = 120;
const PADDING = { top: 4, bottom: 4, left: 0, right: 0 };
const CHART_W = WIDTH - PADDING.left - PADDING.right;
const CHART_H = HEIGHT - PADDING.top - PADDING.bottom;

export function WinProbabilityChart({
  moves,
  currentIndex,
  onSelectMove,
}: {
  moves: MoveData[];
  currentIndex: number;
  onSelectMove?: (index: number) => void;
}) {
  const { points, criticalIndices } = useMemo(() => {
    const pts: Array<{ x: number; y: number; wp: number }> = [];
    const crits: number[] = [];

    // Starting position = 50%
    pts.push({ x: 0, y: CHART_H / 2, wp: 50 });

    let prevEval = 0;
    for (let i = 0; i < moves.length; i++) {
      const ev = moves[i].engineEval;
      const cp = ev ?? prevEval; // carry forward if null
      const wp = winProbability(cp);
      const x = PADDING.left + ((i + 1) / moves.length) * CHART_W;
      const y = PADDING.top + (1 - wp / 100) * CHART_H;
      pts.push({ x, y, wp });

      if (ev !== null) {
        const swing = getCriticalSwing(prevEval, ev);
        if (swing !== 0) crits.push(i);
        prevEval = ev;
      }
    }

    return { points: pts, criticalIndices: crits };
  }, [moves]);

  if (moves.length === 0) return null;

  // Build the SVG path
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  // Fill areas: white area (above 50%) and black area (below 50%)
  const midY = PADDING.top + CHART_H / 2;
  const whiteClipPath = `M${points[0].x},${midY} ${points.map((p) => `L${p.x},${Math.min(p.y, midY)}`).join(" ")} L${points[points.length - 1].x},${midY} Z`;
  const blackClipPath = `M${points[0].x},${midY} ${points.map((p) => `L${p.x},${Math.max(p.y, midY)}`).join(" ")} L${points[points.length - 1].x},${midY} Z`;

  // Current position marker
  const markerX =
    currentIndex < 0
      ? 0
      : PADDING.left + ((currentIndex + 1) / moves.length) * CHART_W;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onSelectMove) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const moveIdx = Math.round(xPct * moves.length) - 1;
    onSelectMove(Math.max(-1, Math.min(moves.length - 1, moveIdx)));
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full cursor-pointer"
        style={{ height: "auto", maxHeight: 120 }}
        onClick={handleClick}
        preserveAspectRatio="none"
      >
        {/* White advantage fill */}
        <path d={whiteClipPath} fill="rgba(134, 239, 172, 0.15)" />
        {/* Black advantage fill */}
        <path d={blackClipPath} fill="rgba(248, 113, 113, 0.15)" />

        {/* 50% line */}
        <line
          x1={0}
          y1={midY}
          x2={WIDTH}
          y2={midY}
          stroke="rgba(113, 113, 122, 0.3)"
          strokeWidth="1"
          strokeDasharray="4,4"
        />

        {/* Win probability line */}
        <path
          d={linePath}
          fill="none"
          stroke="rgba(161, 161, 170, 0.8)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Critical moments dots */}
        {criticalIndices.map((ci) => {
          const pt = points[ci + 1]; // +1 because points[0] is start
          if (!pt) return null;
          return (
            <circle
              key={ci}
              cx={pt.x}
              cy={pt.y}
              r="3"
              fill="#fbbf24"
              stroke="#78350f"
              strokeWidth="1"
            />
          );
        })}

        {/* Current position marker */}
        <line
          x1={markerX}
          y1={PADDING.top}
          x2={markerX}
          y2={HEIGHT - PADDING.bottom}
          stroke="rgba(245, 158, 11, 0.6)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
