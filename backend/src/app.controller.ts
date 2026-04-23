import {
  Controller,
  Get,
  UseGuards,
  Request,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from './common/guards/admin.guard';
import * as fs from 'fs';
import * as path from 'path';

@Controller({
  version: VERSION_NEUTRAL,
})
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return 'Finanza API Online';
  }

  /**
   * Public endpoint — no auth required.
   * Mobile app checks this on startup to detect new versions.
   * version comes from package.json (set by npm version / release scripts).
   * minRequiredVersion and releaseNotes come from version-meta.json
   * (can be edited on the server without redeploying).
   */
  @Get('app/version')
  getVersion() {
    let version = '0.0.0';
    let minRequiredVersion = '1.0.0';
    let releaseNotes = '';

    try {
      const pkgPath = path.resolve(__dirname, '..', 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      version = pkg.version || '0.0.0';
    } catch {
      // fallback
    }

    try {
      const metaPath = path.resolve(__dirname, '..', 'version-meta.json');
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      minRequiredVersion = meta.minRequiredVersion || '1.0.0';
      releaseNotes = meta.releaseNotes || '';
    } catch {
      // fallback to defaults
    }

    return {
      version,
      apkUrl: `https://finanzaai.tech/downloads/Financa_new_v${version}.apk`,
      minRequiredVersion,
      releaseNotes,
    };
  }

  @Get('health/email')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  checkEmailConfig(@Request() req: any) {
    const hasKey = !!process.env.RESEND_API_KEY;
    return {
      resendConfigured: hasKey,
      hint: hasKey
        ? 'Resend API key found. If emails are not arriving, check domain verification on resend.com'
        : 'RESEND_API_KEY is missing. Add it to environment variables.',
    };
  }
}
