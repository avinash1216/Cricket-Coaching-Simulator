const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function fetchAPI(path: string, options: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// ── Match APIs ────────────────────────────────────────────────────────

export async function listMatches() {
  return fetchAPI("/api/matches");
}

export async function getMatch(matchId: string) {
  return fetchAPI(`/api/matches/${matchId}`);
}

export async function getMatchDecisions(matchId: string) {
  return fetchAPI(`/api/matches/${matchId}/decisions`);
}

// ── Decision APIs ─────────────────────────────────────────────────────

export async function submitDecision(
  eventId: string,
  choice: string,
  userId: string,
  userName: string
) {
  return fetchAPI("/api/decisions/submit", {
    method: "POST",
    headers: {
      "x-user-id": userId,
      "x-user-name": userName,
    },
    body: JSON.stringify({
      event_id: eventId,
      choice: choice,
    }),
  });
}

export async function getUserDecisions(matchId: string, userId: string) {
  return fetchAPI(`/api/decisions/history/${matchId}`, {
    headers: { "x-user-id": userId },
  });
}

export async function getOpenWindows(matchId: string) {
  return fetchAPI(`/api/decisions/windows/${matchId}`);
}

// ── Leaderboard APIs ──────────────────────────────────────────────────

export async function getLeaderboard(matchId: string, limit = 100) {
  return fetchAPI(`/api/leaderboard/${matchId}?limit=${limit}`);
}

export async function getMyRank(matchId: string, userId: string) {
  return fetchAPI(`/api/leaderboard/${matchId}/me`, {
    headers: { "x-user-id": userId },
  });
}

// ── Admin APIs ────────────────────────────────────────────────────────

export async function startMatch(matchId: string) {
  return fetchAPI("/api/admin/start-match", {
    method: "POST",
    body: JSON.stringify({ match_id: matchId }),
  });
}

export async function stopMatch(matchId: string) {
  return fetchAPI("/api/admin/stop-match", {
    method: "POST",
    body: JSON.stringify({ match_id: matchId }),
  });
}

export async function getAdminStatus() {
  return fetchAPI("/api/admin/status");
}
