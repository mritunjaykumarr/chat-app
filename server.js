const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');

const port = process.env.PORT || 4000;

// Serve static files
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

app.get('/chat/:room', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Socket.io handling
io.on('connection', socket => {
  socket.on('join-room', roomId => {
    socket.join(roomId);

    socket.on('chat-message', message => {
      socket.to(roomId).emit('chat-message', message);
    });
  });
});

// Start server
http.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
