import Link from "next/link";
import type { Match, Model } from "@/lib/db/schema";
import { getLabLogo } from "@/lib/ui/logos";

export function MatchCard({
  match,
  whiteModel,
  blackModel,
}: {
  match: Match;
  whiteModel?: Model | null;
  blackModel?: Model | null;
}) {
  const resultLabel =
    match.result === "white"
      ? "1-0"
      : match.result === "black"
        ? "0-1"
        : match.result === "draw"
          ? "½-½"
          : null;

  const isRunning = match.status === "running";
  const isWhiteWin = match.result === "white";
  const isBlackWin = match.result === "black";

  const whiteLogo = whiteModel?.openrouterId
    ? getLabLogo(whiteModel.openrouterId)
    : null;
  const blackLogo = blackModel?.openrouterId
    ? getLabLogo(blackModel.openrouterId)
    : null;

  const moveCount = match.totalMoves > 0 ? Math.ceil(match.totalMoves / 2) : null;

  function accuracyColor(v: number) {
    if (v >= 80) return "text-green-400";
    if (v >= 50) return "text-yellow-400";
    return "text-red-400";
  }

  return (
    <Link
      href={`/match/${match.id}`}
      className="group block bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* White side */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="w-3 h-3 rounded-full bg-zinc-200 shrink-0" />
          {whiteLogo && (
            <img src={whiteLogo} alt="" className="w-5 h-5 shrink-0" />
          )}
          <div className="min-w-0">
            <span
              className={`text-sm font-medium truncate block ${
                isWhiteWin
                  ? "text-zinc-100"
                  : isBlackWin
                    ? "text-zinc-500"
                    : "text-zinc-300"
              }`}
            >
              {whiteModel?.name || `Model #${match.whiteModelId}`}
            </span>
            {match.whiteAvgCpl != null && (
              <span className={`text-xs font-mono ${accuracyColor(match.whiteAvgCpl)}`}>
                {match.whiteAvgCpl.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Result center */}
        <div className="shrink-0 w-16 text-center">
          {isRunning ? (
            <div className="flex items-center justify-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span className="text-xs font-medium text-amber-400 uppercase">Live</span>
            </div>
          ) : resultLabel ? (
            <span
              className={`text-base font-bold font-mono ${
                match.result === "draw" ? "text-zinc-400" : "text-zinc-100"
              }`}
            >
              {resultLabel}
            </span>
          ) : (
            <span className="text-xs text-zinc-600">pending</span>
          )}
        </div>

        {/* Black side */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <span
              className={`text-sm font-medium truncate block ${
                isBlackWin
                  ? "text-zinc-100"
                  : isWhiteWin
                    ? "text-zinc-500"
                    : "text-zinc-300"
              }`}
            >
              {blackModel?.name || `Model #${match.blackModelId}`}
            </span>
            {match.blackAvgCpl != null && (
              <span className={`text-xs font-mono ${accuracyColor(match.blackAvgCpl)}`}>
                {match.blackAvgCpl.toFixed(1)}%
              </span>
            )}
          </div>
          {blackLogo && (
            <img src={blackLogo} alt="" className="w-5 h-5 shrink-0" />
          )}
          <span className="w-3 h-3 rounded-full bg-zinc-700 shrink-0" />
        </div>

        {/* Metadata column */}
        <div className="shrink-0 w-24 text-right pl-3 border-l border-zinc-800">
          {match.resultReason && (
            <div className="text-xs text-zinc-400 truncate">{match.resultReason}</div>
          )}
          {moveCount && (
            <div className="text-xs text-zinc-600">{moveCount} moves</div>
          )}
          {!match.resultReason && !moveCount && match.status && (
            <div
              className={`text-xs ${
                match.status === "failed" ? "text-red-400" : "text-zinc-600"
              }`}
            >
              {match.status}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
