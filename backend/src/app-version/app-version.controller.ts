import { Controller, Get } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Controller('v1/app')
export class AppVersionController {
  /**
   * Public endpoint — no auth required.
   * Mobile app checks this on startup to detect new versions.
   * Includes apkAvailable flag: false if APK hasn't been uploaded yet
   * (prevents mobile from showing update dialog before APK is ready).
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

      if (Array.isArray(meta.releaseNotes)) {
        releaseNotes = meta.releaseNotes;
      } else if (typeof meta.releaseNotes === 'string') {
        releaseNotes = meta.releaseNotes;
      }
    } catch {
      // fallback to defaults
    }

    // Verifica se o APK realmente existe no disco da VPS
    const apkPath = `/var/www/finanzaai.tech/downloads/Financa_new_v${version}.apk`;
    const apkAvailable = fs.existsSync(apkPath);

    return {
      version,
      apkAvailable,
      apkUrl: apkAvailable
        ? `https://finanzaai.tech/downloads/Financa_new_v${version}.apk`
        : null,
      minRequiredVersion,
      releaseNotes,
    };
  }
}