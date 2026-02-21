import { notFound } from "next/navigation";
import { getTournamentById } from "@/lib/db/queries/tournaments";
import { getMatchByTournamentPairing } from "@/lib/db/queries/matches";
import { getModelsByIds } from "@/lib/db/queries/models";
import { generateRoundRobinPairings } from "@/lib/tournament/manager";
import { TournamentPairingRow } from "@/components/tournament/TournamentPairingRow";

export const dynamic = "force-dynamic";

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournamentId = parseInt(id, 10);
  if (isNaN(tournamentId)) notFound();

  const tournament = getTournamentById(tournamentId);
  if (!tournament) notFound();

  const modelIds: number[] = JSON.parse(tournament.modelIds);
  const models = getModelsByIds(modelIds);
  const modelMap = new Map(models.map((m) => [m.id, m]));

  const allPairings = generateRoundRobinPairings(modelIds);

  let completed = 0;
  let running = 0;

  const pairings = allPairings.map((p) => {
    const existing = getMatchByTournamentPairing(tournamentId, p.whiteId, p.blackId);
    if (existing?.status === "completed") completed++;
    if (existing?.status === "running") running++;

    const wm = modelMap.get(p.whiteId);
    const bm = modelMap.get(p.blackId);

    return {
      whiteModel: wm ? { id: wm.id, name: wm.name, openrouterId: wm.openrouterId } : null,
      blackModel: bm ? { id: bm.id, name: bm.name, openrouterId: bm.openrouterId } : null,
      match: existing
        ? {
            id: existing.id,
            status: existing.status,
            result: existing.result as string | null,
            resultReason: existing.resultReason as string | null,
          }
        : null,
    };
  });

  const total = allPairings.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <a
          href="/tournaments"
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          &larr; Back to Tournaments
        </a>
        <h1 className="text-2xl font-bold mt-2">{tournament.name}</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {models.length} models &middot; {total} matches
        </p>
      </div>

      {/* Progress */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-zinc-400">Progress</span>
          <span className="text-zinc-200 font-mono">
            {completed}/{total} completed
            {running > 0 && (
              <span className="text-amber-400 ml-2">({running} running)</span>
            )}
          </span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Pairings Table */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Matches
          </h2>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {pairings.map((p, i) => (
            <TournamentPairingRow
              key={i}
              tournamentId={tournamentId}
              whiteModel={p.whiteModel}
              blackModel={p.blackModel}
              match={p.match}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
