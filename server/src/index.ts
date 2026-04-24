import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

import { MessageRepository } from './repositories/message.repository';
import { UserRepository } from './repositories/user.repository';
import { LikeRepository } from './repositories/like.repository';
import { AuthService } from './services/auth.service';
import { AppError } from './utils/AppError';
import { asyncHandler } from './utils/asyncHandler';
import { authenticate } from './middleware/auth.middleware';
import { verifyToken } from './utils/jwt';
import { parseCreateMessageDto, parseUpdateMessageDto } from './dtos/message.dto';
import { parseUuidParam } from './dtos/params.dto';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ---------- Socket.io: autenticacion JWT en el handshake ----------
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error('unauthorized: falta token'));
  }
  try {
    const payload = verifyToken(token);
    socket.data.user = payload;
    next();
  } catch (err) {
    next(new Error('unauthorized: token invalido'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user as { id: string; username: string };
  console.log(`Cliente conectado: ${socket.id} (user=${user.username})`);
  socket.on('disconnect', () =>
    console.log(`Cliente desconectado: ${socket.id} (user=${user.username})`)
  );
});

app.use(cors());
app.use(express.json());

// ---------- Rutas publicas ----------
app.get('/', (_req, res) => {
  res.json({ message: 'Servidor operativo' });
});

app.post('/auth/register', asyncHandler(async (req: Request, res: Response) => {
  const { user, token } = await AuthService.register(req.body);
  res.status(201).json({ user, token });
}));

app.post('/auth/login', asyncHandler(async (req: Request, res: Response) => {
  const { user, token } = await AuthService.login(req.body);
  res.json({ user, token });
}));

// ---------- Rutas protegidas ----------
app.get('/users', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const users = await UserRepository.findAll();
  res.json(users);
}));

app.post('/message', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { content } = parseCreateMessageDto(req.body);
  const userId = req.user!.id;

  const created = await MessageRepository.create(userId, content);
  const msg = await MessageRepository.findById(created.id, userId);

  res.status(201).json(msg);
  io.emit('message:new', { message: msg });
}));

app.get('/message', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const result = await MessageRepository.findAll(req.user!.id);
  res.json(result);
}));

app.get('/message/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { id } = parseUuidParam(req.params);
  const msg = await MessageRepository.findById(id, req.user!.id);
  if (!msg) {
    throw AppError.notFound('No existe ningun mensaje con ese ID');
  }
  res.json(msg);
}));

app.put('/message/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { id } = parseUuidParam(req.params);
  const { content } = parseUpdateMessageDto(req.body);
  if (!content) {
    throw AppError.badRequest('Debes enviar content');
  }

  const existingMsg = await MessageRepository.findById(id, req.user!.id);
  if (!existingMsg) {
    throw AppError.notFound('No se encontro el mensaje');
  }
  if (existingMsg.user_id !== req.user!.id) {
    throw AppError.forbidden('No puedes editar mensajes de otros usuarios');
  }

  await MessageRepository.update(id, content);
  // Releemos el mensaje con JOIN + contadores para devolver el shape completo.
  const msg = await MessageRepository.findById(id, req.user!.id);

  res.json(msg);
  io.emit('message:updated', { message: msg });
}));

app.delete('/message/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { id } = parseUuidParam(req.params);
  const existingMsg = await MessageRepository.findById(id, req.user!.id);
  if (!existingMsg) {
    throw AppError.notFound('No se encontro el mensaje');
  }
  if (existingMsg.user_id !== req.user!.id) {
    throw AppError.forbidden('No puedes eliminar mensajes de otros usuarios');
  }
  await MessageRepository.delete(id);
  res.json({ message: 'Mensaje eliminado correctamente' });
  io.emit('message:deleted', { id });
}));

// Historial publico: cualquiera autenticado puede ver como evoluciono un mensaje.
app.get('/message/:id/history', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { id } = parseUuidParam(req.params);
  const history = await MessageRepository.getHistory(id);
  if (history.length === 0) {
    throw AppError.notFound('No hay historial para ese mensaje');
  }
  res.json(history);
}));

// ---------- Likes ----------
app.post('/message/:id/like', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { id: messageId } = parseUuidParam(req.params);
  const userId = req.user!.id;

  const msg = await MessageRepository.findById(messageId, userId);
  if (!msg) {
    throw AppError.notFound('No existe ningun mensaje con ese ID');
  }

  try {
    await LikeRepository.create(userId, messageId);
  } catch (err: any) {
    if (err?.code === '23505') {
      throw AppError.conflict('Ya diste like a este mensaje');
    }
    throw err;
  }

  const likes_count = await LikeRepository.countByMessage(messageId);
  res.status(201).json({ message_id: messageId, likes_count, liked_by_me: true });
  io.emit('like:added', { message_id: messageId, user_id: userId, likes_count });
}));

app.delete('/message/:id/like', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { id: messageId } = parseUuidParam(req.params);
  const userId = req.user!.id;

  const removed = await LikeRepository.delete(userId, messageId);
  if (!removed) {
    throw AppError.notFound('No tenias un like sobre este mensaje');
  }

  const likes_count = await LikeRepository.countByMessage(messageId);
  res.json({ message_id: messageId, likes_count, liked_by_me: false });
  io.emit('like:removed', { message_id: messageId, user_id: userId, likes_count });
}));

// ---------- Error handler (al final, tras todas las rutas) ----------
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  console.error('[Unhandled error]', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
