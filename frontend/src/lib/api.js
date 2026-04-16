export function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  return baseUrl.replace(/\/$/, "");
}

function normalizeFallbackError(response, text) {
  const normalizedText = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedText) {
    return `Erro HTTP ${response.status}.`;
  }

  if (/server error/i.test(normalizedText)) {
    return `Erro HTTP ${response.status}: erro interno do servidor.`;
  }

  if (/bad request/i.test(normalizedText)) {
    return `Erro HTTP ${response.status}: requisicao invalida.`;
  }

  if (/unauthorized/i.test(normalizedText)) {
    return `Erro HTTP ${response.status}: autenticacao invalida ou expirada.`;
  }

  return normalizedText;
}

export async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : null;
  const fallbackText = isJson ? "" : (await response.text()).trim();

  if (response.ok) {
    if (
      data &&
      typeof data === "object" &&
      Array.isArray(data.results) &&
      Object.prototype.hasOwnProperty.call(data, "count")
    ) {
      return Object.assign([...data.results], {
        results: data.results,
        count: data.count,
        next: data.next,
        previous: data.previous,
      });
    }

    return data;
  }

  const detail =
    data?.detail ||
    data?.non_field_errors?.[0] ||
    Object.values(data || {})
      .flat()
      .find(Boolean) ||
    normalizeFallbackError(response, fallbackText) ||
    "Nao foi possivel concluir a requisicao.";

  const error = new Error(detail);
  error.status = response.status;
  error.data = data;
  throw error;
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, options);
  try {
    return await parseApiResponse(response);
  } catch (error) {
    error.path = path;
    throw error;
  }
}

export async function authFetch(path, token, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  return apiFetch(path, { ...options, headers });
}
