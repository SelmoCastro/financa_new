/**
 * Tipo compartilhado do backend; descreve a estrutura de objetos usados entre guards, controllers e services.
 */
import { Request } from 'express';

export interface RequestWithReseller extends Request {
  user: {
    resellerId: string;
    email: string;
    status: string;
  };
}
