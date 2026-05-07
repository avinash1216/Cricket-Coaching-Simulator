"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listMatches } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { signInWithGoogle } from "@/lib/firebase";
import { getTeamShort, getTeamColor } from "@/lib/utils";
import type { MockMatch } from "@/lib/types";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<MockMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMatches() {
      try {
        const data = await listMatches();
        setMatches(data.mock_matches || []);
      } catch (err: any) {
        setError(err.message || "Failed to load matches");
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🏏</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          🏏 Cricket Coaching Simulator
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Be the virtual coach! Make tactical decisions during live IPL matches,
          get scored by AI, and compete on the leaderboard.
        </p>

        {!user && (
          <button
            onClick={() => signInWithGoogle()}
            className="mt-6 bg-cricket-gold text-black font-semibold px-6 py-3 rounded-lg hover:bg-yellow-400 transition flex items-center gap-2 mx-auto"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google to Play
          </button>
        )}
      </div>

      {/* How It Works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div className="glass-card p-6 text-center">
          <div className="text-3xl mb-3">📺</div>
          <h3 className="font-semibold mb-2">Watch Live</h3>
          <p className="text-sm text-gray-400">
            Follow ball-by-ball action with live commentary
          </p>
        </div>
        <div className="glass-card p-6 text-center">
          <div className="text-3xl mb-3">🎯</div>
          <h3 className="font-semibold mb-2">Make Decisions</h3>
          <p className="text-sm text-gray-400">
            Choose the next bowler and field placement every over
          </p>
        </div>
        <div className="glass-card p-6 text-center">
          <div className="text-3xl mb-3">🏆</div>
          <h3 className="font-semibold mb-2">Compete</h3>
          <p className="text-sm text-gray-400">
            Get scored by Gemini AI and climb the leaderboard
          </p>
        </div>
      </div>

      {/* Match List */}
      <h2 className="text-2xl font-bold mb-6">Available Matches</h2>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-1/2 mb-3" />
              <div className="h-4 bg-gray-700 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-center">
          <p className="text-red-400 mb-2">⚠️ {error}</p>
          <p className="text-sm text-gray-500">
            Make sure the backend is running at{" "}
            {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}
          </p>
        </div>
      ) : matches.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <p className="text-gray-400">No matches available yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Go to the Admin page to start a simulation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Link
              key={match.match_id}
              href={`/match/${match.match_id}`}
              className="glass-card p-6 block hover:bg-white/10 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`${getTeamColor(match.team_a)} text-white px-2 py-1 rounded text-sm font-bold`}
                    >
                      {getTeamShort(match.team_a)}
                    </span>
                    <span className="text-gray-500 text-sm">vs</span>
                    <span
                      className={`${getTeamColor(match.team_b)} text-white px-2 py-1 rounded text-sm font-bold`}
                    >
                      {getTeamShort(match.team_b)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">
                      {match.team_a} vs {match.team_b}
                    </p>
                    <p className="text-sm text-gray-400">{match.toss}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">
                    {match.total_overs} overs
                  </p>
                  <span className="text-cricket-gold group-hover:translate-x-1 transition-transform inline-block">
                    Join →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
