"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useWebSocket } from "@/lib/useWebSocket";
import { Scorecard } from "@/components/Scorecard";
import { Commentary } from "@/components/Commentary";
import { DecisionPanel } from "@/components/DecisionPanel";
import { ScoreResultCard } from "@/components/ScoreResultCard";
import { MiniLeaderboard } from "@/components/MiniLeaderboard";
import type {
  MatchState,
  BallEvent,
  DecisionWindow,
  ScoreResult,
  LeaderboardEntry,
  WSEvent,
} from "@/lib/types";

export default function MatchPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  const { userId, userName, user } = useAuth();

  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [commentary, setCommentary] = useState<BallEvent[]>([]);
  const [activeWindows, setActiveWindows] = useState<DecisionWindow[]>([]);
  const [submittedWindows, setSubmittedWindows] = useState<Set<string>>(new Set());
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [matchComplete, setMatchComplete] = useState(false);

  const handleEvent = useCallback(
    (event: WSEvent) => {
      switch (event.type) {
        case "MATCH_STATE":
          setMatchState(event.data);
          break;

        case "BALL_UPDATE":
          setMatchState(event.data.match_state);
          if (event.data.commentary) {
            setCommentary(event.data.commentary);
          }
          break;

        case "OVER_END":
          setMatchState(event.data.match_state);
          break;

        case "DECISION_WINDOW_OPEN":
          setActiveWindows((prev) => {
            // Avoid duplicates
            if (prev.find((w) => w.event_id === event.data.event_id)) return prev;
            return [...prev, event.data];
          });
          break;

        case "DECISION_WINDOW_CLOSED":
          setActiveWindows((prev) =>
            prev.filter((w) => w.event_id !== event.data.event_id)
          );
          break;

        case "DECISION_SUBMITTED":
          setSubmittedWindows((prev) => { const next = new Set(Array.from(prev)); next.add(event.data.event_id); return next; });
          break;

        case "SCORE_RESULT":
          setScoreResult(event.data);
          // Auto-dismiss after 8 seconds
          setTimeout(() => setScoreResult(null), 8000);
          break;

        case "LEADERBOARD_UPDATE":
          setLeaderboard(event.data.top_20 || []);
          break;

        case "MATCH_COMPLETE":
          setMatchState(event.data.match_state);
          setMatchComplete(true);
          break;
      }
    },
    []
  );

  const { isConnected, submitDecision } = useWebSocket({
    matchId,
    userId,
    userName,
    onEvent: handleEvent,
  });

  const handleDecisionSubmit = useCallback(
    (eventId: string, choice: string) => {
      submitDecision(eventId, choice);
      setSubmittedWindows((prev) => { const next = new Set(Array.from(prev)); next.add(eventId); return next; });
    },
    [submitDecision]
  );

  // Filter windows to only show ones not yet submitted
  const pendingWindows = activeWindows.filter(
    (w) => !submittedWindows.has(w.event_id)
  );

  if (!matchState) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🏏</div>
          <p className="text-gray-400">
            {isConnected
              ? "Waiting for match to start..."
              : "Connecting to match..."}
          </p>
          <p className="text-sm text-gray-500 mt-2">Match ID: {matchId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-green-400 live-pulse" : "bg-red-400"
          }`}
        />
        <span className="text-xs text-gray-400">
          {isConnected ? "Live" : "Reconnecting..."}
        </span>
        {matchState.status === "live" && (
          <span className="ml-2 bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full animate-pulse">
            ● LIVE
          </span>
        )}
        {matchComplete && (
          <span className="ml-2 bg-gray-500/20 text-gray-400 text-xs px-2 py-0.5 rounded-full">
            Match Complete
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Scorecard + Commentary */}
        <div className="lg:col-span-2 space-y-4">
          <Scorecard matchState={matchState} />
          <Commentary entries={commentary} />
        </div>

        {/* Right Column: Decisions + Leaderboard */}
        <div className="space-y-4">
          {/* Score Result Popup */}
          {scoreResult && <ScoreResultCard result={scoreResult} />}

          {/* Decision Windows */}
          {pendingWindows.length > 0 && (
            <div className="space-y-4">
              {pendingWindows.map((window) => (
                <DecisionPanel
                  key={window.event_id}
                  window={window}
                  onSubmit={handleDecisionSubmit}
                  disabled={!user}
                />
              ))}
            </div>
          )}

          {/* Submitted indicator */}
          {activeWindows.length > 0 &&
            pendingWindows.length === 0 &&
            activeWindows.some((w) => submittedWindows.has(w.event_id)) && (
              <div className="glass-card p-4 text-center">
                <p className="text-green-400 text-sm">
                  ✅ Decision submitted! Waiting for results...
                </p>
              </div>
            )}

          {/* Mini Leaderboard */}
          <MiniLeaderboard
            entries={leaderboard}
            currentUserId={userId}
            matchId={matchId}
          />
        </div>
      </div>
    </div>
  );
}
