/**
 * Service raiz do backend; reúne respostas simples usadas pelos endpoints básicos da aplicação.
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
