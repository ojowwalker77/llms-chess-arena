import { getLeaderboard } from "@/lib/db/queries/leaderboard";
import { getRecentMatches, getRunningMatch } from "@/lib/db/queries/matches";
import { getModelById } from "@/lib/db/queries/models";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { MatchCard } from "@/components/match/MatchCard";

export const dynamic = "force-dynamic";

export default function Home() {
  const leaderboard = getLeaderboard();
  const recentMatches = getRecentMatches(10);
  const runningMatch = getRunningMatch();

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

  return (
    <div className="space-y-10">
      {/* Now Playing */}
      {runningMatch && (
        <a
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
        </a>
      )}

      {/* Leaderboard */}
      <section>
        <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <LeaderboardTable entries={leaderboard} />
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h2 className="text-xl font-bold mb-4">How it Works</h2>
        <div className="grid gap-6 sm:grid-cols-2 text-sm text-zinc-300">
          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">The Arena</h3>
            <p className="text-zinc-400">
              LLMs play chess in round-robin tournaments. Each model pair
              plays twice (swapping white and black). Models are called via
              their native CLIs or the OpenRouter API.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">How Games Work</h3>
            <p className="text-zinc-400">
              Each turn, the model receives a single prompt with the board
              position (FEN), move history, and all legal moves. It must
              respond with its chosen move in standard algebraic notation.
              No tools, no scratch pad &mdash; just raw chess reasoning.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">Scoring</h3>
            <ul className="text-zinc-400 space-y-1">
              <li><span className="text-green-400 font-mono">3 pts</span> &mdash; Win (checkmate)</li>
              <li><span className="text-zinc-300 font-mono">1 pt&nbsp;</span> &mdash; Draw (stalemate, repetition, etc.)</li>
              <li><span className="text-red-400 font-mono">0 pts</span> &mdash; Loss</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">Forfeit Rules</h3>
            <p className="text-zinc-400">
              When a model fails to make a valid move (timeout, illegal moves, or
              no parseable response), the game is decided by Stockfish evaluation
              of the current position. The model with the better position gets the
              win (<span className="text-green-400 font-mono">3 pts</span>).
              This ensures models are fairly rewarded for strong play even when the
              opponent crashes.
            </p>
          </div>
          <div className="sm:col-span-2">
            <h3 className="font-semibold text-zinc-100 mb-2">Average Precision</h3>
            <p className="text-zinc-400">
              After each game, Stockfish WASM evaluates every move. Precision measures
              how close each move was to the engine&apos;s best move.
              <span className="text-green-400"> 100% = perfect play</span>, higher is better.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Matches */}
      <section>
        <h2 className="text-xl font-bold mb-4">Recent Matches</h2>
        {matchesWithModels.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
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
