import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

function init() {
    const root = createRoot(document.getElementById("root"));
    root.render(
        <StrictMode>
            <App />
        </StrictMode>
    );
}

init();
