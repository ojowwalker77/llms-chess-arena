"use client";

import { useState } from "react";
import { TournamentPairingRow } from "./TournamentPairingRow";

interface ModelInfo {
  id: number;
  name: string;
  openrouterId: string;
}

interface MatchInfo {
  id: number;
  status: string;
  result: string | null;
  resultReason: string | null;
}

interface PairingData {
  whiteModel: ModelInfo | null;
  blackModel: ModelInfo | null;
  match: MatchInfo | null;
}

export function TournamentRound({
  tournamentId,
  roundNumber,
  isReverse,
  pairings,
  status,
  defaultOpen,
}: {
  tournamentId: number;
  roundNumber: number;
  isReverse: boolean;
  pairings: PairingData[];
  status: "pending" | "partial" | "completed";
  defaultOpen: boolean;
}) {
  const [starting, setStarting] = useState(false);

  const completed = pairings.filter(
    (p) => p.match?.status === "completed"
  ).length;
  const running = pairings.filter(
    (p) => p.match?.status === "running"
  ).length;
  const hasUnplayed = pairings.some((p) => !p.match);

  async function handlePlayRound() {
    if (starting) return;
    setStarting(true);

    try {
      const res = await fetch(
        `/api/tournament/${tournamentId}/round/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundNumber }),
        }
      );

      if (res.ok) {
        window.location.href = `/tournaments/${tournamentId}/live`;
      } else {
        setStarting(false);
      }
    } catch {
      setStarting(false);
    }
  }

  const statusBadge =
    status === "completed" ? (
      <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
        {completed}/{pairings.length}
      </span>
    ) : status === "partial" ? (
      <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
        {completed}/{pairings.length}
        {running > 0 && ` (${running} live)`}
      </span>
    ) : (
      <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
        Pending
      </span>
    );

  return (
    <details
      open={defaultOpen}
      className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden"
    >
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-zinc-800/30 transition-colors">
        <span className="text-sm font-semibold text-zinc-200">
          Round {roundNumber}
        </span>
        {isReverse && (
          <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
            Mirror
          </span>
        )}
        {statusBadge}
        <div className="flex-1" />
        {hasUnplayed && status !== "completed" && (
          <button
            onClick={(e) => {
              e.preventDefault();
              handlePlayRound();
            }}
            disabled={starting}
            className="px-3 py-1 text-xs font-medium rounded bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {starting ? "Starting..." : "Play Round"}
          </button>
        )}
      </summary>
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
    </details>
  );
}
