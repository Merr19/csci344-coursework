import React from "react";
import { createRoot } from "react-dom/client";
import { getAccessToken } from "./server-requests.jsx";
import App from "./components/App.jsx";

async function main() {
    // this script kicks off the React App:
    const username = "mvazque1";
    const token = await getAccessToken(username, "password");
    const rootEl = document.getElementById("app");
    const root = createRoot(rootEl);
    root.render(<App token={token} username={username} />);
}

main();
