"use client";

import type { BallEvent } from "@/lib/types";

interface CommentaryProps {
  entries: BallEvent[];
}

export function Commentary({ entries }: CommentaryProps) {
  if (entries.length === 0) {
    return (
      <div className="glass-card p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
          📝 Commentary
        </p>
        <p className="text-sm text-gray-500">Waiting for play to begin...</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
        📝 Live Commentary
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {[...entries].reverse().map((entry, i) => (
          <div
            key={`${entry.over}-${entry.ball}-${i}`}
            className={`flex items-start gap-3 py-2 ${
              i === 0 ? "animate-slide-in" : ""
            } ${i > 0 ? "border-t border-white/5" : ""}`}
          >
            {/* Over.Ball badge */}
            <span className="text-xs bg-white/10 px-2 py-1 rounded font-mono min-w-[3rem] text-center">
              {entry.over}.{entry.ball}
            </span>

            {/* Event indicators */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                {entry.wicket && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold wicket-shake">
                    W
                  </span>
                )}
                {entry.runs === 4 && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">
                    4
                  </span>
                )}
                {entry.runs === 6 && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold score-flash">
                    6
                  </span>
                )}
                {entry.extras > 0 && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                    +{entry.extras}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {entry.score}
                </span>
              </div>
              <p className="text-sm text-gray-300">{entry.commentary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
