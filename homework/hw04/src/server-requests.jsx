// gets an access token:
export async function getAccessToken(username, password) {
    const postData = {
        username: username,
        password: password,
    };
    const endpoint = `/api/token/`;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
    });
    const data = await response.json();
    return data.access_token;
}

// Issues an HTTP GET request:
export async function getDataFromServer(token, url) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
    });
    const data = await response.json();
    //console.log(data);
    return data;
}

// Issues an HTTP DELETE request:
export async function deleteDataFromServer(token, url) {
    const response = await fetch(url, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
    });
    const data = await response.json();
    //console.log(data);
    return data;
}

// Issues an HTTP POST request:
export async function postDataToServer(token, url, postData) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
        body: JSON.stringify(postData),
    });
    const data = await response.json();
    //console.log(data);
    return data;
}
