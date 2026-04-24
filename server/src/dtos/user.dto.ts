import { z } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * CreateUserDto — se usa en POST /auth/register.
 * Es el "cadenero": solo datos que pasan este schema tocan la BD.
 */
export const CreateUserSchema = z.object({
  username: z
    .string({ error: 'username es obligatorio y debe ser texto' })
    .trim()
    .min(3, 'El username debe tener al menos 3 caracteres')
    .max(50, 'El username no puede superar 50 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'El username solo admite letras, números y guion bajo'),
  password: z
    .string({ error: 'password es obligatorio y debe ser texto' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100, 'La contraseña no puede superar 100 caracteres'),
});
export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const parseCreateUserDto = (input: unknown): CreateUserDto => {
  const result = CreateUserSchema.safeParse(input);
  if (!result.success) {
    throw AppError.badRequest(result.error.issues[0].message);
  }
  return result.data;
};

/**
 * LoginDto — se usa en POST /auth/login.
 * Se mantiene separado de CreateUserDto a propósito, aunque hoy sean iguales,
 * para que si mañana agregas "remember me" o algo, no afecte al register.
 */
export const LoginSchema = z.object({
  username: z
    .string({ error: 'username es obligatorio' })
    .trim()
    .min(1, 'username no puede estar vacío')
    .max(50),
  password: z
    .string({ error: 'password es obligatorio' })
    .min(1, 'password no puede estar vacío')
    .max(100),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const parseLoginDto = (input: unknown): LoginDto => {
  const result = LoginSchema.safeParse(input);
  if (!result.success) {
    throw AppError.badRequest(result.error.issues[0].message);
  }
  return result.data;
};
