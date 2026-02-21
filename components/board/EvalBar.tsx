"use client";

/**
 * Vertical evaluation bar showing engine advantage.
 * White advantage = bar fills from bottom (white).
 * Black advantage = bar fills from top (dark).
 */
export function EvalBar({ eval: evalCp }: { eval: number | null }) {
  if (evalCp === null) {
    return (
      <div className="w-8 h-full bg-zinc-800 rounded flex items-center justify-center">
        <span className="text-zinc-600 text-[8px] rotate-[-90deg]">N/A</span>
      </div>
    );
  }

  const clamped = Math.max(-1000, Math.min(1000, evalCp));
  const whitePercent = 50 + (clamped / 1000) * 50;

  const displayEval =
    Math.abs(evalCp) >= 9999
      ? evalCp > 0
        ? "M"
        : "-M"
      : (evalCp / 100).toFixed(1);

  return (
    <div className="w-8 h-full relative rounded overflow-hidden border border-zinc-700">
      {/* Black side (top) */}
      <div
        className="absolute top-0 left-0 right-0 bg-zinc-900 transition-all duration-300"
        style={{ height: `${100 - whitePercent}%` }}
      />
      {/* White side (bottom) */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-300"
        style={{ height: `${whitePercent}%` }}
      />
      {/* Eval text */}
      <div
        className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${
          evalCp >= 0 ? "text-zinc-800" : "text-zinc-300"
        }`}
      >
        <span className="rotate-[-90deg] whitespace-nowrap">
          {displayEval}
        </span>
      </div>
    </div>
  );
}
