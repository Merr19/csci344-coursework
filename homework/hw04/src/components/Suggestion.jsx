import React from "react";

export default function Suggestion({ suggestion }) {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
                <img
                    src={suggestion.image_url}
                    alt="suggestion"
                    className="w-8 h-8 rounded-full"
                />
                <p className="text-sm">
                    {suggestion.username}
                </p>
            </div>

            <button className="text-blue-500 text-sm">
                Follow
            </button>
        </div>
    );
}