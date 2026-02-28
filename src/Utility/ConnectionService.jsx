import { io } from "socket.io-client";

let socket = null;

export const initializeSocket = (token, username) => {
  if (socket) {
    return socket; // Return existing socket if already connected
  }

  socket = io("http://192.168.1.110:6800", {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: {
      token: token
    },
  });

  // Join user-specific room after connection
  socket.on('connect', () => {
    console.log('Socket connected, joining room for user:', username);
    socket.emit('join_room', username);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};