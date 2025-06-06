const express = require('express');
const cors = require('cors'); // Import CORS middleware for handling cross-origin requests
const app = express();
const http = require('http').createServer(app); // Create an HTTP server using the Express app
// Initialize Socket.IO with the HTTP server and configure CORS
const io = require('socket.io')(http, {
    cors: {
        origin: "*", // Allow connections from any origin. For production, consider restricting this to your Vercel frontend domain (e.g., 'https://your-vercel-app-domain.vercel.app').
        methods: ["GET", "POST"] // Specify allowed HTTP methods for CORS requests
    }
});
const path = require('path'); // Node.js built-in module for working with file and directory paths
const port = process.env.PORT || 4000; // Define the port, defaulting to 4000 if not set by environment

// Enable CORS for all Express routes. This is important for the frontend (Vercel) to communicate with the backend (Render).
app.use(cors());

// Serve static files from the 'public' directory.
// This makes HTML, CSS, and JavaScript files placed in 'public' accessible directly from the web server.
app.use(express.static(path.join(__dirname, 'public')));

// Define a route for the root URL ('/').
// When a user visits the root, the 'home.html' file from the 'public' directory is sent.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Define a dynamic route for chat rooms (e.g., '/chat/someRoomId').
// When a user visits such a URL, the 'index.html' file (your main chat interface) is served.
app.get('/chat/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Set up Socket.IO connection handling
io.on("connection", socket => {
    console.log('A user connected with Socket ID:', socket.id); // Log when a new client connects

    // Listen for 'join-room' events emitted by clients
    socket.on("join-room", roomId => {
        // Basic validation for the received roomId to prevent joining invalid rooms
        if (typeof roomId !== 'string' || roomId.trim() === '' || roomId === "chat") {
            console.warn(`User ${socket.id} attempted to join with an invalid or empty room ID: "${roomId}"`);
            return; // Exit if the room ID is invalid
        }

        socket.join(roomId); // Add the client's socket to the specified Socket.IO room
        console.log(`User ${socket.id} joined room: "${roomId}"`);

        // Listen for 'chat-message' events from this client within this specific room
        // The message is broadcast to all clients in the room *except* the sender.
        socket.on("chat-message", (roomName, message) => {
            socket.to(roomName).emit("chat-message", message);
            console.log(`Message in room "${roomName}" from ${socket.id}: "${message}"`);
        });

        // Listen for 'typing' events from this client within this specific room
        // The 'typing' notification is broadcast to all clients in the room *except* the sender.
        socket.on("typing", (roomName) => {
            socket.to(roomName).emit("typing");
            console.log(`User ${socket.id} is typing in room: "${roomName}"`);
        });

        // Listen for when this specific socket disconnects
        socket.on('disconnect', () => {
            console.log('User disconnected from chat:', socket.id);
            // Optionally, you could emit a 'user-left' message to the room here
        });
    });
});

// Start the HTTP server and listen for incoming connections on the defined port
http.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
