export const SESSION_KEY = "rigzer_analytics_session";

export function getSessionId() {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionId(sessionId: string) {
  localStorage.setItem(
    SESSION_KEY,
    sessionId
  );
}

export function clearSessionId() {
  localStorage.removeItem(
    SESSION_KEY
  );
}