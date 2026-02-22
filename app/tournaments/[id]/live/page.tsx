"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { CompactLiveBoard } from "@/components/board/CompactLiveBoard";

interface MatchInfo {
  id: number;
  status: string;
  result: string | null;
  resultReason: string | null;
}

interface PairingInfo {
  whiteModel: { id: number; name: string; openrouterId: string } | null;
  blackModel: { id: number; name: string; openrouterId: string } | null;
  match: MatchInfo | null;
}

interface RoundInfo {
  roundNumber: number;
  pairings: PairingInfo[];
  status: string;
}

interface TournamentData {
  name: string;
  rounds: RoundInfo[];
  stats: { total: number; completed: number; running: number };
}

export default function LivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<TournamentData | null>(null);
  const [error, setError] = useState(false);

  // Poll tournament data
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);

    async function fetchData() {
      try {
        const res = await fetch(`/api/tournament/${id}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError(true);
      }
    }
  }, [id]);

  if (error) {
    return (
      <div className="text-center py-20 text-zinc-500">
        Failed to load tournament data.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-zinc-500">Loading...</div>
    );
  }

  // Collect all running matches across all rounds
  const runningGames: {
    matchId: number;
    whiteModel: string;
    blackModel: string;
    whiteOpenrouterId?: string;
    blackOpenrouterId?: string;
  }[] = [];

  for (const round of data.rounds) {
    for (const p of round.pairings) {
      if (p.match?.status === "running" && p.whiteModel && p.blackModel) {
        runningGames.push({
          matchId: p.match.id,
          whiteModel: p.whiteModel.name,
          blackModel: p.blackModel.name,
          whiteOpenrouterId: p.whiteModel.openrouterId,
          blackOpenrouterId: p.blackModel.openrouterId,
        });
      }
    }
  }

  // Also collect recently completed (last 5s might have finished)
  const recentlyCompleted: typeof runningGames = [];
  for (const round of data.rounds) {
    for (const p of round.pairings) {
      if (
        p.match?.status === "completed" &&
        p.whiteModel &&
        p.blackModel
      ) {
        // Show completed matches from rounds that have running games
        const roundHasRunning = round.pairings.some(
          (rp) => rp.match?.status === "running"
        );
        if (roundHasRunning) {
          recentlyCompleted.push({
            matchId: p.match.id,
            whiteModel: p.whiteModel.name,
            blackModel: p.blackModel.name,
            whiteOpenrouterId: p.whiteModel.openrouterId,
            blackOpenrouterId: p.blackModel.openrouterId,
          });
        }
      }
    }
  }

  const allGames = [...runningGames, ...recentlyCompleted];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/tournaments/${id}`}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          &larr; Back to Tournament
        </Link>
        <h1
          className="text-2xl font-bold mt-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {data.name} &mdash; Live View
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          {data.stats.running} running &middot; {data.stats.completed}/
          {data.stats.total} completed
        </p>
      </div>

      {allGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allGames.map((game) => (
            <CompactLiveBoard
              key={game.matchId}
              matchId={game.matchId}
              whiteModel={game.whiteModel}
              blackModel={game.blackModel}
              whiteOpenrouterId={game.whiteOpenrouterId}
              blackOpenrouterId={game.blackOpenrouterId}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-zinc-500 text-lg">No games currently running</p>
          <Link
            href={`/tournaments/${id}`}
            className="text-sm text-zinc-400 hover:text-zinc-200 mt-2 inline-block transition-colors"
          >
            Go back to start a round &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
