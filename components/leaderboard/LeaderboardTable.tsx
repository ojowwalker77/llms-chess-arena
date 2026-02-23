"use client";

import { useState } from "react";
import { getLabLogo } from "@/lib/ui/logos";

interface LeaderboardEntry {
  id: number;
  name: string;
  openrouterId: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  winDelta: number;
  totalMovesPlayed: number;
  avgPrecision: number | null;
  avgAcpl: number | null;
  estimatedElo: number | null;
}

type SortField = "points" | "gamesPlayed" | "wins" | "winDelta" | "totalMovesPlayed" | "avgPrecision" | "avgAcpl" | "estimatedElo";

export function LeaderboardTable({
  entries,
}: {
  entries: LeaderboardEntry[];
}) {
  const [sortBy, setSortBy] = useState<SortField>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = [...entries].sort((a, b) => {
    let aVal: number;
    let bVal: number;
    if (sortBy === "avgPrecision" || sortBy === "estimatedElo" || sortBy === "avgAcpl") {
      aVal = a[sortBy] ?? -Infinity;
      bVal = b[sortBy] ?? -Infinity;
    } else {
      aVal = a[sortBy] ?? 0;
      bVal = b[sortBy] ?? 0;
    }
    const primary = sortDir === "desc" ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal);
    if (primary !== 0) return primary;
    // Tiebreak: W-L delta > total moves played > avg precision
    const deltaDiff = b.winDelta - a.winDelta;
    if (deltaDiff !== 0) return deltaDiff;
    const movesDiff = b.totalMovesPlayed - a.totalMovesPlayed;
    if (movesDiff !== 0) return movesDiff;
    const aPrecision = a.avgPrecision ?? -Infinity;
    const bPrecision = b.avgPrecision ?? -Infinity;
    return bPrecision - aPrecision;
  });

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  function SortIndicator({ field }: { field: SortField }) {
    if (sortBy !== field) return null;
    return <span className="ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400 text-left">
            <th className="py-3 px-4 font-medium w-12">#</th>
            <th className="py-3 px-4 font-medium">Model</th>
            <th
              className="py-3 px-4 font-medium cursor-pointer hover:text-zinc-100 transition-colors"
              onClick={() => handleSort("points")}
            >
              Pts
              <SortIndicator field="points" />
            </th>
            <th
              className="py-3 px-4 font-medium cursor-pointer hover:text-zinc-100 transition-colors"
              onClick={() => handleSort("gamesPlayed")}
            >
              Matches
              <SortIndicator field="gamesPlayed" />
            </th>
            <th
              className="py-3 px-4 font-medium cursor-pointer hover:text-zinc-100 transition-colors"
              onClick={() => handleSort("wins")}
            >
              W
              <SortIndicator field="wins" />
            </th>
            <th className="py-3 px-4 font-medium">D</th>
            <th className="py-3 px-4 font-medium">L</th>
            <th
              className="py-3 px-4 font-medium cursor-pointer hover:text-zinc-100 transition-colors"
              onClick={() => handleSort("winDelta")}
            >
              W-L
              <SortIndicator field="winDelta" />
            </th>
            <th
              className="py-3 px-4 font-medium cursor-pointer hover:text-zinc-100 transition-colors"
              onClick={() => handleSort("totalMovesPlayed")}
            >
              Moves
              <SortIndicator field="totalMovesPlayed" />
            </th>
            <th
              className="py-3 px-4 font-medium cursor-pointer hover:text-zinc-100 transition-colors"
              onClick={() => handleSort("avgPrecision")}
            >
              Accuracy
              <SortIndicator field="avgPrecision" />
            </th>
            <th
              className="py-3 px-4 font-medium cursor-pointer hover:text-zinc-100 transition-colors"
              onClick={() => handleSort("avgAcpl")}
            >
              ACPL
              <SortIndicator field="avgAcpl" />
            </th>
            <th
              className="py-3 px-4 font-medium cursor-pointer hover:text-zinc-100 transition-colors"
              onClick={() => handleSort("estimatedElo")}
            >
              Est. ELO
              <SortIndicator field="estimatedElo" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, index) => (
            <tr
              key={entry.id}
              className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
            >
              <td className="py-3 px-4 text-zinc-500 font-mono">
                {index + 1}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  {(() => {
                    const logo = getLabLogo(entry.openrouterId);
                    return logo ? (
                      <img src={logo} alt="" className="w-5 h-5 shrink-0" />
                    ) : (
                      <div className="w-5 h-5 shrink-0 rounded bg-zinc-700" />
                    );
                  })()}
                  <div>
                    <span className="font-medium">{entry.name}</span>
                    <span className="text-zinc-500 text-xs ml-2">
                      {entry.openrouterId}
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 font-mono font-bold text-white">
                {entry.points}
              </td>
              <td className="py-3 px-4 font-mono">{entry.gamesPlayed}</td>
              <td className="py-3 px-4 font-mono text-green-400">
                {entry.wins}
              </td>
              <td className="py-3 px-4 font-mono text-zinc-400">
                {entry.draws}
              </td>
              <td className="py-3 px-4 font-mono text-red-400">
                {entry.losses}
              </td>
              <td className="py-3 px-4 font-mono">
                <span
                  className={
                    entry.winDelta > 0
                      ? "text-green-400"
                      : entry.winDelta < 0
                        ? "text-red-400"
                        : "text-zinc-400"
                  }
                >
                  {entry.winDelta > 0 ? "+" : ""}
                  {entry.winDelta}
                </span>
              </td>
              <td className="py-3 px-4 font-mono text-zinc-300">
                {entry.totalMovesPlayed}
              </td>
              <td className="py-3 px-4 font-mono">
                {entry.avgPrecision !== null ? (
                  <span
                    className={
                      entry.avgPrecision >= 80
                        ? "text-green-400"
                        : entry.avgPrecision >= 50
                          ? "text-yellow-400"
                          : "text-red-400"
                    }
                  >
                    {entry.avgPrecision.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-zinc-600">--</span>
                )}
              </td>
              <td className="py-3 px-4 font-mono">
                {entry.avgAcpl !== null ? (
                  <span
                    className={
                      entry.avgAcpl <= 30
                        ? "text-green-400"
                        : entry.avgAcpl <= 60
                          ? "text-yellow-400"
                          : "text-red-400"
                    }
                  >
                    {entry.avgAcpl.toFixed(0)}
                  </span>
                ) : (
                  <span className="text-zinc-600">--</span>
                )}
              </td>
              <td className="py-3 px-4 font-mono">
                {entry.estimatedElo !== null ? (
                  <span className="text-zinc-200">{entry.estimatedElo}</span>
                ) : (
                  <span className="text-zinc-600">--</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 && (
        <p className="text-center text-zinc-500 py-8">
          No models yet. Add some models to get started.
        </p>
      )}
    </div>
  );
}
