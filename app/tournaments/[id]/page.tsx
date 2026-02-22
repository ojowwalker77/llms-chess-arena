import { notFound } from "next/navigation";
import Link from "next/link";
import { getTournamentById } from "@/lib/db/queries/tournaments";
import { getMatchByTournamentPairing } from "@/lib/db/queries/matches";
import { getModelsByIds } from "@/lib/db/queries/models";
import { generateRoundRobinRounds } from "@/lib/tournament/manager";
import { TournamentRound } from "@/components/tournament/TournamentRound";

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

  const allRounds = generateRoundRobinRounds(modelIds);

  let totalCompleted = 0;
  let totalRunning = 0;
  let totalGames = 0;

  const rounds = allRounds.map((round) => {
    let roundCompleted = 0;
    let roundRunning = 0;

    const pairings = round.pairings.map((p) => {
      totalGames++;
      const existing = getMatchByTournamentPairing(
        tournamentId,
        p.whiteId,
        p.blackId
      );
      if (existing?.status === "completed") {
        totalCompleted++;
        roundCompleted++;
      }
      if (existing?.status === "running") {
        totalRunning++;
        roundRunning++;
      }

      const wm = modelMap.get(p.whiteId);
      const bm = modelMap.get(p.blackId);

      return {
        whiteModel: wm
          ? { id: wm.id, name: wm.name, openrouterId: wm.openrouterId }
          : null,
        blackModel: bm
          ? { id: bm.id, name: bm.name, openrouterId: bm.openrouterId }
          : null,
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

    const roundStatus =
      roundCompleted === round.pairings.length
        ? ("completed" as const)
        : roundCompleted > 0 || roundRunning > 0
          ? ("partial" as const)
          : ("pending" as const);

    return {
      roundNumber: round.roundNumber,
      isReverse: round.isReverse,
      pairings,
      status: roundStatus,
    };
  });

  const progressPct =
    totalGames > 0 ? Math.round((totalCompleted / totalGames) * 100) : 0;

  // Find the first non-completed round to auto-open
  const firstPendingRound =
    rounds.find((r) => r.status !== "completed")?.roundNumber ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/tournaments"
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          &larr; Back to Tournaments
        </Link>
        <h1
          className="text-2xl font-bold mt-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {tournament.name}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          {models.length} models &middot; {totalGames} matches &middot;{" "}
          {allRounds.length} rounds
        </p>
      </div>

      {/* Progress */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-zinc-400">Progress</span>
          <div className="flex items-center gap-4">
            {totalRunning > 0 && (
              <Link
                href={`/tournaments/${tournamentId}/live`}
                className="text-amber-400 hover:text-amber-300 text-xs font-medium transition-colors"
              >
                Watch Live ({totalRunning} running) &rarr;
              </Link>
            )}
            <span className="text-zinc-200 font-mono">
              {totalCompleted}/{totalGames}
            </span>
          </div>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Rounds */}
      <div className="space-y-2">
        {rounds.map((round) => (
          <TournamentRound
            key={round.roundNumber}
            tournamentId={tournamentId}
            roundNumber={round.roundNumber}
            isReverse={round.isReverse}
            pairings={round.pairings}
            status={round.status}
            defaultOpen={round.roundNumber === firstPendingRound}
          />
        ))}
      </div>
    </div>
  );
}
