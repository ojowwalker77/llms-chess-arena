"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface LiveStatus {
  isLive: boolean;
  matchId: number | null;
  tournamentId: number | null;
}

export function LiveIndicator() {
  const [status, setStatus] = useState<LiveStatus | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);

    async function fetchStatus() {
      try {
        const res = await fetch("/api/live-status");
        if (res.ok) {
          setStatus(await res.json());
        }
      } catch {
        // ignore
      }
    }
  }, []);

  if (!status?.isLive) return null;

  const href = status.tournamentId
    ? `/tournaments/${status.tournamentId}/live`
    : status.matchId
      ? `/match/${status.matchId}`
      : "/";

  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      Live
    </Link>
  );
}
