import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';
import { parseCreateUserDto, parseLoginDto } from '../dtos/user.dto';

const SALT_ROUNDS = 10;

export const AuthService = {
  register: async (input: unknown) => {
    // El DTO es el cadenero: si no pasa, no llega a la BD.
    const { username, password } = parseCreateUserDto(input);

    const existing = await UserRepository.findByUsername(username);
    if (existing) {
      throw AppError.conflict('El username ya está en uso');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await UserRepository.create(username, passwordHash);

    const token = signToken({ id: user.id, username: user.username });
    return { user, token };
  },

  login: async (input: unknown) => {
    const { username, password } = parseLoginDto(input);

    const user = await UserRepository.findByUsername(username);
    if (!user) {
      throw AppError.unauthorized('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw AppError.unauthorized('Credenciales inválidas');
    }

    const token = signToken({ id: user.id, username: user.username });
    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  },
};
