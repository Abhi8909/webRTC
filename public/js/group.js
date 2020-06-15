/**
 * Group js file to handle the
 * Group html frontend stuff
 *
 */

"use strict";

const socket = io(window.location.origin);

const initGroup = async () => {
  getGroups().then((groups) => {
    if (Object.keys(groups).length > 0) {
      renderGroups(Object.keys(groups));
    }

    socket.on("newGroupCreated", (newGroup) => {
      renderGroups([newGroup]);
    });
  });
};

const getGroups = () => {
  return new Promise((res, rej) => {
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", "/groups");
    xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlHttp.onreadystatechange = (users) => {
      if (xmlHttp.readyState != 4) return;
      if (xmlHttp.status != 200 && xmlHttp.status != 304) {
        console.log("HTTP error " + xmlHttp.status, null);
        res([]);
      } else {
        console.log(JSON.parse(users.currentTarget.response));
        res(JSON.parse(users.currentTarget.response));
      }
    };
    xmlHttp.send();
  });
};

const renderGroups = (data) => {
  data.forEach((r) => {
    let wrapperDiv = document.createElement("div");
    wrapperDiv.className = `groupWrapper`;

    let userDiv = document.createElement("div");
    userDiv.className = `group`;
    userDiv.innerHTML = r;

    let createLink = document.createElement("a");
    createLink.href = "/groupchat/" + r;
    createLink.innerHTML = "join";

    wrapperDiv.appendChild(userDiv);
    wrapperDiv.appendChild(createLink);

    document.getElementById("users").appendChild(wrapperDiv);
  });
};

initGroup();
