import React, { useState, useEffect } from "react";
import { getDataFromServer } from "../server-requests";

import Post from "./Post";

//job is to fetch post data from the server and iterate thru each element and draws a post component

export default function Posts({ token }) {

    //State variables: every time a state variable get set it redraws the component
    const [posts, setPosts] = useState([]);

    async function getPosts() {
        //fetches data from /api/posts/
        const data = await getDataFromServer(token, "/api/posts");

        //here it prints the data to the screen
        console.log(data);

        //setting  a state variable
        console.log("setting a state variable to redraw the screen after the posts are set...")
        setPosts(data); //state variable setters always redraw the screen
    }

    //the useEffect is a built-in func designed to handle side effects when the page 1st loads
    useEffect(() => {
        getPosts();
    }, []);

    console.log(posts);

function outputPost(postObj){
    return <Post token={token} key={postObj.id} postData={postObj} />

}

    return (
        <div>
            {
                posts.map(outputPost)
            }
        </div>
    );
}
