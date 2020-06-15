/**
 * confcall js file to handle the
 * confcall html frontend stuff
 *
 */

"use strict";

const socket = io(window.location.origin);

const initConfCall = async () => {
  getConfChannels().then((groups) => {
    if (groups.length > 0) {
      renderChannels(groups);
    }

    socket.on("newConfChannel", (newGroup) => {
      renderChannels([newGroup]);
    });
  });
};

const getConfChannels = () => {
  return new Promise((res, rej) => {
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", "/confChannels");
    xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlHttp.onreadystatechange = (users) => {
      if (xmlHttp.readyState != 4) return;
      if (xmlHttp.status != 200 && xmlHttp.status != 304) {
        console.log("HTTP error " + xmlHttp.status, null);
        res([]);
      } else {
        res(JSON.parse(users.currentTarget.response));
      }
    };
    xmlHttp.send();
  });
};

const renderChannels = (data) => {
  data.forEach((r) => {
    let wrapperDiv = document.createElement("div");
    wrapperDiv.className = `groupWrapper`;

    let userDiv = document.createElement("div");
    userDiv.className = `group`;
    userDiv.innerHTML = r;

    let createLink = document.createElement("a");
    createLink.href = "/confCall/" + r;
    createLink.innerHTML = "join";

    wrapperDiv.appendChild(userDiv);
    wrapperDiv.appendChild(createLink);

    document.getElementById("users").appendChild(wrapperDiv);
  });
};

initConfCall();
