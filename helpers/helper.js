let timerIds = {
  keyup: null,
  keydown: null,
};

var audio = new Audio("../audio/notification.ogg");

const appendMessage = (msg, time, type, name) => {
  let ts = getTimeStamp(time);

  let wrapperDiv = document.createElement("div");
  wrapperDiv.className = `msgWrapper`;

  let msgDiv = document.createElement("div");
  msgDiv.className = `msg ${type}`;

  let textDiv = document.createElement("div");
  textDiv.className = `text`;
  textDiv.innerHTML = msg;

  let senderNameDiv = document.createElement("div");
  senderNameDiv.className = `senderName`;
  senderNameDiv.innerHTML = name;

  let timestampDiv = document.createElement("div");
  timestampDiv.className = `timestamp`;
  timestampDiv.innerHTML = ts;

  if (name) msgDiv.appendChild(senderNameDiv);

  msgDiv.appendChild(textDiv);
  msgDiv.appendChild(timestampDiv);

  wrapperDiv.appendChild(msgDiv);
  document.getElementsByClassName("chatContainer")[0].appendChild(wrapperDiv);
  scrollToBottom();
};

const getTimeStamp = (time) => {
  return new Date(time).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "numeric",
    minute: "numeric",
  });
};

const saveInLocalStorage = (action, data) => {
  localStorage.setItem(action, JSON.stringify(data));
};

const getFormLocalStorage = (action) => {
  let data = localStorage.getItem(action);
  if (data) return JSON.parse(data);
  return null;
};

const deleteFromLocalStorage = (action) => {
  localStorage.removeItem(action);
};

const throttleFunction = (func, delay, type) => {
  if (timerIds[type]) {
    return;
  }
  timerIds[type] = setTimeout(() => {
    func();
    timerIds[type] = null;
  }, delay);
};

const scrollToBottom = () => {
  setTimeout(() => {
    var element = document.getElementsByClassName("chatContainer")[0];
    element.scrollTop = element.scrollHeight;
  }, 200);
};

const getMediaPermissionOptions = (type) => {
  let options = {
    audio: { echoCancellation: true },
    video: {
      facingMode: "user", // user, enviroment
      width: {
        min: 640,
        max: 1024,
      },
      height: {
        min: 480,
        max: 768,
      },
    },
  };

  switch (type) {
    case "audio":
      options.video = false;
      break;

    case "video":
      options.audio = false;
      break;

    default:
      break;
  }

  return options;
};

function handleError(error, options) {
  let errorText = "";
  if (error.name === "ConstraintNotSatisfiedError") {
    const v = options.video;
    errorText = `The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.`;
  } else if (error.name === "PermissionDeniedError") {
    errorText =
      "Permissions have not been granted to use your camera and " +
      "microphone, you need to allow the page access to your devices in " +
      "order for the demo to work.";
  } else {
    errorText = `getUserMedia error: ${error.name}`;
  }

  return errorText;
}

const getMediaServerConf = () => {
  // public server creds
  return {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        url: "turn:numb.viagenie?transport=udp",
        credential: "abhi@2323",
        username: "coolabby2314@gmail.com",
      },
    ],
  };
};

const stopMediaStream = (stream) => {
  stream.getTracks().forEach((track) => track.stop());
};

const toogleAudio = (localStream) => {
  localStream.getAudioTracks().forEach((media) => {
    media.enabled = !media.enabled;
    document.getElementsByClassName(
      "btnToogleAudio"
    )[0].innerText = media.enabled ? "Audio Enabled" : "Audio Disabled";
  });
};

const toogleVideo = (localStream) => {
  localStream.getVideoTracks().forEach((media) => {
    media.enabled = !media.enabled;
    document.getElementsByClassName(
      "btnToogleVideo"
    )[0].innerText = media.enabled ? "Video Enabled" : "Video Disabled";
  });
};
