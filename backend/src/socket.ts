import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config.js';

let io: Server | null = null;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.join('conversations');
  });

  return io;
}

export function emitSocketEvent(event: string, payload: unknown) {
  io?.to('conversations').emit(event, payload);
}
