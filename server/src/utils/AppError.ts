export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }

  // Métodos de Fábrica (¡Aquí ocurre la magia!)
  static badRequest(message: string) {
    return new AppError(message, 400);
  }

  static notFound(message: string) {
    return new AppError(message, 404);
  }

  static internal(message: string) {
    return new AppError(message, 500);
  }

  static unauthorized(message: string) {
    return new AppError(message, 401);
  }

  static forbidden(message: string) {
    return new AppError(message, 403);
  }

  static conflict(message: string) {
    return new AppError(message, 409);
  }
}