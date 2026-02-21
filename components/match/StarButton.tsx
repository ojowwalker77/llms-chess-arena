"use client";

import { useState } from "react";

export function StarButton({
  matchId,
  initialStarred,
}: {
  matchId: number;
  initialStarred: boolean;
}) {
  const [starred, setStarred] = useState(initialStarred);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/star`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setStarred(data.starred);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-2xl transition-transform hover:scale-110 ${
        loading ? "opacity-50" : ""
      }`}
      title={starred ? "Unstar match" : "Star match"}
    >
      {starred ? "★" : "☆"}
    </button>
  );
}
