import { z } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * UuidParamSchema — valida parámetros de ruta que deben ser UUID.
 * Útil para :id en GET/DELETE/PATCH /message/:id.
 *
 * Uso:
 *   const { id } = parseUuidParam(req.params);
 */
export const UuidParamSchema = z.object({
  id: z.string({ error: 'id es obligatorio' }).uuid('El id debe ser un UUID válido'),
});
export type UuidParamDto = z.infer<typeof UuidParamSchema>;

export const parseUuidParam = (input: unknown): UuidParamDto => {
  const result = UuidParamSchema.safeParse(input);
  if (!result.success) {
    throw AppError.badRequest(result.error.issues[0].message);
  }
  return result.data;
};
