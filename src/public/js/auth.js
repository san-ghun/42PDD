"use strict";

const login = document.getElementById("login");
const loginButton = document.getElementById("login-button");
const loginMark = document.getElementById("login-message");
const logoutButton = document.getElementById("logout-button");

const pb = new PocketBase("http://127.0.0.1:8090");

let showLogin = false;
let loginMessage = null;
welcome.hidden = showLogin;

function init() {
  pb.afterSend = function (response, data) {
    if (response.statusCode === 401) {
      showLogin = true;
    }
    welcome.hidden = showLogin;
    return data;
  };

  if (!window.localStorage.getItem("pocketbase_auth")) {
    showLogin = true;
    welcome.hidden = showLogin;
    return;
  }

  const auth = JSON.parse(window.localStorage.getItem("pocketbase_auth"));
  pb.authStore.save(auth.token, auth.model);

  login.hidden = !showLogin;
  welcome.hidden = showLogin;
  // console.log(pb.authStore.isValid);
  // console.log(pb.authStore.token);
  // console.log(pb.authStore.model.id);
}

async function handleLogin() {
  try {
    const authData = await pb
      .collection("users")
      .authWithOAuth2({ provider: "fourtytwo" });
    showLogin = false;
  } catch (error) {
    loginMessage = error.data.message;
  }
  login.hidden = !showLogin;
  welcome.hidden = showLogin;
}

async function handleLogout() {
  pb.authStore.clear();
  showLogin = true;
  login.hidden = !showLogin;
  welcome.hidden = showLogin;
}

loginButton.addEventListener("click", handleLogin);
logoutButton.addEventListener("click", handleLogout);

init();
