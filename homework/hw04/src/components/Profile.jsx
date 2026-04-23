import React, { useState, useEffect } from "react";
import { getDataFromServer } from "../server-requests";

export default function Profile({ token }) {
    const [profile, setProfile] = useState(null);

    async function fetchProfile() {
        console.log("Fetching profile...");

        const responseData = await getDataFromServer(
            token,
            "/api/profile/"
        );

        setProfile(responseData);
    }

    useEffect(() => {
        fetchProfile();
    }, []);

    if (!profile) {
        return (
            <header className="flex gap-4 items-center">
                <p>Profile Goes Here. Fetch data from /api/profile endpoint.</p>
            </header>
        );
    }

    return (
        <header className="flex gap-4 items-center">
            <img
                src={profile.image_url}
                alt="profile"
                className="w-12 h-12 rounded-full"
            />
        <div>
            <p>{profile.username}</p>
            <p className="text-sm text-gray-500">
                {profile.first_name} {profile.last_name}
            </p>
        </div>
    </header>
    );
}