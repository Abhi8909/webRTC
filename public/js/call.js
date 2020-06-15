/**
 * video call  file to handle this
 *
 */

"use strict";

const socket = io(window.location.origin);
const { RTCPeerConnection, RTCSessionDescription } = window;
let isAlreadyCalling = false;

let configuration = getMediaServerConf();
let mediaPermissions = getMediaPermissionOptions();

let localStream = null;

let channelId = null;
let username = null;
let connectedPeers = {};

/**
 * DOM element
 *
 */
const btnToogleAudio = document.getElementsByClassName("btnToogleAudio")[0];
const btnToogleVideo = document.getElementsByClassName("btnToogleVideo")[0];
const btnEndCall = document.getElementsByClassName("btnEndCall")[0];
const localVideo = document.getElementById("localVideo");

const initVideoConf = async () => {
  channelId = window.location.pathname.split("/confCall/")[1];

  while (!username) {
    username = prompt("What is your name?");
  }

  socket.emit("addUserInConfCall", username, channelId);
  document.getElementById("username").innerText = username;

  try {
    localStream = await window.navigator.mediaDevices.getUserMedia(
      mediaPermissions
    );

    if (localStream && localVideo) {
      localVideo.srcObject = localStream;
    }
  } catch (e) {
    console.warn(e.message);

    swal({
      title: "Get Media Error",
      text: handleError(e),
    });
  }

  getChannelInfo(channelId).then((info) => {
    renderMemeberInConf(info, true);
  });

  socket.on("userAddedInConfCall", async (user) => {
    alertify.success(`${user.username} joined`);
    renderMemeberInConf([user], false);
  });

  socket.on("userLeftConfCall", (user) => {
    let elemToRemove = document.getElementById(user.socketId + "__");
    delete connectedPeers[user.socketId];
    if (elemToRemove) {
      elemToRemove.remove();
      alertify.error(`${user.username} left`);
    }
  });

  socket.on("callMade", async (data) => {
    let _conn = connectedPeers[data.id];
    if (_conn) {
      let pc = _conn._pc;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(new RTCSessionDescription(ans));

        socket.emit(
          "answerCall",
          {
            ans: ans,
            id: data.id,
          },
          channelId
        );
      }
    }
  });

  socket.on("iceCandiate", async (data) => {
    let _conn = connectedPeers[data.id];
    if (_conn) {
      let pc = _conn._pc;
      if (pc) await pc.addIceCandidate(data.iceCandidate);
    }
  });

  socket.on("callAnswered", async (data) => {
    let _conn = connectedPeers[data.id];
    let offer = {};
    let pc = _conn._pc;

    await pc.setRemoteDescription(new RTCSessionDescription(data.ans));
    if (!_conn.isAlreadyCalling) {
      offer = await pc.createOffer();
      await pc.setLocalDescription(new RTCSessionDescription(offer));

      pc.addIceCandidate = (event) => {
        if (event.candidate) {
          socket.emit("iceCandidate", event.candidate, channelId);
        }
      };

      socket.emit(
        "makeCall",
        {
          offer: offer,
          id: data.id,
        },
        channelId
      );
      _conn.isAlreadyCalling = true;
    }
  });

  btnEndCall.addEventListener("click", leftConfCall);
  btnToogleAudio.addEventListener("click", () => {
    toogleAudio(localStream);
  });
  btnToogleVideo.addEventListener("click", () => {
    toogleVideo(localStream);
  });
};

const leftConfCall = () => {
  if (channelId) {
    stopMediaStream(localStream);
    let _conn = connectedPeers[socket.id];
    if (_conn && _conn._pc) _conn._pc.close();
    socket.emit("userLeftConfCall", username, channelId);
    window.open("/confCall", "_self");
  }
};

const getChannelInfo = (chId) => {
  return new Promise((res, rej) => {
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", "/confChannels?chId=" + chId);
    xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlHttp.onreadystatechange = (data) => {
      if (xmlHttp.readyState != 4) return;
      if (xmlHttp.status != 200 && xmlHttp.status != 304) {
        console.log("HTTP error " + xmlHttp.status, null);
        res([]);
      } else {
        res(JSON.parse(data.currentTarget.response));
      }
    };
    xmlHttp.send();
  });
};

const renderMemeberInConf = async (data, initOffer) => {
  data.forEach(async (r) => {
    if (r.socketId === socket.id) return;

    addVideoDiv(r);

    let pc = new RTCPeerConnection(configuration);
    if (!connectedPeers[r.socketId]) connectedPeers[r.socketId] = {};
    connectedPeers[r.socketId]._pc = pc;
    connectedPeers[r.socketId].isAlreadyCalling = false;

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = function ({ streams: [stream] }) {
      const remoteVideo = document.getElementById(r.socketId);
      if (remoteVideo) {
        remoteVideo.srcObject = stream;
      }
    };

    if (initOffer) {
      let offer = await pc.createOffer();
      await pc.setLocalDescription(new RTCSessionDescription(offer));

      pc.addIceCandidate = (event) => {
        if (event.candidate) {
          socket.emit("iceCandidate", event.candidate, channelId);
        }
      };

      socket.emit(
        "makeCall",
        {
          offer: offer,
          id: r.socketId,
        },
        channelId
      );
    }
  });
};

const addVideoDiv = (r) => {
  let wrapperDiv = document.createElement("div");
  wrapperDiv.className = `remoteVWrapper`;
  wrapperDiv.id = r.socketId + "__";

  let userDiv = document.createElement("div");
  userDiv.className = `uName`;
  userDiv.innerHTML = r.username;

  let videoEle = document.createElement("video");
  videoEle.id = r.socketId;
  videoEle.autoplay = true;
  videoEle.className = "remoteV boxShadow";

  wrapperDiv.appendChild(userDiv);
  wrapperDiv.appendChild(videoEle);

  document.getElementsByClassName("remoteVideos")[0].appendChild(wrapperDiv);
};

initVideoConf();
