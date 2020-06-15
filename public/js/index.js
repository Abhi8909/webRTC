/**
 * Main js file to handle the
 * frontend stuff
 *
 */

"use strict";

const socket = io(window.location.origin);
const { RTCPeerConnection, RTCSessionDescription } = window;

let configuration = getMediaServerConf();
let peerConnection = new RTCPeerConnection(configuration);

let selectedUser = null;
let loggedUser = null;
let isAlreadyCalling = false;
let getCalled = false;
let mediaPermissions = getMediaPermissionOptions();
let channelId = null;
let __localStream = null;
let callMeta = {
  startTime: null,
  endTime: null,
  duration: 0,
};
let onlineUsers = [];

const inputContainer = document.getElementById("input");
const btnVideo = document.getElementsByClassName("btnVideo")[0];
const btnAudio = document.getElementsByClassName("btnAudio")[0];
const btnSend = document.getElementsByClassName("btnSend")[0];
const btnLogin = document.getElementsByClassName("btnLogin")[0];
const btnEndCall = document.getElementsByClassName("btnEndCall")[0];

const init = async () => {
  // adding bind event

  getOnlineUsers().then(async (users) => {
    if (Array.isArray(users) && users.length > 0) {
      onlineUsers = users;
      renderUsers(users);
    }

    btnSend.addEventListener("click", () => {
      sendMessage();
    });

    btnLogin.addEventListener("click", () => {
      if (loggedUser === null) {
        let name = document.getElementById("inputLogin").value;
        window.socketId = socket.id;
        socket.emit("newUser", name);
        loggedUser = name;
        document.getElementsByClassName("btnLogin")[0].style.background =
          "grey";
      } else {
        alert("User Already logged in");
      }
    });

    btnVideo.addEventListener("click", onBtnVideoClick);
    btnAudio.addEventListener("click", onBtnAudioClick);
    btnEndCall.addEventListener("click", hangup);

    inputContainer.addEventListener("keydown", (e) => {
      if (e.keyCode === 13) {
        sendMessage();
      } else {
        throttleFunction(
          () => {
            socket.emit("startTyping", selectedUser && selectedUser.socketId);
          },
          500,
          "keydown"
        );
      }
    });

    inputContainer.addEventListener("keyup", () => {
      throttleFunction(
        () => {
          socket.emit("stopTyping", selectedUser && selectedUser.socketId);
        },
        1000,
        "keyup"
      );
    });

    socket.on("userRegistered", (newUser) => {
      onlineUsers.push(newUser);
      renderUsers([newUser]);
    });

    socket.on("userUnRegistered", (removedUser) => {
      let index = onlineUsers.findIndex(
        (r) => r.socketId === removedUser.socketId
      );
      if (index > -1) onlineUsers.splice(index, 1);
      document.getElementById(removedUser.socketId).remove();
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
      )[0].innerText = `typing...`;
    });

    socket.on("stopTyping", () => {
      console.log("stopTyping event received");
      document.getElementsByClassName("typingStatus")[0].innerText = "";
    });

    /**
     * Video call socket handling
     *
     */
    socket.on("callMade", async (data) => {
      console.log("call made");
      let confirmed = getCalled;

      if (!getCalled)
        confirmed = await swal({
          title: "Incoming Video Call?",
          text: `${getName(
            onlineUsers,
            data.id
          )} wants to call you. Do you accept this call?`,
          buttons: true,
          dangerMode: true,
        });

      if (!confirmed) {
        socket.emit("callRejected", {
          id: data.id,
        });
        return;
      } else {
        channelId = data.id;
        document.getElementById("textContainer").style.display = "none";
        document.getElementById("callContainer").style.display = "block";
        getUserMediaPermissions(mediaPermissions).then((stream) => {
          let localVideo = document.getElementById("localVideo");
          if (stream && localVideo) {
            localVideo.srcObject = stream;
          }
        });
        callMeta.startTime = Date.now();

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        const ans = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(
          new RTCSessionDescription(ans)
        );

        socket.emit("answerCall", {
          ans: ans,
          id: data.id,
        });
        getCalled = true;
      }
    });

    socket.on("callAnswered", async (data) => {
      console.log("call answered ", data.id);
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.ans)
      );

      callMeta.startTime = Date.now();

      if (!isAlreadyCalling) {
        makeCall(data.id);
        isAlreadyCalling = true;
      }
    });

    socket.on("callRejected", (data) => {
      console.log("call rejected ", data.id);
      swal(`${getName(onlineUsers, data.id)}" rejected your call.`);
      afterCallEnded();
    });

    socket.on("callEnded", () => {
      afterCallEnded();
      swal("Call Ended: " + callMeta.duration);
    });

    socket.on("iceCandiate", async (data) => {
      await peerConnection.addIceCandidate(data.iceCandidate);
    });

    // // upgrade call logic
    // socket.on("callUpgraded", (data) => {});

    // // downgrade call logic
    // socket.on("callDowngrade", (data) => {});
  });

  peerConnection.ontrack = function ({ streams: [stream] }) {
    const remoteVideo = document.getElementById("remoteVideo");
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
    }
  };

  window.addEventListener("beforeunload", function (e) {
    // tab or browser close
    if (channelId) socket.emit("endCall", { id: channelId });
    return;
  });
};

const sendMessage = () => {
  let msg = inputContainer.value;
  if (msg.trim() === "") return;
  if (selectedUser) {
    socket.emit("sendNewMsg", {
      id: selectedUser.socketId,
      msg: msg,
    });
  } else {
    socket.emit("broadcastMessage", msg);
  }
  inputContainer.value = "";
  appendMessage(msg, Date.now(), "sender", "You");
};

const getOnlineUsers = () => {
  return new Promise((res, rej) => {
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", "/users");
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

const renderUsers = (users) => {
  users.forEach((r) => {
    if (r.socketId !== window.socketId) {
      let userDiv = document.createElement("div");

      userDiv.className = `user`;
      userDiv.innerHTML = r.username;
      userDiv.id = r.socketId;
      userDiv.addEventListener("click", userClicked);

      document.getElementById("users").appendChild(userDiv);
    }
  });
};

const userClicked = (event) => {
  selectedUser = {
    socketId: event.currentTarget.id,
    username: event.currentTarget.innerHTML,
  };
  document.getElementsByClassName("container")[0].style.visibility = "visible";
  document.getElementsByClassName("heading")[0].innerText =
    selectedUser.username;
  document.getElementById("startCallBtns").style.display = "block";
};

/**
 * Video call methods start
 */

const onBtnVideoClick = () => {
  document.getElementById("textContainer").style.display = "none";
  document.getElementById("callContainer").style.display = "block";
  getUserMediaPermissions(mediaPermissions).then((stream) => {
    let localVideo = document.getElementById("localVideo");

    if (stream && localVideo) {
      localVideo.srcObject = stream;
    }
    makeCall(selectedUser.socketId);
    channelId = selectedUser.socketId;
  });
};

const onBtnAudioClick = () => {};

const getUserMediaPermissions = async (mediaPermissions) => {
  let stream = null;

  try {
    stream = await window.navigator.mediaDevices.getUserMedia(mediaPermissions);
    __localStream = stream;
    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream));
  } catch (e) {
    console.warn(e.message);
    swal({
      title: "Get Media Error",
      text: handleError(e),
    });
  }

  return stream;
};

const makeCall = async (id) => {
  let offer = null;
  offer = await peerConnection.createOffer();

  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

  peerConnection.addIceCandidate = (event) => {
    if (event.candidate) {
      socket.emit("iceCandidate", event.candidate);
    }
  };

  console.log("call init");
  socket.emit("makeCall", {
    offer: offer,
    id: id,
  });
};

const getName = (users, id) => {
  let user = users.find((r) => r.socketId === id);
  let name = user ? user.username : id;
  return name;
};

const hangup = () => {
  console.log("Ending call");
  socket.emit("endCall", { id: channelId });
  afterCallEnded();
};

const afterCallEnded = () => {
  stopMediaStream(__localStream);
  peerConnection.close();
  peerConnection = new RTCPeerConnection(configuration);

  peerConnection.ontrack = function ({ streams: [stream] }) {
    const remoteVideo = document.getElementById("remoteVideo");
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
    }
  };

  document.getElementById("textContainer").style.display = "block";
  document.getElementById("callContainer").style.display = "none";

  getCalled = false;
  isAlreadyCalling = false;
  channelId = null;

  callMeta.endTime = Date.now();
  callMeta.duration = calculateCallDuration(callMeta);
  console.log("The call duration was ", callMeta.duration);
};

function calculateCallDuration(callMeta) {
  let seconds = (callMeta.endTime - callMeta.startTime) / 1000;
  let display = "";

  seconds = Number(seconds);
  let h = Math.floor(seconds / 3600);
  let m = Math.floor((seconds % 3600) / 60);
  let s = Math.floor((seconds % 3600) % 60);

  display += h > 0 ? pad(h) + ":" : "00:";
  display += m > 0 ? pad(m) + ":" : "00:";
  display += s > 0 ? pad(s) : "00";

  return display;
}

const pad = (v) => {
  return v > 9 ? v : "0" + v;
};

init();
