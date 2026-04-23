import React, { useState, useEffect } from "react";
import { getDataFromServer } from "../server-requests";
import Suggestion from "./Suggestion";

export default function Suggestions({ token }) {
    const [suggestions, setSuggestions] = useState([]);

    async function getSuggestions() {
        console.log("Getting suggestions...");

        const responseData = await getDataFromServer(
            token,
            "/api/suggestions"
        );

        setSuggestions(responseData);
    }

    useEffect(() => {
        getSuggestions();
    }, []);

    if (!suggestions.length) {
        return (
            <div>
                <p>Suggestions go here.</p>
            </div>
        );
    }

    return (
        <div>
            <p className="text-sm font-semibold mb-2">
                Suggestions
            </p>

            {suggestions.map((s) => (
                <Suggestion
                    key={s.id}
                    suggestion={s}
                />
            ))}
        </div>
    );
}