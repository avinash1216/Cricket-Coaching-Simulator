"use client";

import type { MatchState } from "@/lib/types";
import { formatScore, getPhaseLabel, getPhaseColor, getTeamShort, getTeamColor } from "@/lib/utils";

interface ScorecardProps {
  matchState: MatchState;
}

export function Scorecard({ matchState }: ScorecardProps) {
  const {
    team_a,
    team_b,
    score,
    over,
    ball,
    phase,
    current_batters,
    current_bowler,
    bowlers_available,
    toss,
    last_over_summary,
  } = matchState;

  return (
    <div className="glass-card overflow-hidden">
      {/* Team Header */}
      <div className="flex items-stretch">
        <div className={`${getTeamColor(team_a)} flex-1 p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider">Batting</p>
              <p className="text-xl font-bold">{getTeamShort(team_a)}</p>
              <p className="text-sm text-white/80">{team_a}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{formatScore(score)}</p>
              <p className="text-sm text-white/80">
                {over}.{ball} overs
              </p>
            </div>
          </div>
        </div>
        <div className={`${getTeamColor(team_b)} w-24 flex items-center justify-center`}>
          <div className="text-center">
            <p className="text-xs text-white/70">vs</p>
            <p className="text-lg font-bold">{getTeamShort(team_b)}</p>
          </div>
        </div>
      </div>

      {/* Match Info Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-t border-white/10">
        <span className={`text-sm font-medium ${getPhaseColor(phase)}`}>
          {getPhaseLabel(phase)}
        </span>
        <span className="text-xs text-gray-400">{toss}</span>
      </div>

      {/* Current Players */}
      <div className="grid grid-cols-2 gap-4 p-4">
        {/* Batters */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
            🏏 At the Crease
          </p>
          {current_batters.map((batter, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-1"
            >
              <span className="text-sm">{batter}</span>
              {i === 0 && (
                <span className="text-xs text-cricket-gold">*</span>
              )}
            </div>
          ))}
        </div>

        {/* Current Bowler */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
            🎳 Bowling
          </p>
          <p className="text-sm">{current_bowler || "—"}</p>
        </div>
      </div>

      {/* Last Over Summary */}
      {last_over_summary && (
        <div className="px-4 py-2 bg-white/5 border-t border-white/10">
          <p className="text-xs text-gray-400">
            Last over ({last_over_summary.bowler}):{" "}
            <span className="text-white font-medium">
              {last_over_summary.runs} runs
            </span>
            {last_over_summary.wickets > 0 && (
              <span className="text-red-400 ml-1">
                {last_over_summary.wickets}W
              </span>
            )}
          </p>
        </div>
      )}

      {/* Bowlers Available */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
          Available Bowlers
        </p>
        <div className="flex flex-wrap gap-2">
          {bowlers_available.map((b) => (
            <span
              key={b.name}
              className="text-xs bg-white/10 px-2 py-1 rounded"
              title={`${b.bowler_type} | ${b.overs_left} overs left | Econ: ${b.economy}`}
            >
              {b.name.split(" ").pop()} ({b.overs_left})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
