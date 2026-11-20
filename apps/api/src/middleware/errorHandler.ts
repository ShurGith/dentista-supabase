import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const timestamp = new Date().toISOString();

  // 1. Zod Validation Errors
  // Los esquemas de @clinica-eugenia/shared usan su propia copia de zod, así que instanceof no basta.
  if (err instanceof ZodError || (err?.name === 'ZodError' && Array.isArray(err?.issues))) {
    const issues: { path: (string | number)[]; message: string }[] = err.issues || err.errors || [];
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: issues.map(i => i.message).join(' ') || 'Los datos enviados no son válidos.',
      issues: issues.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
      timestamp,
    });
  }

  // 2. PostgreSQL Overlap Exclusion / Conflict Error (from trigger)
  if (err.message && err.message.includes('CONFLICT_')) {
    return res.status(409).json({
      success: false,
      error: 'APPOINTMENT_CONFLICT',
      message: err.message,
      timestamp,
    });
  }

  // 3. Known custom HTTP errors
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: err.code || 'HTTP_ERROR',
      message: err.message || 'Error en la petición.',
      timestamp,
    });
  }

  // 4. Fallback 500
  console.error('[API Error]', err);
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Ha ocurrido un error inesperado en el servidor.',
    timestamp,
  });
}

