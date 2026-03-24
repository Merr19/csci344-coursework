/**
 * Sets a cookie which holds the access token after the user 
 * "logs in." This is NOT secure. We will implement a more
 * secure approach in the latter half of the semester.
 * 
 * @param {string} rootURL: The base address of the API
 * @param {string} username: Your username for the course API
 * @param {string} password: Your password for the course API 
 */
async function getAccessToken(rootURL, username, password) {
    const postData = {
        "username": username,
        "password": password
    };
    const endpoint = `${rootURL}/api/token/`;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
    });
    const data = await response.json();
    return data.access_token;
}
