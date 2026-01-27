import { Controller, Get, Request, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { AppService } from './app.service';

@Controller({
  version: VERSION_NEUTRAL,
})
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return 'Finanza API Online';
  }

  @Get('debug')
  getRoutes(@Request() req) {
    const router = req.app._router;
    return {
      message: 'Rotas carregadas',
      routes: router.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          method: Object.keys(layer.route.methods)[0].toUpperCase(),
        })),
    };
  }
}
