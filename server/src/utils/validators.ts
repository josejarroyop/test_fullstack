import { z } from 'zod';
import { AppError } from './AppError';

export const validateUUID = (id: string) => {
  const result = z.string().uuid().safeParse(id);
  
  if (!result.success) {
    throw AppError.badRequest("El formato del ID es inválido (UUID requerido)");
  }
  
  return result.data; 
};
export const getStringParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0]  ?? "";
  return param  ?? "";
};