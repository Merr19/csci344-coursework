import { useState } from "react";
import { clearToken, getToken, getUsername } from "./tokenStorage.js";
import Login from "./components/Login.jsx";
import Navbar from "./components/Navbar.jsx";
import Homepage from "./components/Homepage.jsx";

export default function App() {
  const [hasToken, setHasToken] = useState(!!getToken());
  const [username, setUsername] = useState(getUsername());

  function handleLoggedIn() {
    setHasToken(true);
    setUsername(getUsername());
  }

  function handleLogout() {
    clearToken();
    setHasToken(false);
    setUsername(null);
  }

  if (!hasToken) {
    return <Login handleLoggedIn={handleLoggedIn} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar handleLogout={handleLogout} username={username} />
      <Homepage username={username} />
    </div>
  );
}