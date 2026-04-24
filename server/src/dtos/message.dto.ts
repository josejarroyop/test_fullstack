import { z } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * CreateMessageDto — valida el body de POST /message.
 * Nota: user_id NO viene del body; lo inyecta el middleware de auth desde el JWT.
 * Por eso el DTO solo contempla "content".
 */
export const CreateMessageSchema = z.object({
  content: z
    .string({ error: 'content es obligatorio y debe ser texto' })
    .trim()
    .min(1, 'El contenido no puede estar vacío')
    .max(2000, 'El contenido no puede superar 2000 caracteres'),
});
export type CreateMessageDto = z.infer<typeof CreateMessageSchema>;

export const parseCreateMessageDto = (input: unknown): CreateMessageDto => {
  const result = CreateMessageSchema.safeParse(input);
  if (!result.success) {
    throw AppError.badRequest(result.error.issues[0].message);
  }
  return result.data;
};

/**
 * UpdateMessageDto — para un futuro PATCH /message/:id.
 * Por ahora solo permite editar el contenido.
 * Se usa .partial() para que los campos sean opcionales en un PATCH,
 * pero se añade .refine() para exigir que al menos un campo venga.
 */
export const UpdateMessageSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, 'El contenido no puede estar vacío')
      .max(2000, 'El contenido no puede superar 2000 caracteres'),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  });
export type UpdateMessageDto = z.infer<typeof UpdateMessageSchema>;

export const parseUpdateMessageDto = (input: unknown): UpdateMessageDto => {
  const result = UpdateMessageSchema.safeParse(input);
  if (!result.success) {
    throw AppError.badRequest(result.error.issues[0].message);
  }
  return result.data;
};
