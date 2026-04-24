import { Request, Response, NextFunction, RequestHandler } from 'express';

// Definimos que recibe una función de tipo RequestHandler
export const asyncHandler = (fn: RequestHandler) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };