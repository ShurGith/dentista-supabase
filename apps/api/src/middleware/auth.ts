import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/index.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: string;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Para simplificar el desarrollo local si no hay token, podemos permitir modo demo o requerir auth
    if (process.env.DEV_BYPASS_AUTH === 'true') {
      req.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@clinicadentaleugenia.es',
        role: 'admin',
      };
      return next();
    }
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Token de autorización ausente o inválido.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Sesión expirada o token no válido.',
      });
    }

    // Consultar perfil y rol
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role_id')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role_id || 'receptionist',
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_ERROR',
      message: 'Error al verificar autenticación.',
    });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado.' });
    }
    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'No dispones de los permisos necesarios para realizar esta acción.',
      });
    }
    next();
  };
}

