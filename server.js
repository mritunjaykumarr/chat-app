const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const port = process.env.PORT || 4000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/home.html'));
});

app.get('/chat/:room', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

io.on("connection", socket => {
  console.log('A user connected');

  socket.on("join-room", roomId => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);

    socket.on("chat-message", message => {
      socket.to(roomId).emit("chat-message", message);
    });

    socket.on("typing", () => {
      socket.to(roomId).emit("typing");
    });
  });
});

http.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
