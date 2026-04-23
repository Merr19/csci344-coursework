import React, { useState, useEffect } from "react";
import { getDataFromServer } from "../server-requests";

export default function Stories({ token }) {
    const [stories, setStories] = useState([]);

    async function getStories() {
        console.log("Getting stories...");

        const responseData = await getDataFromServer(
            token,
            "/api/stories"
        );

        setStories(responseData);
    }

    useEffect(() => {
        getStories();
    }, []);

    if (!stories.length) {
        return (
            <div className="border p-4 rounded">
                <p>Stories go here.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border p-4 rounded shadow-sm">
            <div className="flex gap-4">
                {stories.map((story) => (
                    <div key={story.id} className="text-center">
                        <img
                            src={story.user.image_url}
                            alt="story"
                            className="w-12 h-12 rounded-full"
                        />
                        <p className="text-xs">
                            {story.user.username}
                        </p>
                    </div>
                ))}
            </div>
        </div>
);
}