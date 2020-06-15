/**
 * roomjs file to handle the
 * frontend stuff of room page
 *
 */

"use strict";
const socket = io(window.location.origin);
const chatConatiner = document.getElementsByClassName("chatContainer")[0];
const inputContainer = document.getElementById("input");

const initRoom = () => {
  // adding bind event

  let groupName = window.location.pathname.split("/groupchat/")[1];
  let userName = prompt("What is your name?");
  document.getElementsByClassName("heading")[0].innerText = groupName.replace(
    "_",
    ""
  );

  socket.emit("newUser", userName, groupName);

  socket.on("userJoined", (user) => {
    console.log("doen");
    showNotification(user, "joined");
  });

  socket.on("userLeft", (user) => {
    showNotification(user, "left");
  });

  document
    .getElementsByClassName("btnSend")[0]
    .addEventListener("click", () => {
      sendMessage(groupName);
    });

  inputContainer.addEventListener("keydown", (e) => {
    if (e.keyCode === 13) {
      sendMessage(groupName);
    } else {
      throttleFunction(
        () => {
          socket.emit("startTyping", userName, groupName);
        },
        500,
        "keydown"
      );
    }
  });

  inputContainer.addEventListener("keyup", () => {
    throttleFunction(
      () => {
        socket.emit("stopTyping", userName, groupName);
      },
      1000,
      "keyup"
    );
  });

  socket.on("receiveMessage", (data) => {
    appendMessage(data.msg, data.timeStamp, "receiver", data.name);
    audio.play();
    document.title = data.name + "'s New Message";
    setTimeout(() => {
      document.title = "Chat App";
    }, 5000);
    // mark the message as deliveed
    socket.emit("delivered", data.id);
  });

  socket.on("startTyping", (name) => {
    console.log("typing event received");

    document.getElementsByClassName(
      "typingStatus"
    )[0].innerText = `${name} is typing...`;
  });

  socket.on("stopTyping", (name) => {
    console.log("stopTyping event received");
    document.getElementsByClassName("typingStatus")[0].innerText = "";
  });
};

const showNotification = (user, type) => {
  let name = user.socketId === socket.id ? "You" : user.username;

  let notificationWrapper = document.createElement("div");
  notificationWrapper.className = "notificationWrapper";

  let notification = document.createElement("div");
  notification.className = "notification";
  notification.innerHTML = `${name} ${type}`;

  notificationWrapper.appendChild(notification);
  chatConatiner.appendChild(notificationWrapper);
};

const sendMessage = (groupName) => {
  let msg = inputContainer.value;
  if (msg.trim() === "") return;

  socket.emit(
    "sendNewMsg",
    {
      id: socket.id,
      msg: msg,
    },
    groupName
  );

  inputContainer.value = "";
  appendMessage(msg, Date.now(), "sender", "You");
};

initRoom();
