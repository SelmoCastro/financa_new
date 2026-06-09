/**
 * Tipo compartilhado do backend; descreve a estrutura de objetos usados entre guards, controllers e services.
 */
import { Request } from 'express';

export interface RequestWithUser extends Request {
  user: {
    userId: string;
    email?: string;
    isAdmin?: boolean;
  };
}
