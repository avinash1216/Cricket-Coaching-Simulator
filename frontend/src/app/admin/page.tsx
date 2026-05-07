"use client";

import { useEffect, useState } from "react";
import { startMatch, stopMatch, getAdminStatus, listMatches } from "@/lib/api";
import type { MockMatch } from "@/lib/types";

export default function AdminPage() {
  const [matches, setMatches] = useState<MockMatch[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function fetchData() {
    try {
      const [matchData, statusData] = await Promise.all([
        listMatches(),
        getAdminStatus(),
      ]);
      setMatches(matchData.mock_matches || []);
      setStatus(statusData);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleStart(matchId: string) {
    setActionLoading(matchId);
    setMessage("");
    try {
      const result = await startMatch(matchId);
      setMessage(`✅ ${result.message}`);
      await fetchData();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStop(matchId: string) {
    setActionLoading(matchId);
    setMessage("");
    try {
      await stopMatch(matchId);
      setMessage(`⏹️ Simulation stopped for ${matchId}`);
      await fetchData();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  const runningIds = new Set(
    status?.running_simulations?.map((s: any) => s.match_id) || []
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">⚙️ Admin Panel</h1>
      <p className="text-gray-400 mb-8">
        Control match simulations and monitor system status
      </p>

      {/* Status Message */}
      {message && (
        <div className="glass-card p-4 mb-6">
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Available Matches */}
      <h2 className="text-xl font-semibold mb-4">Available Matches</h2>

      {loading ? (
        <div className="glass-card p-6 animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/2" />
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {matches.map((match) => {
            const isRunning = runningIds.has(match.match_id);
            const isLoading = actionLoading === match.match_id;

            return (
              <div
                key={match.match_id}
                className="glass-card p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {match.team_a} vs {match.team_b}
                  </p>
                  <p className="text-xs text-gray-400">
                    ID: {match.match_id} | {match.total_overs} overs
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isRunning && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                      ● Running
                    </span>
                  )}
                  {isRunning ? (
                    <button
                      onClick={() => handleStop(match.match_id)}
                      disabled={isLoading}
                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                    >
                      {isLoading ? "Stopping..." : "⏹ Stop"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStart(match.match_id)}
                      disabled={isLoading}
                      className="bg-green-500/20 text-green-400 hover:bg-green-500/30 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                    >
                      {isLoading ? "Starting..." : "▶ Start"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Running Simulations Detail */}
      {status?.running_simulations?.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-4">Running Simulations</h2>
          <div className="space-y-3">
            {status.running_simulations.map((sim: any) => (
              <div key={sim.match_id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold">{sim.match_id}</p>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full animate-pulse">
                    ● LIVE
                  </span>
                </div>
                {sim.state && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Score</p>
                      <p className="font-bold">
                        {sim.state.score?.runs}/{sim.state.score?.wickets}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Over</p>
                      <p className="font-bold">
                        {sim.state.over}.{sim.state.ball}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Phase</p>
                      <p className="font-bold capitalize">{sim.state.phase}</p>
                    </div>
                  </div>
                )}
                {sim.open_windows?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-gray-400 mb-2">
                      Open Decision Windows: {sim.open_windows.length}
                    </p>
                    {sim.open_windows.map((w: any) => (
                      <div
                        key={w.event_id}
                        className="text-xs bg-white/5 p-2 rounded mb-1"
                      >
                        {w.decision_type} — {w.options?.length || 0} options
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
