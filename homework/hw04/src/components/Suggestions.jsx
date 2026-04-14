import React from "react";

export default function Suggestions({ token }) {
    return (
        <div className="mt-4">
            <p className="text-base text-gray-400 font-bold mb-4">
                Suggestions for you
            </p>

            <section className="flex justify-between items-center mb-4 gap-2">
                Suggestions go here. Fetch data from /api/suggestions endpoint.
            </section>
        </div>
    );
}
