// Capa fina sobre socket.io-client.
// El store llama connect() cuando hay token y disconnect() en logout.

import { io, Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  // Si ya hay uno conectado, lo reutilizamos.
  if (socket && socket.connected) return socket;

  // Si existe pero esta desconectado, lo cerramos antes.
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(URL, {
    // El server lee el token en el handshake (io.use middleware).
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;
