// requires utilities.js to be loaded first:
// included in index.html

const rootURL = "https://photo-app-secured.herokuapp.com";
let token = null;
let username = "mvazque1"; // change to your username :)
let password = "password";

async function initializeScreen() {
  token = await getToken();
  showNav();
  // invoke all of the Part 1 functions here
  showPosts();
  showProfileHeader();
  showSuggestions();
  showStories();
}

//fetch and display the posts

async function showPosts() {
  // 1. fetch the posts from /api/posts
  const endpoint = `${rootURL}/api/posts/`;

  //fetching server reposne header
  const response = await fetch(endpoint, {
    //where we wanna go
    method: "GET", //retrieveing data
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token, //password
    },
  });

  //fetching server response body aka the payload
  const posts = await response.json();

  //test
  console.log(posts);

  // 2. select the posts container
  const postCardEl = document.querySelector("#postCard");
  postCardEl.innerHTML = "";

  // 3. loop through the first 10 posts
  posts.forEach((post) => {
    // 4. build each post's HTML (or call a helper function) 5. insert the rendered posts into the DOM
    const htmlSnippet = postToHTML(post);
    postCardEl.insertAdjacentHTML("beforeend", htmlSnippet);
  });
}

function postToHTML(post) {
  return `
    <!--post 1-->
    <section class="bg-white border mb-10">
            <div class="p-4 flex justify-between">
                <h3 class="text-lg font-Comfortaa font-bold">${post.user.username}</h3>
                <button class="icon-button"><i class="fas fa-ellipsis-h"></i></button>
            </div>
            <img src="${post.image_url}" alt="image" width="300" height="300"
                class="w-full bg-cover">
            <div class="p-4">
                <div class="flex justify-between text-2xl mb-3">
                    <div>
                        ${getLikeButton(post)}
                        <button><i class="far fa-comment"></i></button>
                        <button><i class="far fa-paper-plane"></i></button>
                    </div>
                    <div>
                        ${getBookmarkBtn(post)}
                    </div>
                </div>
            <p class="font-bold mb-3">${post.likes_count || 0} likes</p>

            <div class="text-sm mb-3">
                ${getComments(post)}
            </div>

            <p class="uppercase text-gray-500 text-xs">1 day ago</p>
            </div>

            <div class="flex justify-between items-center p-3">
                <div class="flex items-center gap-3 min-w-[80%]">
                    <i class="far fa-smile text-lg"></i>
                    <input type="text" class="min-w-[80%] focus:outline-none" placeholder="Add a comment...">
            </div>
            <button class="text-blue-500 py-2">Post</button>
        </div>
        </section>
            
    `;
}

function getBookmarkBtn(post) {
  if (post.current_user_bookmark_id !== undefined) {
    return `<button onclick="unBookmark(${post.current_user_bookmark_id})">
                    <i class="fas fa-bookmark"></i>
                </button>`;
  } else {
    return `<button onclick="bookmark(${post.post_id})">
                        <i class="far fa-bookmark"></i>
                    </button>`;
  }
}

async function bookmark(postID){
    console.log("create a bookmark...");

    const postData = {
        post_id: postID,
    };

    const response = await fetch(`${rootURL}/api/bookmarks/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
        body: JSON.stringify(postData),
    });
    const data = await response.json();
    console.log(data);
}

async function unBookmark(bookmarkID) {
    console.log("delete a bookmark...");
    const endpoint = `${rootURL}/api/bookmarks/${bookmarkID}`
    const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        }
    });
    const data = await response.json();
    console.log(data);
    
}

async function getToken() {
  return await getAccessToken(rootURL, username, password);
}

function showNav() {
  document.querySelector("#nav").innerHTML = `
    <nav class="flex justify-between py-5 px-9 bg-white border-b fixed w-full top-0">
            <h1 class="font-Comfortaa font-bold text-2xl">Photo App</h1>
            <ul class="flex gap-4 text-sm items-center justify-center">
                <li><span>${username}</span></li>
                <li><button class="text-blue-700 py-2">Sign out</button></li>
            </ul>
        </nav>
    `;
}

// implement remaining functionality below:

//PFP
async function showProfileHeader() {
  const endpoint = `${rootURL}/api/profile`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
  });

  const profile = await response.json();

  console.log(profile); 

  const profileContainer = document.querySelector("#profile-header");

    const html = `
        <div class="flex items-center gap-4 p-4">
            <div style="width:64px; height:64px; border-radius:50%; overflow:hidden; flex-shrink:0;">
                <img src="${profile.image_url}" 
                    style="width:100%; height:100%; object-fit:cover; display:block;">
        </div>

        <div>
            <h2 class="font-bold text-lg">${profile.username}</h2>
            <p class="text-sm text-gray-500">
                ${profile.first_name || ""} ${profile.last_name || ""}
            </p>
        </div>
    </div>
    `;
  profileContainer.insertAdjacentHTML("beforeend", html);
}

//suggestions
async function showSuggestions() {
  const endpoint = `${rootURL}/api/suggestions`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
  });

  const suggestions = await response.json();
  console.log(suggestions); 

  const suggestionsContainer = document.querySelector("#suggestions");

  suggestionsContainer.innerHTML = "";

  suggestions.forEach((user) => {

    const html = `
        <div class="flex items-center gap-4 p-4">
            <div style="width:64px; height:64px; border-radius:50%; overflow:hidden; flex-shrink:0;">
                <img src="${user.image_url}" 
                    style="width:100%; height:100%; object-fit:cover; display:block;">
        </div>

        <div>
            <h2 class="font-bold text-lg">${user.username}</h2>
            <p class="text-sm text-gray-500">
                ${user.first_name || ""} ${user.last_name || ""}
            </p>
        </div>
    </div>
    `;

    suggestionsContainer.insertAdjacentHTML("beforeend", html);
  });
}

//stories
async function showStories() {

  const endpoint = `${rootURL}/api/stories`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
  });

  const stories = await response.json();
  console.log("Stories:", stories);

  const storiesContainer = document.querySelector("#stories");

  storiesContainer.innerHTML = "";

  stories.forEach((story) => {

    const html = `
      <div class="flex flex-col items-center">
        <div style="width:50px; height:50px; border-radius:50%; overflow:hidden; border:3px solid #ddd;">
          <img src="${story.user.image_url}" 
               style="width:100%; height:100%; object-fit:cover;">
        </div>
        <p class="text-xs text-gray-500 mt-1">
          ${story.user.username}
        </p>
      </div>
    `;

    storiesContainer.insertAdjacentHTML("beforeend", html);
  });
}

//comments
function getComments(post) {
    const comments = post.comments || []; 
    const numComments = comments.length;

    if (numComments === 0) {
        return ""; // no comments
    } else if (numComments === 1) {
        const comment = comments[0];
        return `
            <p class="text-sm mb-2">
                <strong>${comment.user.username}</strong> ${comment.text}
            </p>
            `;
    } else {
        const mostRecent = comments[numComments - 1]; 
        return `
            <button class="text-sm text-gray-500 mb-1">View all ${numComments} comments</button>
            <p class="text-sm mb-2">
                <strong>${mostRecent.user.username}</strong> ${mostRecent.text}
            </p>
        `;
    }
}

//like button
function getLikeButton(post) {
    if (post.current_user_like_id !== undefined) {
        return `<button onclick="unlike(${post.current_user_like_id})">
                    <i class="fas fa-heart text-red-500"></i>
                </button>`;
        } else {
        return `<button onclick="like(${post.post_id})">
                    <i class="far fa-heart"></i>
                </button>`;
  }
}

//bookmark
    function getBookmarkButton(post) {
        if (post.current_user_bookmark_id !== undefined) {
            return `<button onclick="unBookmark(${post.current_user_bookmark_id})">
                        <i class="fas fa-bookmark"></i>
                    </button>`;
        } else {
            return `<button onclick="bookmark(${post.post_id})">
                        <i class="far fa-bookmark"></i>
                    </button>`;
  }
}

//like
async function like(postId) {
    const endpoint = `${rootURL}/api/likes/`;
    const postData = { post_id: postId };

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
        },
        body: JSON.stringify(postData),
    });

    const data = await response.json();
    console.log("Liked post:", data);

    await showPosts();
  } catch (error) {
    console.error("Error liking post:", error);
  }
}

//unlike
async function unlike(likeId, postId) {
    const endpoint = `${rootURL}/api/likes/${likeId}`;

    try {
        const response = await fetch(endpoint, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
        },
    });

    const data = await response.json();
    console.log("Unliked post:", data);

    await showPosts();
  } catch (error) {
    console.error("Error unliking post:", error);
  }
}


// after all of the functions are defined,
// invoke initialize at the bottom:
initializeScreen();
