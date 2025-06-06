const express = require('express');
const cors = require('cors'); // Import CORS middleware
const app = express();
const http = require('http').createServer(app);
// Initialize Socket.IO with the HTTP server and CORS options
const io = require('socket.io')(http, {
    cors: {
        origin: "*", // Allows connections from any origin. For production, restrict this to your frontend domain.
        methods: ["GET", "POST"] // Allowed HTTP methods for CORS requests
    }
});
const path = require('path');
const port = process.env.PORT || 4000; // Use port from environment variable or default to 4000

// Enable CORS for all Express routes
app.use(cors());

// Serve static files from the 'public' directory.
// This means files like home.html, index.html, script.js, style.css will be accessible directly.
app.use(express.static(path.join(__dirname, 'public')));

// Route for the home page.
// When a user visits '/', home.html is served. This page allows creating new chat rooms.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Route for dynamic chat rooms.
// When a user visits '/chat/someRoomId', index.html (the chat interface) is served.
app.get('/chat/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection handling
io.on("connection", socket => {
    console.log('A user connected with ID:', socket.id); // Log when a new user connects

    // Listen for 'join-room' event from clients
    socket.on("join-room", roomId => {
        // Basic validation for roomId
        if (typeof roomId !== 'string' || roomId.trim() === '') {
            console.warn(`User ${socket.id} attempted to join with invalid roomId: "${roomId}"`);
            return;
        }

        socket.join(roomId); // Add the client's socket to the specified room
        console.log(`User ${socket.id} joined room: "${roomId}"`);

        // Listen for 'chat-message' events from clients in this room
        socket.on("chat-message", (roomName, message) => {
            // Ensure the message is sent to the correct room.
            // `socket.to(roomName).emit(...)` sends the message to all clients in `roomName` EXCEPT the sender.
            socket.to(roomName).emit("chat-message", message);
            console.log(`Message in room "${roomName}" from ${socket.id}: "${message}"`);
        });

        // Listen for 'typing' events from clients in this room
        socket.on("typing", (roomName) => {
            // Emit 'typing' event to all clients in `roomName` EXCEPT the sender
            socket.to(roomName).emit("typing");
            console.log(`User ${socket.id} is typing in room: "${roomName}"`);
        });

        // Listen for socket disconnection
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // You could optionally broadcast a 'user-left' message to the room here if needed
        });
    });
});

// Start the HTTP server
http.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
