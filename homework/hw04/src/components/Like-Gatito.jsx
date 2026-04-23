import React from "react";
import { postDataToServer } from "../server-requests";

export default function Like ({likeId}){

    console.log(likeId);

    async function createLike() {
        const sendData = {
            post_id: postId,
        };

        console.log("Liking post...");

        const responseData = await postDataToServer(
            token,
            "/api/likes/"
        )
    }
    
    if (likeId){
        return (
            <button>
                <i className="fas text-red-700 fa-heart"></i>
            </button>
        );
    } else {
        return (
            <button>
                <i className="far fa-heart"></i>
            </button>
        );   
    }
}