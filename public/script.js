// Connect to the Socket.IO server. By default, it connects to the host that served the page.
const socket = io();

// Extract room ID from the current window's pathname.
// Example: if URL is /chat/abc123, pathParts will be ["", "chat", "abc123"]
const pathParts = window.location.pathname.split('/');
const room = pathParts[pathParts.length - 1]; // Get the last part, which should be the room ID

// Validate the extracted room ID.
// Using a custom message box instead of alert() for better user experience in an iFrame.
if (!room || room === "chat" || !/^[a-z0-9]{6}$/.test(room)) {
    // Create a message container element
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #f8d7da; /* Light red background */
        color: #721c24; /* Dark red text */
        border: 1px solid #f5c6cb; /* Red border */
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        font-family: 'Inter', sans-serif;
        text-align: center;
        max-width: 80%;
    `;
    messageContainer.textContent = "Error: Room ID missing or invalid in URL. Redirecting to home page...";
    document.body.appendChild(messageContainer); // Add message to the body

    // Remove message after a delay and redirect to home page
    setTimeout(() => {
        messageContainer.remove(); // Remove the message box
        window.location.href = '/'; // Redirect to the home page
    }, 3000); // Display for 3 seconds

    // Stop script execution as the room ID is invalid
    throw new Error("Invalid room ID or missing. Script halted.");
}

// Display the room ID in the UI
document.getElementById("room-id").innerText = room;

// Get references to UI elements
const msgInput = document.getElementById("msg");
const messages = document.getElementById("messages");
const sendBtn = document.getElementById("send-btn");
const copyBtn = document.getElementById("copy-btn");
const typingStatusDiv = document.getElementById("typing-status");

/**
 * Appends a new message to the chat display.
 * @param {string} message - The text content of the message.
 * @param {'left'|'right'} position - Alignment of the message ('left' for friend, 'right' for self).
 */
function appendMessage(message, position) {
    const div = document.createElement("div");
    // Apply Tailwind classes for styling messages: rounded corners, padding, margin, max-width, colors
    div.className = `p-2 my-1 rounded-lg max-w-[70%] text-sm ${position === "right" ? 'bg-blue-500 text-white ml-auto' : 'bg-gray-200 text-gray-800 mr-auto'}`;
    div.textContent = message;
    messages.appendChild(div);
    // Scroll to the bottom of the messages container to show the latest message
    messages.scrollTop = messages.scrollHeight;
}

// Emit 'join-room' event to the server when the client connects
socket.emit("join-room", room);

/**
 * Sends a chat message when the send button is clicked or Enter is pressed.
 */
function sendMessage() {
    const message = msgInput.value.trim(); // Get message text and remove leading/trailing whitespace
    if (message) { // Only send if message is not empty
        appendMessage("You: " + message, "right"); // Display message on the right (local user)
        socket.emit("chat-message", room, message); // Emit message to the server, including the room ID
        msgInput.value = ""; // Clear the input field
    }
}

// Add event listener for the send button click
sendBtn.addEventListener("click", sendMessage);

// Add event listener for the Enter key press in the message input field
msgInput.addEventListener("keypress", (e) => {
    if (e.key === 'Enter') { // Check if the pressed key is Enter
        sendMessage(); // Send the message
    }
});

// Listen for 'chat-message' events from the server
socket.on("chat-message", (message) => {
    appendMessage("Friend: " + message, "left"); // Display received message on the left (friend)
});

// Listen for 'typing' events from the server
socket.on("typing", () => {
    typingStatusDiv.innerText = "Friend is typing..."; // Show typing status
    clearTimeout(window.typingTimeout); // Clear any existing timeout
    // Set a new timeout to clear the typing status after a short period
    window.typingTimeout = setTimeout(() => {
        typingStatusDiv.innerText = "";
    }, 1500); // Clear after 1.5 seconds
});

// Event listener for copying the invite link
copyBtn.addEventListener("click", () => {
    const inviteLink = window.location.href; // Get the current full URL including the room ID
    // Use document.execCommand('copy') for clipboard operations in iFrames, as navigator.clipboard might be restricted.
    try {
        // Create a temporary textarea to hold the text to copy
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = inviteLink;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);

        copyBtn.textContent = "Copied!"; // Change button text to indicate success
        setTimeout(() => (copyBtn.textContent = "Copy Invite Link"), 2000); // Revert text after 2 seconds
    } catch (err) {
        console.error('Failed to copy text:', err);
        // Fallback for browsers that don't support document.execCommand('copy') well
        copyBtn.textContent = "Copy Failed!";
        setTimeout(() => (copyBtn.textContent = "Copy Invite Link"), 2000);
    }
});
