const path = require("path");
const http = require("http");
// const https = require("https");
const { Server } = require("socket.io");
const fs = require("fs");

const express = require("express");
const app = express();

// http
const server = http.createServer(app);

// https
// const server = https.createServer(
//   {
//     key: fs.readFileSync(path.join(__dirname, "key.pem")),
//     cert: fs.readFileSync(path.join(__dirname, "cert.pem")),
//   },
//   app
// );

const io = new Server(server);

const rooms = new Map(); // Mapa para armazenar as salas criadas


io.on("connection", (socket) => {
  const playerId = socket.id;

  function emitRoomListSocket() {
    const roomList = Array.from(rooms.values());
    socket.emit('roomList', roomList);
  }

  function emitRoomListIo() {
    const roomList = Array.from(rooms.values());
    io.emit('roomList', roomList);
  }

  // Enviar o ID do socket para o cliente
  socket.emit("playerConnected", playerId);

  // Evento para criar uma nova sala
  socket.on('createRoom', roomName => {
    const room = {
      name: roomName,
      players: [socket.id],
      spectators: []
    };
    rooms.set(roomName, room);
    socket.join(roomName);
    socket.emit('roomCreated', room);
    console.log(`Sala "${roomName}" criada.`);
    console.log('aqui 3');
    emitRoomListIo()
  });

  // Evento para listar todas as salas
  socket.on('listRooms', () => {
    console.log('aqui 2');
    emitRoomListSocket()
  });

  // Evento para entrar em uma sala existente
  socket.on('joinRoom', roomName => {
    const room = rooms.get(roomName);
    if (room) {
      room.players.push(socket.id);

      socket.join(roomName);
      socket.emit('roomJoined', room);

      if (room.players.length === 2) {
        io.to(roomName).emit('startGame', room);
        emitRoomListIo()
      }
    }
  });

  socket.on('joinRoomAsSpectator', roomName => {
    console.log('joinRoomAsSpectator', roomName);
    const room = rooms.get(roomName);
    if (room) {
      socket.join(roomName);

      room.spectators.push(socket.id);
      socket.emit('joinAsEspectatorClient', { room, spectatorId: socket.id });
      emitRoomListIo()
    }
  });

  // Evento para lidar com a desconexão do jogador
  socket.on('disconnect', () => {
    const roomName = getRoomNameBySocketId(socket.id);
    if (roomName) {
      const room = rooms.get(roomName);
      if (room) {
        room.players = room.players.filter(playerId => playerId !== socket.id);
        room.spectators = room.spectators.filter(spectatorsId => spectatorsId !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(roomName);
          console.log(`Sala "${roomName}" foi removida.`);
          emitRoomListIo()
        } else {
          io.to(roomName).emit('playerLeft', socket.id);
          emitRoomListIo()
        }
      }
    }
  });

  // Evento para lidar com a desconexão do jogador
  socket.on('quitRoom', () => {
    const roomName = getRoomNameBySocketId(socket.id);
    if (roomName) {
      const room = rooms.get(roomName);
      if (room) {
        room.players = room.players.filter(playerId => playerId !== socket.id);
        room.spectators = room.spectators.filter(spectatorsId => spectatorsId !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(roomName);
          console.log(`Sala "${roomName}" foi removida.`);
          emitRoomListIo()
        } else {
          io.to(roomName).emit('playerLeft', socket.id);
          emitRoomListIo()
        }
      }
    }
  });

  socket.on('updateBoard', data => {
    // Lidar com o movimento das peças e atualização do tabuleiro
    const roomName = getRoomNameBySocketId(socket.id);
    if (roomName) {
      io.to(roomName).emit('jogada', data); // Envia a atualização para os jogadores na sala
    }
  });

  socket.on('removePiece', data => {
    // Lidar com o movimento das peças e atualização do tabuleiro
    const roomName = getRoomNameBySocketId(socket.id);
    if (roomName) {
      io.to(roomName).emit('removerPeca', data); // Envia a atualização para os jogadores na sala
    }
  });

  // Função auxiliar para obter o nome da sala com base no ID do socket
  function getRoomNameBySocketId(socketId) {
    for (const [roomName, room] of rooms.entries()) {
      if (room.players.includes(socketId)) {
        return roomName;
      } else if (room.spectators.includes(socketId)) {
        return roomName;
      }
    }
    return null;
  }
});

app.set(".", "html");
console.log(__dirname);
console.log(path.join(__dirname, "/"));
app.use(express.static(path.join(__dirname, "/")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  console.log(req);
  console.log(res);
  res.sendFile("index.html");
});

server.listen(3000, () => {
  console.log("Rodando na porta 3000");
});
