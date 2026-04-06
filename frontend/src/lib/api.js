export function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8001";
  return baseUrl.replace(/\/$/, "");
}

export async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : null;
  const fallbackText = isJson ? "" : (await response.text()).trim();

  if (response.ok) {
    return data;
  }

  const detail =
    data?.detail ||
    data?.non_field_errors?.[0] ||
    Object.values(data || {})
      .flat()
      .find(Boolean) ||
    fallbackText ||
    "Nao foi possivel concluir a requisicao.";

  throw new Error(detail);
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, options);
  return parseApiResponse(response);
}

export async function authFetch(path, token, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  return apiFetch(path, { ...options, headers });
}
