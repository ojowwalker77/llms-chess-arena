import { getAllTournaments } from "@/lib/db/queries/tournaments";
import { getMatchesByTournament } from "@/lib/db/queries/matches";
import { TournamentCard } from "@/components/tournament/TournamentCard";

export const dynamic = "force-dynamic";

export default function TournamentsPage() {
  const tournaments = getAllTournaments();

  const tournamentsWithStats = tournaments.map((t) => {
    const modelIds: number[] = JSON.parse(t.modelIds);
    const total = modelIds.length * (modelIds.length - 1);
    const matches = getMatchesByTournament(t.id);
    const completed = matches.filter((m) => m.status === "completed").length;
    return { tournament: t, total, completed };
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold mb-4">Tournaments</h1>
        {tournamentsWithStats.length > 0 ? (
          <div className="grid gap-3">
            {tournamentsWithStats.map(({ tournament, total, completed }) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                total={total}
                completed={completed}
              />
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">No tournaments yet.</p>
        )}
      </section>
    </div>
  );
}
