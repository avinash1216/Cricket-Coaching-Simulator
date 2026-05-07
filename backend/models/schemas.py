"""Pydantic models for API request/response schemas."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────────────

class MatchStatus(str, Enum):
    UPCOMING = "upcoming"
    LIVE = "live"
    COMPLETED = "completed"


class MatchPhase(str, Enum):
    POWERPLAY = "powerplay"
    MIDDLE = "middle"
    DEATH = "death"


class DecisionType(str, Enum):
    BOWLING_CHANGE = "bowling_change"
    FIELD_PLACEMENT = "field_placement"


class WindowStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    SCORED = "scored"


class MeritLevel(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    AVERAGE = "average"
    POOR = "poor"


class FieldTemplate(str, Enum):
    ATTACKING = "attacking"
    BALANCED = "balanced"
    DEFENSIVE = "defensive"


# ── Match Models ───────────────────────────────────────────────────────

class Score(BaseModel):
    runs: int = 0
    wickets: int = 0


class RequiredRuns(BaseModel):
    runs: int = 0
    balls: int = 0
    rr: float = 0.0


class BowlerInfo(BaseModel):
    name: str
    bowler_type: str = "pace"
    overs_bowled: int = 0
    overs_left: int = 4
    economy: float = 0.0
    wickets: int = 0


class BallEvent(BaseModel):
    ball: int
    runs: int = 0
    extras: int = 0
    wicket: bool = False
    batter: str = ""
    commentary: str = ""


class OverData(BaseModel):
    over_number: int
    bowler: str
    balls: list[BallEvent] = []
    captain_next_bowler: str = ""
    captain_field_template: str = "balanced"


class MatchState(BaseModel):
    match_id: str
    team_a: str
    team_b: str
    status: MatchStatus = MatchStatus.UPCOMING
    innings: int = 1
    over: int = 0
    ball: int = 0
    score: Score = Score()
    target: Optional[int] = None
    required: Optional[RequiredRuns] = None
    current_batters: list[str] = []
    current_bowler: str = ""
    phase: MatchPhase = MatchPhase.POWERPLAY
    bowlers_available: list[BowlerInfo] = []
    toss: str = ""
    updated_at: Optional[str] = None


# ── Decision Models ────────────────────────────────────────────────────

class DecisionOption(BaseModel):
    id: str
    label: str
    description: str = ""
    stats: dict = {}


class DecisionWindow(BaseModel):
    event_id: str
    match_id: str
    decision_type: DecisionType
    status: WindowStatus = WindowStatus.OPEN
    options: list[DecisionOption] = []
    window_opens_at: str = ""
    window_closes_at: str = ""
    captain_choice: Optional[str] = None
    context: dict = {}


class DecisionSubmission(BaseModel):
    event_id: str
    choice: str
    timestamp: Optional[float] = None


class FanDecisionResult(BaseModel):
    user_id: str
    match_id: str
    event_id: str
    decision_type: str
    choice: str
    response_time_ms: int = 0
    captain_match_score: int = 0
    gemini_merit_score: int = 0
    speed_bonus: int = 0
    streak_bonus: int = 0
    total_points: int = 0
    merit_level: str = "average"
    captain_choice: str = ""


# ── Leaderboard Models ────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    user_id: str
    display_name: str
    photo_url: str = ""
    total_points: int = 0
    decisions_made: int = 0
    rank: int = 0


class LeaderboardResponse(BaseModel):
    match_id: str
    entries: list[LeaderboardEntry] = []
    user_rank: Optional[LeaderboardEntry] = None


# ── User Models ────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    uid: str
    display_name: str = ""
    email: str = ""
    photo_url: str = ""
    total_season_points: int = 0
    matches_played: int = 0


# ── WebSocket Event Models ────────────────────────────────────────────

class WSEvent(BaseModel):
    type: str
    data: dict = {}


# ── Admin Models ───────────────────────────────────────────────────────

class StartMatchRequest(BaseModel):
    match_id: str = "mock-mi-vs-csk-2024"


class TriggerDecisionRequest(BaseModel):
    match_id: str
    decision_type: DecisionType = DecisionType.BOWLING_CHANGE


class SetCaptainChoiceRequest(BaseModel):
    event_id: str
    captain_choice: str


# ── Mock Match Data Model ─────────────────────────────────────────────

class MockMatchData(BaseModel):
    match_id: str
    team_a: str
    team_b: str
    toss: str
    squad_a: list[str] = []
    squad_b: list[str] = []
    bowlers_a: list[BowlerInfo] = []
    bowlers_b: list[BowlerInfo] = []
    batters_a: list[str] = []
    batters_b: list[str] = []
    overs: list[OverData] = []
    target: Optional[int] = None
