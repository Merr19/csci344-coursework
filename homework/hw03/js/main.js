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
            <img src="${post.image_url}" alt="placeholder image" width="300" height="300"
                class="w-full bg-cover">
            <div class="p-4">
                <div class="flex justify-between text-2xl mb-3">
                    <div>
                        <button><i class="far fa-heart"></i></button>
                        <button><i class="far fa-comment"></i></button>
                        <button><i class="far fa-paper-plane"></i></button>
                    </div>
                    <div>
                        ${getBookmarkBtn(post)}
                    </div>
                </div>
                <p class="font-bold mb-3">30 likes</p>
                <div class="text-sm mb-3">
                    <p>
                        <strong>gibsonjack</strong>
                        Here is a caption about the photo.
                        Text text text text text text text text text
                        text text text text text text text text... <button class="button">more</button>
                    </p>
                </div>
                <p class="text-sm mb-3">
                    <strong>lizzie</strong>
                    Here is a comment text text text text text text text text.
                </p>
                <p class="text-sm mb-3">
                    <strong>vanek97</strong>
                    Here is another comment text text text.
                </p>
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

// after all of the functions are defined,
// invoke initialize at the bottom:
initializeScreen();
