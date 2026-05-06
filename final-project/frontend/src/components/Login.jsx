import { useState } from "react";
import { getApiBaseUrl } from "../api.js";
import { setToken, setUsername as storeUsername } from "../tokenStorage.js";

export default function Login({ handleLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function sendLoginRequest(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.token) {
        setError("Login failed.");
        return;
      }

      setToken(data.token);
      storeUsername(username);
      handleLoggedIn();
    } catch {
      setError("Login failed.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={sendLoginRequest}
        className="w-full max-w-xs space-y-3 rounded border border-slate-200 bg-white p-5"
      >
        <h1 className="text-lg font-semibold text-slate-800">Sign in</h1>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <input
          className="w-full rounded border border-slate-300 px-2 py-1.5"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          autoComplete="username"
          required
          aria-label="Username"
        />

        <input
          type="password"
          className="w-full rounded border border-slate-300 px-2 py-1.5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          required
          aria-label="Password"
        />

        <button
          type="submit"
          className="w-full rounded bg-slate-800 py-2 text-sm font-medium text-white"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
