"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getLeaderboard } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import type { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardPage() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match") || "mock-mi-vs-csk-2024";
  const { userId } = useAuth();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const data = await getLeaderboard(matchId);
        setEntries(data.entries || []);
      } catch (err: any) {
        setError(err.message || "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
    // Refresh every 10 seconds
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, [matchId]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">🏆 Leaderboard</h1>
      <p className="text-gray-400 mb-8">Match: {matchId}</p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-center">
          <p className="text-red-400">⚠️ {error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <p className="text-gray-400">No scores yet. Join a match and make some decisions!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const isMe = entry.user_id === userId;
            return (
              <div
                key={entry.user_id}
                className={`glass-card p-4 flex items-center gap-4 ${
                  isMe ? "border-cricket-gold/50 bg-cricket-gold/5" : ""
                }`}
              >
                {/* Rank */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    i === 0
                      ? "bg-yellow-500 text-black text-lg"
                      : i === 1
                      ? "bg-gray-300 text-black"
                      : i === 2
                      ? "bg-amber-700 text-white"
                      : "bg-white/10 text-gray-400"
                  }`}
                >
                  {i + 1}
                </div>

                {/* Avatar + Name */}
                <div className="flex items-center gap-3 flex-1">
                  {entry.photo_url ? (
                    <img
                      src={entry.photo_url}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">
                      {entry.display_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className={`font-semibold ${isMe ? "text-cricket-gold" : ""}`}>
                      {entry.display_name}
                      {isMe && " (You)"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {entry.decisions_made} decisions made
                    </p>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className="text-2xl font-bold">{entry.total_points}</p>
                  <p className="text-xs text-gray-400">points</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
