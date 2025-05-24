const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');
const express = require('express')
const app = express()
const port = process.env.PORT || 4000 

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

app.get('/chat/:room', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on("connection", socket => {
  socket.on("join-room", roomId => {
    socket.join(roomId);

    socket.on("chat-message", message => {
      // Send to everyone in the room *except* the sender
      socket.to(roomId).emit("chat-message", message);
    });
  });
});
