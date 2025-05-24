// Connect to backend on Render
const socket = io('https://chat-app-z0yp.onrender.com');

const room = window.location.pathname.split("/").pop();
document.getElementById("room-id").innerText = room;

const msgInput = document.getElementById("msg");
const messages = document.getElementById("messages");
const sendBtn = document.getElementById("send-btn");
const copyBtn = document.getElementById("copy-btn");

function appendMessage(message, position) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", position);
  msgDiv.textContent = message;
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
}

function sendMessage() {
  const message = msgInput.value.trim();
  if (message) {
    appendMessage(`You: ${message}`, "right"); // Show your message
    socket.emit("chat-message", message);
    msgInput.value = "";
  }
}

sendBtn.addEventListener("click", sendMessage);

msgInput.addEventListener("input", () => {
  socket.emit("typing", room);
});

socket.on("typing", () => {
  document.getElementById("typing-status").innerText = "Typing...";
  clearTimeout(window.typingTimeout);
  window.typingTimeout = setTimeout(() => {
    document.getElementById("typing-status").innerText = "";
  }, 1000);
});

socket.emit("join-room", room);

socket.on("chat-message", (message) => {
  appendMessage(`Friend: ${message}`, "left");
});

copyBtn.addEventListener("click", () => {
  const link = window.location.href;
  navigator.clipboard.writeText(link).then(() => {
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy Invite Link"), 2000);
  });
});
