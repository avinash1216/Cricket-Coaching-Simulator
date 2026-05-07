"use client";

import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/types";

interface MiniLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  matchId: string;
}

export function MiniLeaderboard({ entries, currentUserId, matchId }: MiniLeaderboardProps) {
  const top5 = entries.slice(0, 5);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-semibold">🏆 Leaderboard</span>
        <Link
          href={`/leaderboard?match=${matchId}`}
          className="text-xs text-cricket-gold hover:underline"
        >
          View All →
        </Link>
      </div>

      {top5.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-sm text-gray-500">No scores yet</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {top5.map((entry, i) => {
            const isMe = entry.user_id === currentUserId;
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  isMe ? "bg-cricket-gold/10" : ""
                }`}
              >
                {/* Rank */}
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0
                      ? "bg-yellow-500 text-black"
                      : i === 1
                      ? "bg-gray-300 text-black"
                      : i === 2
                      ? "bg-amber-700 text-white"
                      : "bg-white/10"
                  }`}
                >
                  {i + 1}
                </span>

                {/* Avatar + Name */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {entry.photo_url ? (
                    <img
                      src={entry.photo_url}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                      {entry.display_name.charAt(0)}
                    </div>
                  )}
                  <span className={`text-sm truncate ${isMe ? "font-bold text-cricket-gold" : ""}`}>
                    {entry.display_name}
                    {isMe && " (You)"}
                  </span>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className="text-sm font-bold">{entry.total_points}</p>
                  <p className="text-xs text-gray-500">{entry.decisions_made}d</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
