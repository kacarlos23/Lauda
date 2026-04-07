export function normalizeAccessCode(code = "") {
  return code.trim().toUpperCase();
}

export function getAccessCodeFromSearch(search = "") {
  const params = new URLSearchParams(search);
  return normalizeAccessCode(params.get("code") || "");
}

export function buildInvitePath(code = "") {
  const normalized = normalizeAccessCode(code);
  if (!normalized) {
    return "/invite";
  }

  return `/invite?code=${encodeURIComponent(normalized)}`;
}

export function buildLoginPath(code = "") {
  const normalized = normalizeAccessCode(code);
  if (!normalized) {
    return "/login";
  }

  return `/login?code=${encodeURIComponent(normalized)}`;
}
