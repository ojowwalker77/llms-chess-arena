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
  avgPrecision: number | null;
}

type SortField = "points" | "gamesPlayed" | "wins" | "winDelta" | "avgPrecision";

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
    if (sortBy === "avgPrecision") {
      aVal = a.avgPrecision ?? -Infinity;
      bVal = b.avgPrecision ?? -Infinity;
    } else {
      aVal = a[sortBy] ?? 0;
      bVal = b[sortBy] ?? 0;
    }
    return sortDir === "desc" ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal);
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
              onClick={() => handleSort("avgPrecision")}
            >
              Avg Precision
              <SortIndicator field="avgPrecision" />
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

