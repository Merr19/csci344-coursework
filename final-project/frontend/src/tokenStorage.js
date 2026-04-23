const STORAGE_KEY = "auth_token";
const USERNAME_KEY = "auth_username";

export function getToken() {
  return localStorage.getItem(STORAGE_KEY);
}

export function setToken(token) {
  localStorage.setItem(STORAGE_KEY, token);
}

export function getUsername() {
  return localStorage.getItem(USERNAME_KEY);
}

export function setUsername(username) {
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USERNAME_KEY);
}
