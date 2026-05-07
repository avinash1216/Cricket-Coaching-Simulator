"""Scoring Engine — evaluates fan decisions using Gemini AI + rules."""

from __future__ import annotations

import json
import logging
from typing import Optional

import google.generativeai as genai

from config import settings
from services import firestore_client as db
from services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

# Configure Gemini
_gemini_configured = False


def _ensure_gemini() -> None:
    """Lazy-configure the Gemini API."""
    global _gemini_configured
    if not _gemini_configured and settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_configured = True


def _get_gemini_model():
    """Get the Gemini generative model."""
    _ensure_gemini()
    return genai.GenerativeModel(settings.GEMINI_MODEL)


async def score_decision(submission: dict) -> dict:
    """Score a fan's decision and return updated submission with scores.

    Scoring formula:
        Total = Captain Match (0-30) + Gemini Merit (0-50) + Speed (0-10) + Streak (0-10)
        Max possible: 100 points
    """
    # 1. Captain Match Score
    captain_match_score = _calculate_captain_match(submission)

    # 2. Gemini Merit Score
    gemini_merit_score, merit_level = await _calculate_gemini_merit(submission)

    # 3. Speed Bonus
    speed_bonus = _calculate_speed_bonus(submission["response_time_ms"])

    # 4. Streak Bonus
    streak_bonus = await _calculate_streak_bonus(submission["user_id"])

    # Total
    total_points = captain_match_score + gemini_merit_score + speed_bonus + streak_bonus

    # Update submission
    submission["captain_match_score"] = captain_match_score
    submission["gemini_merit_score"] = gemini_merit_score
    submission["speed_bonus"] = speed_bonus
    submission["streak_bonus"] = streak_bonus
    submission["total_points"] = total_points
    submission["merit_level"] = merit_level

    # Update in Firestore
    if "id" in submission:
        try:
            from google.cloud import firestore as fs
            db_client = db.get_db()
            await db_client.collection("fan_decisions").document(submission["id"]).update({
                "captain_match_score": captain_match_score,
                "gemini_merit_score": gemini_merit_score,
                "speed_bonus": speed_bonus,
                "streak_bonus": streak_bonus,
                "total_points": total_points,
                "merit_level": merit_level,
            })
        except Exception as e:
            logger.error("Failed to update decision scores in Firestore: %s", e)

    # Update leaderboard
    await _update_leaderboard(submission)

    # Send score to the specific user
    await ws_manager.send_to_user(
        submission["match_id"],
        submission["user_id"],
        "SCORE_RESULT",
        {
            "event_id": submission["event_id"],
            "decision_type": submission["decision_type"],
            "choice": submission.get("choice_label", submission["choice"]),
            "captain_choice": submission.get("captain_choice", ""),
            "captain_match_score": captain_match_score,
            "gemini_merit_score": gemini_merit_score,
            "speed_bonus": speed_bonus,
            "streak_bonus": streak_bonus,
            "total_points": total_points,
            "merit_level": merit_level,
        },
    )

    return submission


def _calculate_captain_match(submission: dict) -> int:
    """Calculate captain match score (0, 15, or 30)."""
    choice = submission["choice"]
    captain = submission.get("captain_choice", "")

    if not captain:
        return 0

    decision_type = submission.get("decision_type", "")

    if decision_type == "bowling_change":
        # For bowling: need to match by label (bowler name)
        choice_label = submission.get("choice_label", "").lower()
        captain_lower = captain.lower()

        if choice_label == captain_lower:
            return 30
        # Check if same type (both pace or both spin) — partial match
        # This would need bowler type info; for simplicity, give 15 if partial
        return 0

    elif decision_type == "field_placement":
        if choice == captain:
            return 30
        # Adjacent templates get partial credit
        templates = ["attacking", "balanced", "defensive"]
        if choice in templates and captain in templates:
            choice_idx = templates.index(choice)
            captain_idx = templates.index(captain)
            if abs(choice_idx - captain_idx) == 1:
                return 15
        return 0

    return 0


async def _calculate_gemini_merit(submission: dict) -> tuple[int, str]:
    """Use Gemini to evaluate tactical merit. Returns (score, merit_level)."""
    if not settings.GEMINI_API_KEY:
        # Fallback: rule-based scoring if no Gemini key
        return _fallback_merit_score(submission)

    try:
        model = _get_gemini_model()
        context = submission.get("context", {}) if "context" in submission else {}

        # Build the prompt
        prompt = _build_scoring_prompt(submission, context)

        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                max_output_tokens=200,
                response_mime_type="application/json",
            ),
        )

        # Parse response
        result = json.loads(response.text)
        score = max(0, min(50, int(result.get("score", 25))))
        merit_level = result.get("merit_level", "average")

        if merit_level not in ("excellent", "good", "average", "poor"):
            merit_level = "average"

        logger.info("Gemini scored decision %s: %d (%s)",
                     submission["event_id"], score, merit_level)
        return score, merit_level

    except Exception as e:
        logger.error("Gemini scoring failed: %s", e)
        return _fallback_merit_score(submission)


def _build_scoring_prompt(submission: dict, context: dict) -> str:
    """Build the Gemini scoring prompt."""
    decision_type = submission.get("decision_type", "bowling_change")
    choice_label = submission.get("choice_label", submission["choice"])
    captain_choice = submission.get("captain_choice", "unknown")

    if decision_type == "bowling_change":
        return f"""You are a cricket tactical analyst. Rate this T20 cricket decision on tactical merit.

MATCH STATE:
- Over just completed: {context.get('over', '?')}
- Phase: {context.get('phase', '?')}
- Score: {context.get('score', '?')}
- Current batters: {context.get('current_batters', '?')}
- Previous bowler: {context.get('current_bowler', '?')}

DECISION: Who should bowl the next over?
Fan chose: {choice_label}
Captain chose: {captain_choice}

Rate the fan's choice on tactical merit from 0 to 50. Consider:
- Bowler-batter matchups in T20 cricket
- Phase of the game (powerplay/middle/death)
- Typical T20 bowling strategies

Respond ONLY with valid JSON: {{"score": <0-50>, "merit_level": "<excellent|good|average|poor>"}}"""

    elif decision_type == "field_placement":
        return f"""You are a cricket tactical analyst. Rate this T20 field placement decision.

MATCH STATE:
- Over just completed: {context.get('over', '?')}
- Phase: {context.get('phase', '?')}
- Score: {context.get('score', '?')}
- Current batters: {context.get('current_batters', '?')}

DECISION: What field template to set?
Fan chose: {choice_label}
Captain chose: {captain_choice}

Options were: Attacking (close catchers, slips), Balanced (standard T20), Defensive (boundary riders)

Rate the fan's choice on tactical merit from 0 to 50. Consider:
- Match situation and required run rate
- Phase of the game
- Typical T20 field strategies

Respond ONLY with valid JSON: {{"score": <0-50>, "merit_level": "<excellent|good|average|poor>"}}"""

    return ""


def _fallback_merit_score(submission: dict) -> tuple[int, str]:
    """Rule-based fallback scoring when Gemini is unavailable."""
    captain_choice = submission.get("captain_choice", "")
    choice = submission.get("choice_label", submission["choice"])

    if choice.lower() == captain_choice.lower():
        return 45, "excellent"
    elif submission.get("decision_type") == "field_placement":
        # Adjacent template
        templates = ["attacking", "balanced", "defensive"]
        if submission["choice"] in templates and captain_choice in templates:
            ci = templates.index(submission["choice"])
            cc = templates.index(captain_choice)
            if abs(ci - cc) == 1:
                return 30, "good"
        return 15, "average"
    else:
        return 20, "average"


def _calculate_speed_bonus(response_time_ms: int) -> int:
    """Calculate speed bonus based on response time."""
    if response_time_ms <= 10000:
        return 10
    elif response_time_ms <= 20000:
        return 5
    else:
        return 0


async def _calculate_streak_bonus(user_id: str) -> int:
    """Calculate streak bonus — 10 points if last 3 decisions were excellent/good."""
    try:
        recent = await db.get_recent_user_decisions(user_id, limit=3)
        if len(recent) >= 3:
            all_good = all(
                d.get("merit_level") in ("excellent", "good")
                for d in recent
            )
            if all_good:
                return 10
    except Exception as e:
        logger.error("Failed to check streak: %s", e)
    return 0


async def _update_leaderboard(submission: dict) -> None:
    """Update the leaderboard after scoring a decision."""
    match_id = submission["match_id"]
    user_id = submission["user_id"]
    points = submission["total_points"]

    try:
        # Get current leaderboard entry
        entry = await db.get_user_leaderboard_entry(match_id, user_id)

        if entry:
            new_total = entry.get("total_points", 0) + points
            new_count = entry.get("decisions_made", 0) + 1
        else:
            new_total = points
            new_count = 1

        # Get user display name
        user = await db.get_user(user_id)
        display_name = user.get("display_name", "Anonymous") if user else "Anonymous"
        photo_url = user.get("photo_url", "") if user else ""

        await db.update_leaderboard(match_id, user_id, {
            "display_name": display_name,
            "photo_url": photo_url,
            "total_points": new_total,
            "decisions_made": new_count,
            "updated_at": submission["created_at"],
        })

        # Update season points
        await db.update_season_points(user_id, points)

        # Broadcast leaderboard update
        leaderboard = await db.get_leaderboard(match_id, limit=20)
        await ws_manager.broadcast(match_id, "LEADERBOARD_UPDATE", {
            "top_20": leaderboard,
        })

    except Exception as e:
        logger.error("Failed to update leaderboard: %s", e)
