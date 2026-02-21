import { notFound } from "next/navigation";
import { getMatchWithModels, getMatchMoves } from "@/lib/db/queries/matches";
import { ReplayBoard } from "@/components/board/ReplayBoard";
import { LiveMatchBoard } from "@/components/board/LiveMatchBoard";
import { AnalysisPanel } from "@/components/match/AnalysisPanel";
import { StarButton } from "@/components/match/StarButton";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = parseInt(id, 10);

  if (isNaN(matchId)) notFound();

  const match = getMatchWithModels(matchId);
  if (!match) notFound();

  const moves = getMatchMoves(matchId);
  const isLive = match.status === "running";

  const resultLabel =
    match.result === "white"
      ? "1-0"
      : match.result === "black"
        ? "0-1"
        : match.result === "draw"
          ? "½-½"
          : "In Progress";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <a
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          &larr; Back to Leaderboard
        </a>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold">
            {match.whiteModel?.name || "Unknown"} vs{" "}
            {match.blackModel?.name || "Unknown"}
          </h1>
          <StarButton matchId={matchId} initialStarred={!!match.starred} />
        </div>
        {!isLive && (
          <div className="flex items-center gap-4 mt-1 text-sm text-zinc-400">
            <span className="font-mono text-lg text-zinc-200">
              {resultLabel}
            </span>
            {match.resultReason && (
              <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs">
                {match.resultReason}
              </span>
            )}
            <span>{Math.ceil(moves.length / 2)} moves</span>
            {match.whiteAvgCpl !== null && (
              <span>
                Accuracy: {match.whiteModel?.name}{" "}
                {(match.whiteAvgCpl ?? 0).toFixed(1)}% /{" "}
                {match.blackModel?.name}{" "}
                {(match.blackAvgCpl ?? 0).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Board */}
      {isLive ? (
        <LiveMatchBoard
          matchId={matchId}
          initialMoves={moves}
          initialStatus={match.status}
          whiteModel={match.whiteModel?.name || "White"}
          blackModel={match.blackModel?.name || "Black"}
          whiteOpenrouterId={match.whiteModel?.openrouterId}
          blackOpenrouterId={match.blackModel?.openrouterId}
        />
      ) : moves.length > 0 ? (
        <ReplayBoard
          matchId={matchId}
          moves={moves}
          whiteModel={match.whiteModel?.name || "White"}
          blackModel={match.blackModel?.name || "Black"}
          whiteOpenrouterId={match.whiteModel?.openrouterId}
          blackOpenrouterId={match.blackModel?.openrouterId}
        />
      ) : (
        <p className="text-zinc-500">No moves recorded for this match.</p>
      )}

      {/* Stockfish Analysis */}
      {moves.length > 0 && match.status === "completed" && (
        <AnalysisPanel
          matchId={matchId}
          existingWhiteCpl={match.whiteAvgCpl}
          existingBlackCpl={match.blackAvgCpl}
        />
      )}

      {/* PGN */}
      {match.pgn && (
        <details className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-zinc-300 hover:text-zinc-100 select-none">
            PGN
          </summary>
          <pre className="px-4 pb-4 text-sm text-zinc-400 font-mono whitespace-pre-wrap overflow-x-auto">
            {match.pgn}
          </pre>
        </details>
      )}
    </div>
  );
}
