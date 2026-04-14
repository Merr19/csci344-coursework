import React from "react";

// custom components:
import NavBar from "./NavBar";
import Profile from "./Profile";
import Suggestions from "./Suggestions";
import Stories from "./Stories";
import Posts from "./Posts";

export default function App({ username, token }) {
    return (
        <>
            {/* Navbar (already implemented for you ) */}
            <NavBar username={username} />

            {/* Main Panel */}
            <main className="mt-[100px] md:max-w-[61vw] md:mr-[50px] px-6 md:pl-[5vw] lg:pl-[10vw]">
                {/* Stories Panel */}
                <Stories token={token} />

                {/* Posts */}
                <Posts token={token} />

                {/* HTML Tips */}
                <div className="p-8 mt-4 bg-yellow-50 rounded-md border border-yellow-200">
                    <h3 className="text-lg font-Comfortaa font-bold mb-3">HTML Tips</h3>
                    See <a href="/index-hw03.html" className="text-blue-500">index-hw03.html</a>{' '} 
                    for the original HTML (which you can use in your development).
                </div>

            </main>

            {/* Right Panel */}
            <aside className="fixed top-[100px] left-[63vw] w-70 hidden md:block max-w-[300px]">
                {/* Profile Panel */}
                <Profile token={token} />

                {/* Suggestions Panel */}
                <Suggestions token={token} />
            </aside>
        </>
    );
}
