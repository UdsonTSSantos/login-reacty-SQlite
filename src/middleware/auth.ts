import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';



const JWT_SECRET = process.env.JWT_SECRET || 'super_segredo_123';

export interface CustomRequest extends Request {
  usuarioLogado?: {
    id: number;
    email: string;
    empresa: string;
    isSuperAdmin: boolean;
  };
}

export function verificarToken(req: CustomRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.usuarioLogado = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Sessão inválida ou expirada.' });
  }
}

export function somenteSuperAdmin(req: CustomRequest, res: Response, next: NextFunction) {
  if (!req.usuarioLogado?.isSuperAdmin) {
    return res.status(403).json({ message: 'Permissão negada. Apenas o Super Admin realiza esta ação.' });
  }
  next();
}
