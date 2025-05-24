// Connect to your deployed backend
const socket = io('https://chat-app-z0yp.onrender.com');

// Get room ID from the URL
const room = window.location.pathname.split("/").pop();
document.getElementById("room-id").innerText = room;

// UI Elements
const msgInput = document.getElementById("msg");
const messages = document.getElementById("messages");
const sendBtn = document.getElementById("send-btn");
const copyBtn = document.getElementById("copy-btn");

// Append message
function appendMessage(message, position) {
  const div = document.createElement("div");
  div.textContent = message;
  div.style.textAlign = position === "right" ? "right" : "left";
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// Emit join room
socket.emit("join-room", room);

// Send message
function sendMessage() {
  const message = msgInput.value.trim();
  if (message) {
    appendMessage("You: " + message, "right");
    socket.emit("chat-message", message);
    msgInput.value = "";
  }
}
sendBtn.addEventListener("click", sendMessage);

// Typing
msgInput.addEventListener("input", () => {
  socket.emit("typing", room);
});

socket.on("chat-message", (message) => {
  appendMessage("Friend: " + message, "left");
});

socket.on("typing", () => {
  document.getElementById("typing-status").innerText = "Friend is typing...";
  clearTimeout(window.typingTimeout);
  window.typingTimeout = setTimeout(() => {
    document.getElementById("typing-status").innerText = "";
  }, 1000);
});

// Copy invite link
copyBtn.addEventListener("click", () => {
  const inviteLink = window.location.href;
  navigator.clipboard.writeText(inviteLink).then(() => {
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy Invite Link"), 2000);
  });
});
