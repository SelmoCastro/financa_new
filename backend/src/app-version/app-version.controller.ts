import { Controller, Get } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Controller('v1/app')
export class AppVersionController {
  /**
   * Public endpoint — no auth required.
   * Mobile app checks this on startup to detect new versions.
   */
  @Get('version')
  getVersion() {
    let version = '0.0.0';
    let minRequiredVersion = '1.0.0';
    let releaseNotes: string | string[] = '';

    try {
      const pkgPath = path.resolve(__dirname, '..', '..', '..', 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      version = pkg.version || '0.0.0';
    } catch {
      // fallback
    }

    try {
      const metaPath = path.resolve(__dirname, '..', '..', 'version-meta.json');
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      minRequiredVersion = meta.minRequiredVersion || '1.0.0';

      // Support both string (newline-separated) and array formats
      if (Array.isArray(meta.releaseNotes)) {
        releaseNotes = meta.releaseNotes;
      } else if (typeof meta.releaseNotes === 'string') {
        releaseNotes = meta.releaseNotes;
      }
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
}