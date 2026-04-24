// Extiende el Request de Express con el usuario autenticado.
// El middleware de auth rellena req.user tras verificar el JWT.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
      };
    }
  }
}

export {};
