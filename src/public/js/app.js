const socket = io(); // initialize socket.io connection

// get DOM elements
const call = document.getElementById("call");
const myFace = document.getElementById("myFace");
const peersFace = document.getElementById("peersFace");
const micBtn = document.getElementById("mic");
const cameraBtn = document.getElementById("camera");
const leaveBtn = document.getElementById("leave");
const camerasSelect = document.getElementById("cameras");
const audiosSelect = document.getElementById("audios");
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

// set initial values
call.hidden = true;
let myStream;
let micOff = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

// Welcome Container with Form (join a room)
// Hide the welcome form and show the call interface, then get media and create the peer connection object
async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia("", "camera");
  makeConnection();
}

// Handle the submission of the welcome form (joining a room)
async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await initCall();
  socket.emit("join_room", input.value); // Send a "join_room" message to the server with the room name
  roomName = input.value; // Save the room name in the global variable
  input.value = ""; // Reset the input field
}

// Add an event listener to the welcome form's submit event
welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Call Container (interact in a room)
// get available cameras and populate the dropdown menu
async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];

    // create option elements for each camera and add them to the select element
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      option.id = "camera";

      // set the current camera as selected
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

// Create option element for share screen and append to the existing dropdown
async function addShareScreen() {
  try {
    const option = document.createElement("option");
    option.id = "screen";
    option.innerText = "Share Screen";
    camerasSelect.appendChild(option);
  } catch (e) {
    console.log(e);
  }
}

// get available audios and populate the dropdown menu
async function getAudios() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audios = devices.filter((device) => device.kind === "audioinput");
    const currentAudio = myStream.getAudioTracks()[0];

    // create option elements for each camera and add them to the select element
    audios.forEach((audio) => {
      const option = document.createElement("option");
      option.value = audio.deviceId;
      option.innerText = audio.label;
      option.id = "audio";

      // set the current camera as selected
      if (currentAudio.label === audio.label) {
        option.selected = true;
      }
      audiosSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

// get media stream based on the given device id and media id
async function getMedia(deviceId, mediaId) {
  const initialConstraints = {
    audio: true,
    video: {
      facingMode: "user",
      width: { min: 640, ideal: 1920, max: 1920 },
      height: { min: 480, ideal: 1080, max: 1080 },
    },
  };
  const cameraConstraints = {
    audio: true,
    video: {
      deviceId: { exact: deviceId },
      width: { min: 640, ideal: 1920, max: 1920 },
      height: { min: 480, ideal: 1080, max: 1080 },
    },
  };

  const screenConstraints = {
    audio: false,
    video: {
      displaySurface: "window",
      cursor: "always",
    },
    surfaceSwitching: "include",
    selfBrowserSurface: "exclude",
    systemAudio: "include",
  };

  const audioConstraints = {
    audio: {
      deviceId: { exact: deviceId },
    },
    video: true,
  };

  try {
    if (mediaId === "camera") {
      myStream = await navigator.mediaDevices.getUserMedia(
        deviceId ? cameraConstraints : initialConstraints
      );
    } else if (mediaId === "screen") {
      myStream = await navigator.mediaDevices.getDisplayMedia(
        screenConstraints
      );
    } else if (mediaId === "audio") {
      myStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
    }

    myFace.srcObject = myStream;

    // if no device id is provided, get available cameras and audios
    if (!deviceId) {
      await getCameras();
      await addShareScreen();
      await getAudios();
    }
  } catch (e) {
    console.log(e);
  }
}

// handle mic button click event
function handleMicClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));

  if (!micOff) {
    micBtn.innerHTML = `<s>Mic.<s>`;
    micBtn.classList.add("secondary", "outline");
    micOff = true;
  } else {
    micBtn.innerText = "Mic.";
    micBtn.classList.remove("secondary", "outline");
    micOff = false;
  }
}

// handle camera button click event
function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));

  if (!cameraOff) {
    cameraBtn.innerHTML = `<s>Camera<s>`;
    cameraBtn.classList.add("secondary", "outline");
    cameraOff = true;
  } else {
    cameraBtn.innerText = "Camera";
    cameraBtn.classList.remove("secondary", "outline");
    cameraOff = false;
  }
}

// handle camera selection change event
async function handleCameraChange() {
  const mediaId = camerasSelect.options[camerasSelect.selectedIndex].id;
  await getMedia(camerasSelect.value, mediaId);

  // if a peer connection exists, replace the video track with the new stream
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}

// handle audio selection change event
async function handleAudioChange() {
  const mediaId = audiosSelect.options[audiosSelect.selectedIndex].id;
  await getMedia(audiosSelect.value, mediaId);

  // if a peer connection exists, replace the audio track with the new stream
  if (myPeerConnection) {
    const audioTrack = myStream.getAudioTracks()[0];
    const audioSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "audio");
    audioSender.replaceTrack(audioTrack);
  }
}

// Handle the "Leave room" button click event
async function handleLeaveClick(event) {
  // Disconnect peer connection (WebRTC)
  myPeerConnection.close();
  myPeerConnection = null;
  myDataChannel = null;

  // Stop myStream
  myStream.getTracks().forEach((track) => {
    track.stop();
  });

  // Stop PeersStream
  if (peersFace?.srcObject) {
    handleRemoveStream();
  }

  // Send "leave-room" message to server
  socket.emit("leave_room", roomName);
  console.log("Sent leave_room message");

  // Display the Welcome Form
  welcome.hidden = false;
  call.hidden = true;
  roomName = "";
}

// add event listeners for mic, camera, and camera selection elements
micBtn.addEventListener("click", handleMicClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);
audiosSelect.addEventListener("input", handleAudioChange);
leaveBtn.addEventListener("click", handleLeaveClick);

// Socket Events
// Set up socket event listeners
socket.on("welcome", async () => {
  // When the server sends a "welcome" message
  myDataChannel = myPeerConnection.createDataChannel("chat"); // Create a new data channel named "chat"
  myDataChannel.addEventListener("message", (event) => console.log(event.data)); // Log any incoming messages to the console
  console.log("made data channel available");
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  // When the server sends an "offer" message
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) =>
      console.log(event.data)
    );
  }); // Set up the data channel to listen for messages
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});

socket.on("answer", (answer) => {
  // When the server sends an "answer" message
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  // When the server sends an "ice" message
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

socket.on("bye", async () => {
  // When the server sends a "bye" message
  console.log("received the bye");

  // Stop PeersStream
  if (peersFace?.srcObject) {
    handleRemoveStream();
  }

  // Close and Create new RTCPeerConnection to standby for peer
  regenerateConnection();
});

// RTC Code
// Creates a new RTCPeerConnection with the given iceServers configuration
function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: [
          "turn:eu-0.turn.peerjs.com:3478",
          "turn:us-0.turn.peerjs.com:3478",
        ],
        username: "peerjs",
        credential: "peerjsp",
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("track", handleAddStream);
  myStream.getTracks().forEach((track) => {
    myPeerConnection.addTrack(track, myStream);
  });

  // add event listeners for ice connection state change and connection state change
  myPeerConnection.addEventListener("iceconnectionstatechange", () => {
    console.log(
      `ICE connection state changed to ${myPeerConnection.iceConnectionState}`
    );
    if (myPeerConnection.iceConnectionState === "disconnected") {
      // handle disconnected state
      console.log("Peer connection lost");
      handleRemoveStream();
      regenerateConnection();
    } else if (myPeerConnection.iceConnectionState === "failed") {
      // handle failed state
      console.log("Peer connection failed");
      regenerateConnection();
    }
  });
}

// Emits the "ice" event with the candidate and roomName data to the socket.
function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
}

// Sets the srcObject of the peersFace element to the track stream.
function handleAddStream(track) {
  peersFace.srcObject = track.streams[0];
}

// Sets the srcObject of the peersFace element to the null.
function handleRemoveStream() {
  peersFace.srcObject.getTracks().forEach((track) => {
    track.stop();
  });
  peersFace.srcObject = null;
}

// Close myPeerConnection and Create new RTCPeerConnection
async function regenerateConnection() {
  await myPeerConnection.close();
  myPeerConnection = undefined;
  makeConnection();
}
