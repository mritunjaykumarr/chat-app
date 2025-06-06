const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Set up Socket.IO
const io = require('socket.io')(server, {
  cors: {
    origin: "*", // Replace with your frontend domain if needed
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Serve home.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Serve index.html for chat rooms
app.get('/chat/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO logic
io.on('connection', socket => {
  console.log('A user connected');

  socket.on('join-room', roomId => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);

    // Relay messages
    socket.on('chat-message', message => {
      socket.to(roomId).emit('chat-message', message);
    });

    // Typing indicator
    socket.on('typing', () => {
      socket.to(roomId).emit('typing');
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
