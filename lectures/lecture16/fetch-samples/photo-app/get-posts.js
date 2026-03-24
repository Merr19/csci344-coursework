import { getAccessToken } from "./get-token.js";
const rootURL = "https://photo-app-secured.herokuapp.com";

export async function getPosts() {
    // get access token (like logging in) so that you can query for "your data":
    const token = await getAccessToken(rootURL, "mvazque1", "password");

    // endpoint:
    const endpoint = `${rootURL}/api/posts/`;

    // send asynchronous request and wait for response headers:
    const response = await fetch(endpoint, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
    });

    // note that you can now read the headers if you want to
    // but the body has not yet been downloaded. That happens on
    // the next promise:
    console.log("----------------------------------------------------------");
    console.log("HEADERS...");
    console.log("----------------------------------------------------------");
    response.headers.forEach((val, key) => console.log(key + " -> " + val));
    console.log("----------------------------------------------------------");

    // now wait for response body (also asynchronous):
    const posts = await response.json();

    function ownedByMe (post)
    {
        if(post.user.username === "mvazque1")
        {
            return true;
        }
        else{
            return false;
        }
    }

    const myPosts = posts.filter(ownedByMe);
    console.log(myPosts);

    // print a dump of the first post:
    console.log(JSON.stringify(posts[0], null, "   "));

    // print all of the post ids:
    posts.forEach((post) => console.log(post.id));

    // print all of the users associate with the posts in your feed:
    posts.forEach((post) => console.log(post.user.username));
}

getPosts();
