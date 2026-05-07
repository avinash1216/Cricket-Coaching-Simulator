// ── Match Types ───────────────────────────────────────────────────────

export interface Score {
  runs: number;
  wickets: number;
}

export interface BowlerInfo {
  name: string;
  bowler_type: "pace" | "spin";
  overs_bowled: number;
  overs_left: number;
  economy: number;
  wickets: number;
}

export interface BallEvent {
  over: number;
  ball: number;
  runs: number;
  extras: number;
  wicket: boolean;
  batter: string;
  bowler: string;
  commentary: string;
  score: string;
}

export interface OverSummary {
  over: number;
  bowler: string;
  runs: number;
  wickets: number;
}

export interface MatchState {
  match_id: string;
  team_a: string;
  team_b: string;
  status: "scheduled" | "live" | "completed";
  innings: number;
  over: number;
  ball: number;
  score: Score;
  target: number | null;
  required: { runs: number; balls: number } | null;
  current_batters: string[];
  current_bowler: string;
  phase: "powerplay" | "middle" | "death";
  bowlers_available: BowlerInfo[];
  toss: string;
  updated_at: string;
  last_over_summary?: OverSummary;
}

export interface MockMatch {
  match_id: string;
  team_a: string;
  team_b: string;
  toss: string;
  total_overs: number;
}

// ── Decision Types ────────────────────────────────────────────────────

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  stats?: Record<string, number | string>;
}

export interface DecisionWindow {
  event_id: string;
  match_id: string;
  decision_type: "bowling_change" | "field_placement";
  options: DecisionOption[];
  window_duration: number;
  window_closes_at: string;
  context: {
    over: number;
    phase: string;
    score: Score;
    current_bowler: string;
    current_batters: string[];
  };
}

export interface ScoreResult {
  event_id: string;
  decision_type: string;
  choice: string;
  captain_choice: string;
  captain_match_score: number;
  gemini_merit_score: number;
  speed_bonus: number;
  streak_bonus: number;
  total_points: number;
  merit_level: "excellent" | "good" | "average" | "poor" | "pending";
}

// ── Leaderboard Types ─────────────────────────────────────────────────

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  photo_url: string;
  total_points: number;
  decisions_made: number;
  rank?: number;
}

// ── WebSocket Event Types ─────────────────────────────────────────────

export type WSEventType =
  | "MATCH_STATE"
  | "BALL_UPDATE"
  | "OVER_END"
  | "DECISION_WINDOW_OPEN"
  | "DECISION_WINDOW_CLOSED"
  | "DECISION_SUBMITTED"
  | "SCORE_RESULT"
  | "LEADERBOARD_UPDATE"
  | "MATCH_COMPLETE"
  | "ERROR"
  | "PONG";

export interface WSEvent {
  type: WSEventType;
  data: any;
}

// ── User Types ────────────────────────────────────────────────────────

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
