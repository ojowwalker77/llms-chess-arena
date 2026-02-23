import Link from "next/link";
import { getLeaderboard } from "@/lib/db/queries/leaderboard";
import {
  getRecentMatches,
  getRunningMatch,
  getMatchesByTournament,
} from "@/lib/db/queries/matches";
import { getModelById } from "@/lib/db/queries/models";
import { getAllTournaments } from "@/lib/db/queries/tournaments";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { MatchCard } from "@/components/match/MatchCard";
import { TournamentCard } from "@/components/tournament/TournamentCard";

export const dynamic = "force-dynamic";

export default function Home() {
  const leaderboard = getLeaderboard();
  const recentMatches = getRecentMatches(10);
  const runningMatch = getRunningMatch();
  const tournaments = getAllTournaments();

  const matchesWithModels = recentMatches.map((match) => ({
    match,
    whiteModel: getModelById(match.whiteModelId),
    blackModel: getModelById(match.blackModelId),
  }));

  const runningWhite = runningMatch
    ? getModelById(runningMatch.whiteModelId)
    : null;
  const runningBlack = runningMatch
    ? getModelById(runningMatch.blackModelId)
    : null;

  const tournamentsWithStats = tournaments.map((t) => {
    const modelIds: number[] = JSON.parse(t.modelIds);
    const total = modelIds.length * (modelIds.length - 1);
    const matches = getMatchesByTournament(t.id);
    const completed = matches.filter((m) => m.status === "completed").length;
    return { tournament: t, total, completed };
  });

  return (
    <div className="space-y-10">
      {/* Now Playing */}
      {runningMatch && (
        <Link
          href={`/match/${runningMatch.id}`}
          className="block bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-lg p-4 hover:border-red-500/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-sm font-medium text-red-400 uppercase tracking-wider">
              Now Playing
            </span>
          </div>
          <p className="text-lg font-bold mt-1">
            {runningWhite?.name || "?"} vs {runningBlack?.name || "?"}
          </p>
          <p className="text-sm text-zinc-400">Click to watch live</p>
        </Link>
      )}

      {/* Leaderboard */}
      <section>
        <h1 className="text-2xl font-bold mb-3">Leaderboard</h1>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-4 py-3 mb-4 text-sm text-zinc-400 space-y-2">
          <p>
            This is not a benchmark &mdash; though we can extract a lot about
            the models&apos; training, behavior, and chess capabilities from it.
          </p>
          <p>
            Grok 4 was considered for the tournament but failed the tryouts by
            not being able to consistently return a move within the stipulated
            time.
          </p>
          <p>
            Gemini Flash was also removed due to weird errors and issues with
            the API that weren&apos;t worth debugging.
          </p>
        </div>
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <LeaderboardTable entries={leaderboard} />
        </div>
      </section>

      {/* Tournament */}
      {tournamentsWithStats.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Tournament</h2>
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
        </section>
      )}

      {/* How it Works */}
      <section className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h2 className="text-xl font-bold mb-4">How it Works</h2>
        <div className="grid gap-6 sm:grid-cols-2 text-sm text-zinc-300">
          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">The Arena</h3>
            <p className="text-zinc-400">
              LLMs play chess in round-robin tournaments. Each model pair plays
              twice (swapping white and black). Models are called via their
              native CLIs or the OpenRouter API.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">How Games Work</h3>
            <p className="text-zinc-400">
              Each turn, the model receives a single prompt with the board
              position (FEN), move history, and all legal moves. It must respond
              with its chosen move in standard algebraic notation.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">Scoring</h3>
            <ul className="text-zinc-400 space-y-1">
              <li>
                <span className="text-green-400 font-mono">3 pts</span>
                {" "}&mdash; Win (checkmate or resignation)
              </li>
              <li>
                <span className="text-zinc-300 font-mono">1 pt&nbsp;</span>
                {" "}&mdash; Draw (stalemate, repetition, etc.)
              </li>
              <li>
                <span className="text-red-400 font-mono">0 pts</span>
                {" "}&mdash; Loss
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">Forfeit Rules</h3>
            <ul className="text-zinc-400 space-y-1.5 text-sm">
              <li>
                <span className="text-amber-400 font-semibold">Resignation</span>
                {" "}&rarr; opponent gets the full win
                (<span className="text-green-400 font-mono">3 pts</span>).
              </li>
              <li>
                <span className="text-red-400 font-semibold">Timeout (8 min CLI / 5 min API)</span>
                {" "}&rarr; opponent gets the full win
                (<span className="text-green-400 font-mono">3 pts</span>).
              </li>
              <li>
                <span className="text-zinc-300 font-semibold">Illegal move</span>
                {" "}&rarr; one retry with a warning, then Stockfish evaluates the
                position and the model ahead wins.
              </li>
            </ul>
          </div>
          <div className="sm:col-span-2">
            <h3 className="font-semibold text-zinc-100 mb-2">Accuracy &amp; ELO</h3>
            <p className="text-zinc-400">
              After each game, Stockfish WASM evaluates every move. Accuracy
              uses the{" "}
              <a href="https://lichess.org/page/accuracy" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                Lichess formula
              </a>{" "}
              based on win probability change per move.
              ELO is estimated from average centipawn loss (ACPL).
              <span className="text-green-400"> 100% = perfect play</span>.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Matches */}
      <section>
        <h2 className="text-xl font-bold mb-4">Recent Matches</h2>
        {matchesWithModels.length > 0 ? (
          <div className="space-y-2">
            {matchesWithModels.map(({ match, whiteModel, blackModel }) => (
              <MatchCard
                key={match.id}
                match={match}
                whiteModel={whiteModel}
                blackModel={blackModel}
              />
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">
            No matches played yet. Tournament coming soon.
          </p>
        )}
      </section>
    </div>
  );
}
