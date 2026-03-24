import { getAccessToken } from "./get-token.js";
const rootURL = "https://photo-app-secured.herokuapp.com";

export async function deletePost(postID) {
    // get access token (like logging in) so that you can query for "your data":
    const token = await getAccessToken(rootURL, "sarah", "password");

    // endpoint (postID is the id associated with the post you want to delete):
    const endpoint = `${rootURL}/api/posts/${postID}`;

    // send asynchronous request and wait for response headers:
    const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    // now wait for response body (also asynchronous):
    const data = await response.json();

    // now print to the console:
    console.log(data);
}

// make sure you pass the API a valid PostID that you're actually allowed to delete:
deletePost(197);
