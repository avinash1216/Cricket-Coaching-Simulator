"use client";

import { useState, useEffect } from "react";
import type { DecisionWindow } from "@/lib/types";

interface DecisionPanelProps {
  window: DecisionWindow;
  onSubmit: (eventId: string, choice: string) => void;
  disabled?: boolean;
}

export function DecisionPanel({ window: decisionWindow, onSubmit, disabled }: DecisionPanelProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(decisionWindow.window_duration);
  const [submitted, setSubmitted] = useState(false);

  // Countdown timer
  useEffect(() => {
    const closesAt = new Date(decisionWindow.window_closes_at).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((closesAt - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [decisionWindow.window_closes_at]);

  const handleSubmit = () => {
    if (!selectedChoice || submitted || disabled) return;
    setSubmitted(true);
    onSubmit(decisionWindow.event_id, selectedChoice);
  };

  const isExpired = timeLeft <= 0;
  const urgencyColor =
    timeLeft <= 5
      ? "text-red-400"
      : timeLeft <= 10
      ? "text-yellow-400"
      : "text-green-400";

  const isBowling = decisionWindow.decision_type === "bowling_change";
  const title = isBowling ? "🎳 Choose Next Bowler" : "🏟️ Set Field Placement";
  const icon = isBowling ? "🎳" : "🏟️";

  return (
    <div
      className={`glass-card overflow-hidden animate-slide-in ${
        isExpired ? "opacity-50" : ""
      } ${timeLeft <= 5 && !isExpired ? "border-red-500/50" : ""}`}
    >
      {/* Header with countdown */}
      <div className="flex items-center justify-between px-4 py-3 bg-cricket-gold/10 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Countdown circle */}
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke={timeLeft <= 5 ? "#ef4444" : timeLeft <= 10 ? "#eab308" : "#22c55e"}
                strokeWidth="2"
                strokeDasharray="94.2"
                strokeDashoffset={94.2 * (1 - timeLeft / decisionWindow.window_duration)}
                strokeLinecap="round"
                className="transition-all duration-100"
              />
            </svg>
            <span
              className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${urgencyColor}`}
            >
              {timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Context */}
      <div className="px-4 py-2 bg-white/5 text-xs text-gray-400 flex gap-4">
        <span>Over {decisionWindow.context.over}</span>
        <span>{decisionWindow.context.phase}</span>
        <span>
          {decisionWindow.context.score.runs}/{decisionWindow.context.score.wickets}
        </span>
      </div>

      {/* Options */}
      <div className="p-4 space-y-2">
        {decisionWindow.options.map((option) => (
          <button
            key={option.id}
            onClick={() => !submitted && !isExpired && setSelectedChoice(option.id)}
            disabled={submitted || isExpired || disabled}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              selectedChoice === option.id
                ? "border-cricket-gold bg-cricket-gold/10"
                : "border-white/10 hover:border-white/30 hover:bg-white/5"
            } ${submitted || isExpired ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    selectedChoice === option.id
                      ? "bg-cricket-gold text-black"
                      : "bg-white/10"
                  }`}
                >
                  {option.id}
                </span>
                <div>
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-gray-400">{option.description}</p>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <div className="px-4 pb-4">
        {disabled ? (
          <p className="text-center text-xs text-gray-500">
            Sign in to make decisions
          </p>
        ) : submitted ? (
          <div className="text-center text-sm text-green-400">
            ✅ Submitted! Waiting for results...
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!selectedChoice || isExpired}
            className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${
              selectedChoice && !isExpired
                ? "bg-cricket-gold text-black hover:bg-yellow-400"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isExpired
              ? "⏰ Time's Up!"
              : selectedChoice
              ? "Submit Decision"
              : "Select an option"}
          </button>
        )}
      </div>
    </div>
  );
}
