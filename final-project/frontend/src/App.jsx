import { useState } from "react";
import { clearToken, getToken, getUsername } from "./tokenStorage.js";
import Login from "./components/Login.jsx";
import Navbar from "./components/Navbar.jsx";
import Homepage from "./components/Homepage.jsx";
import BarChart from "./components/BarChart.jsx";

export default function App() {
  const savedToken = getToken();
  const savedUsername = getUsername();
  const [hasToken, setHasToken] = useState(savedToken ? true : false);

  function handleLoggedIn() {
    setHasToken(true);
  }

  function handleLogout() {
    clearToken();
    setHasToken(false);
  }

  if (!hasToken) {
    return <Login handleLoggedIn={handleLoggedIn} />;
  }

//this is the main screen of the app after you login
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar handleLogout={handleLogout} username={savedUsername} />
      <Homepage username={savedUsername} />
    </div>
  );
}
