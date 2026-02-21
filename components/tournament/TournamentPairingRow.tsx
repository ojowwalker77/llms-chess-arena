"use client";

import { useState } from "react";
import { getLabLogo } from "@/lib/ui/logos";

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

function ModelLogo({ openrouterId }: { openrouterId: string }) {
  const logo = getLabLogo(openrouterId);
  if (!logo) return <div className="w-4 h-4 shrink-0 rounded bg-zinc-700" />;
  return <img src={logo} alt="" className="w-4 h-4 shrink-0" />;
}

export function TournamentPairingRow({
  tournamentId,
  whiteModel,
  blackModel,
  match,
}: {
  tournamentId: number;
  whiteModel: ModelInfo | null;
  blackModel: ModelInfo | null;
  match: MatchInfo | null;
}) {
  const [loading, setLoading] = useState(false);

  const resultLabel =
    match?.result === "white"
      ? "1-0"
      : match?.result === "black"
        ? "0-1"
        : match?.result === "draw"
          ? "½-½"
          : null;

  async function handlePlay() {
    if (!whiteModel || !blackModel || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/matches/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whiteModelId: whiteModel.id,
          blackModelId: blackModel.id,
          tournamentId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        window.location.href = `/match/${data.id}`;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  const isCompleted = match?.status === "completed";
  const isRunning = match?.status === "running";

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors">
      {/* White model */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="w-3 h-3 rounded-sm bg-zinc-200 shrink-0" />
        {whiteModel && <ModelLogo openrouterId={whiteModel.openrouterId} />}
        <span className="text-sm font-medium truncate">
          {whiteModel?.name || "?"}
        </span>
      </div>

      <span className="text-zinc-600 text-xs shrink-0">vs</span>

      {/* Black model */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="w-3 h-3 rounded-sm bg-zinc-700 border border-zinc-600 shrink-0" />
        {blackModel && <ModelLogo openrouterId={blackModel.openrouterId} />}
        <span className="text-sm font-medium truncate">
          {blackModel?.name || "?"}
        </span>
      </div>

      {/* Status / Action */}
      <div className="w-24 shrink-0 flex justify-end">
        {isCompleted && match ? (
          <a
            href={`/match/${match.id}`}
            className="flex items-center gap-2 text-sm"
          >
            <span className="font-mono font-bold text-zinc-200">
              {resultLabel}
            </span>
            {match.resultReason && (
              <span className="text-[10px] text-zinc-500 hidden sm:inline">
                {match.resultReason}
              </span>
            )}
          </a>
        ) : isRunning && match ? (
          <a
            href={`/match/${match.id}`}
            className="flex items-center gap-2 text-sm text-amber-400"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            Live
          </a>
        ) : (
          <button
            onClick={handlePlay}
            disabled={loading}
            className="px-3 py-1 text-xs font-medium rounded bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {loading ? "Starting..." : "Play"}
          </button>
        )}
      </div>
    </div>
  );
}
