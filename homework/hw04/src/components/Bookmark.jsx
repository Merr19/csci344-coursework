import React, {useState} from "react";

import { postDataToServer, deleteDataFromServer } from "../server-requests";

// job renders bookmark (marked or not??), can create or delete bookmarks!

export default function Bookmark({token, bookmarkId, postId}){
    const [stateBookmarkId, setStateBookmarkId] = useState(bookmarkId);

    console.log(bookmarkId);

    async function createBookmark() {
        const sendData = {
            post_id: postId,
        };
        console.log("creating a bookmark...");
        //send an http post to create a bookmark
        const reponseData = await postDataToServer(
            token, 
            "/api/bookmarks/", 
            sendData
        );
        console.log(reponseData);
        setStateBookmarkId(reponseData.id);
    }

    async function deleteBookmark() {
        console.log("deleting a bookmark...");
        //send an http post to create a bookmark
        const reponseData = await deleteDataFromServer(
            token, 
            "/api/bookmarks/" + stateBookmarkId
        );
        console.log(reponseData);
        setStateBookmarkId(null);
    }

    console.log(setStateBookmarkId);

    if (stateBookmarkId){
        return (
            <button 
                ariaLabel="Unbookmark This Post" 
                ariaChecked="true" 
                ariaRole="toggle" 
                onClick={deleteBookmark}
            >
                <i className="fas fa-bookmark"></i>
            </button>
        );
    } else {
        return (
            <button 
                ariaLabel="Bookmark This Post" 
                ariaChecked="false" 
                ariaRole="toggle" 
                onClick={createBookmark}
            >
                <i className="far fa-bookmark"></i>
            </button>
        );   
    }
}