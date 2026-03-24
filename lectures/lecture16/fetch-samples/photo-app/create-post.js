import { getAccessToken } from "./get-token.js";
const rootURL = "https://photo-app-secured.herokuapp.com";

export async function createPost() {
    // get access token (like logging in) so that you can query for "your data":
    const token = await getAccessToken(rootURL, "sarah", "password");

    // data to sent to server:
    const postData = {
        image_url: "https://picsum.photos/300/300",
        caption: "Caption for new post",
        alt_text: "here is some alt text for the photo!",
    };

    // endpoint:
    const endpoint = `${rootURL}/api/posts/`;

    // send asynchronous request and wait for response headers:
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
    });

    // now wait for response body (also asynchronous):
    const data = await response.json();

    // now print to the console:
    console.log(data);
}

createPost();
