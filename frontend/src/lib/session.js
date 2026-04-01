const STORAGE_KEY = "lauda_session";

export function loadStoredSession() {
  const token = localStorage.getItem("token");
  const rawSession = localStorage.getItem(STORAGE_KEY);

  if (!token || !rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession);
    return { ...session, access: token };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    return null;
  }
}

export function persistSession(session) {
  localStorage.setItem("token", session.access);
  if (session.refresh) {
    localStorage.setItem("refresh", session.refresh);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh");
  localStorage.removeItem(STORAGE_KEY);
}

