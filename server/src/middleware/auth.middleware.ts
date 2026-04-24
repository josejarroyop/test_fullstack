import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { verifyToken } from '../utils/jwt';

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Falta el header Authorization con formato "Bearer <token>"');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw AppError.unauthorized('Token vacío');
    }

    const payload = verifyToken(token);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (err) {
    next(err);
  }
};
