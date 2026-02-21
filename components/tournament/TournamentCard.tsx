import type { Tournament } from "@/lib/db/schema";

export function TournamentCard({
  tournament,
  total,
  completed,
}: {
  tournament: Tournament;
  total: number;
  completed: number;
}) {
  const modelIds: number[] = JSON.parse(tournament.modelIds);
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isDone = completed === total && total > 0;

  return (
    <a
      href={`/tournaments/${tournament.id}`}
      className="block bg-zinc-900 rounded-lg border border-zinc-800 p-4 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{tournament.name}</h3>
          <p className="text-sm text-zinc-500 mt-0.5">
            {modelIds.length} models &middot; {total} matches
          </p>
        </div>
        <div className="text-right">
          <span
            className={`text-sm font-medium ${
              isDone ? "text-green-400" : completed > 0 ? "text-amber-400" : "text-zinc-400"
            }`}
          >
            {completed}/{total}
          </span>
          {tournament.completedAt && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {new Date(tournament.completedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      {/* Progress bar */}
      <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-3">
        <div
          className={`h-1.5 rounded-full transition-all ${isDone ? "bg-green-500" : "bg-amber-500"}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </a>
  );
}
