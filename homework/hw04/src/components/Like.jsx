import React, {useState} from "react";
import { deleteDataFromServer, postDataToServer } from "../server-requests";

export default function Like ({likeId, postId, token}){
    const [stateLikeId, setStateLikeId] = useState(likeId);

    async function createLike() {
        console.log("Liking post...");

        const responseData = await postDataToServer(
            token,
            "/api/likes/",
            {}
        );
        setStateLikeId(responseData.id);
    }

    async function deleteLike() {
        console.log("Deleting Like...");

        await deleteDataFromServer(
            token,
            "/api/likes/" + stateLikeId
        );
        setStateLikeId(null);
    }
    
    if (likeId){
        return (
            <button
                aria-lable="Unlike post"
                aria-checked="true"
                role="switch"
                onClick={deleteLike}
            >
                <i className="fas text-red-700 fa-heart"></i>
            </button>
        );
    } else {
        return (
            <button
                aria-label="Like post"
                aria-checked="false"
                ariaRole="switch"
                onClick={createLike}
            >
                <i className="far fa-heart"></i>
            </button>
        );   
    }
}