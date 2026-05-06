import { getToken } from "./tokenStorage.js";

export function getApiBaseUrl() {
  return "http://localhost:3100";
}

export async function sendRequest(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const response = await fetch(getApiBaseUrl() + path, {
    method: options.method || "GET",
    body: options.body,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const errorBody = await response.json();
      message = errorBody.error || errorBody.message || message;
    } catch {
      // keep default message
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getItems() {
  return sendRequest("/api/games");
}

export function createItem(data) {
  return sendRequest("/api/games", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateItem(id, data) {
  return sendRequest(`/api/games/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteItem(id) {
  return sendRequest(`/api/games/${id}`, {
    method: "DELETE",
  });
}