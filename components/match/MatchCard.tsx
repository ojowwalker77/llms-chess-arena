import type { Match, Model } from "@/lib/db/schema";

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
          : "...";

  const statusColor =
    match.status === "completed"
      ? "text-green-400"
      : match.status === "running"
        ? "text-amber-400"
        : match.status === "failed"
          ? "text-red-400"
          : "text-zinc-400";

  return (
    <a
      href={`/match/${match.id}`}
      className="block bg-zinc-900 rounded-lg border border-zinc-800 p-4 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5">
          <span className={`text-xs font-medium uppercase ${statusColor}`}>
            {match.status}
          </span>
          {match.starred ? <span className="text-amber-400 text-xs">★</span> : null}
        </span>
        {match.resultReason && (
          <span className="text-xs text-zinc-500">{match.resultReason}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 text-right">
          <span className="text-sm font-medium">
            {whiteModel?.name || `Model #${match.whiteModelId}`}
          </span>
          <span className="w-2 h-2 rounded-full bg-zinc-200 inline-block ml-2" />
        </div>
        <div className="text-lg font-bold font-mono text-zinc-300 w-16 text-center">
          {resultLabel}
        </div>
        <div className="flex-1">
          <span className="w-2 h-2 rounded-full bg-zinc-600 inline-block mr-2" />
          <span className="text-sm font-medium">
            {blackModel?.name || `Model #${match.blackModelId}`}
          </span>
        </div>
      </div>
      {match.totalMoves > 0 && (
        <div className="text-xs text-zinc-500 mt-2 text-center">
          {Math.ceil(match.totalMoves / 2)} moves
        </div>
      )}
    </a>
  );
}
