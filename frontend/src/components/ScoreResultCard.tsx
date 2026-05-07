"use client";

import type { ScoreResult } from "@/lib/types";
import { getMeritColor, getMeritEmoji } from "@/lib/utils";

interface ScoreResultCardProps {
  result: ScoreResult;
}

export function ScoreResultCard({ result }: ScoreResultCardProps) {
  const meritColor = getMeritColor(result.merit_level);
  const meritEmoji = getMeritEmoji(result.merit_level);

  return (
    <div className="glass-card overflow-hidden animate-bounce-in border-cricket-gold/30">
      {/* Header */}
      <div className="bg-cricket-gold/10 px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">
            {result.decision_type === "bowling_change"
              ? "🎳 Bowling Decision"
              : "🏟️ Field Placement"}
          </span>
          <span className={`text-2xl font-bold ${meritColor}`}>
            {result.total_points} pts
          </span>
        </div>
      </div>

      {/* Captain Comparison */}
      <div className="px-4 py-3 bg-white/5">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-400 mb-1">Your Choice</p>
            <p className="text-sm font-medium">{result.choice}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Captain&apos;s Choice</p>
            <p className="text-sm font-medium">{result.captain_choice}</p>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Captain Match</span>
          <span className="font-medium">
            {result.captain_match_score}/30
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1.5">
          <div
            className="bg-blue-400 h-1.5 rounded-full transition-all"
            style={{ width: `${(result.captain_match_score / 30) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">AI Merit Score</span>
          <span className="font-medium">
            {result.gemini_merit_score}/50
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1.5">
          <div
            className="bg-purple-400 h-1.5 rounded-full transition-all"
            style={{ width: `${(result.gemini_merit_score / 50) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Speed Bonus</span>
          <span className="font-medium">{result.speed_bonus}/10</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Streak Bonus</span>
          <span className="font-medium">{result.streak_bonus}/10</span>
        </div>
      </div>

      {/* Merit Level */}
      <div className="px-4 py-3 bg-white/5 border-t border-white/10 text-center">
        <span className={`text-lg font-bold ${meritColor}`}>
          {meritEmoji} {result.merit_level.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
