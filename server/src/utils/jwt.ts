import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from './AppError';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido en las variables de entorno');
}

// Nota: según la decisión de diseño, el token no tiene expiración.
// Si más adelante quieres activarla, pasa { expiresIn: '24h' } a signToken
// o cambia DEFAULT_OPTIONS.
const DEFAULT_OPTIONS: SignOptions = {};

export interface JwtPayload {
  id: string;
  username: string;
}

export const signToken = (payload: JwtPayload, options: SignOptions = DEFAULT_OPTIONS): string => {
  return jwt.sign(payload, JWT_SECRET as string, options);
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string);
    if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
      throw AppError.unauthorized('Token inválido');
    }
    const { id, username } = decoded as JwtPayload;
    if (!id || !username) {
      throw AppError.unauthorized('Token con payload incompleto');
    }
    return { id, username };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Token inválido o expirado');
  }
};
