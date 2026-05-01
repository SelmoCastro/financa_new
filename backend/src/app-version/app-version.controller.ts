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
    let mobileVersion = '0.0.0';
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
      // __dirname in compiled code is dist/app-version/
      // version-meta.json is copied to dist/ during build (via nest-cli.json assets)
      // but path.resolve(__dirname, '..', '..') resolves to project root, not dist/
      // So try dist/ first, then fallback to src/ (for dev), then project root
      const possiblePaths = [
        path.resolve(__dirname, '..', 'version-meta.json'),     // dist/version-meta.json
        path.resolve(__dirname, '..', '..', 'src', 'version-meta.json'),  // src/version-meta.json
        path.resolve(__dirname, '..', '..', 'version-meta.json'),  // root version-meta.json
      ];
      
      let metaPath = possiblePaths[0];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          metaPath = p;
          break;
        }
      }
      
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      minRequiredVersion = meta.minRequiredVersion || '1.0.0';
      // Use mobileVersion from meta if set, otherwise fall back to package.json version
      mobileVersion = meta.mobileVersion || version;

      if (Array.isArray(meta.releaseNotes)) {
        releaseNotes = meta.releaseNotes;
      } else if (typeof meta.releaseNotes === 'string') {
        releaseNotes = meta.releaseNotes;
      }
    } catch {
      // fallback to package.json version
      mobileVersion = version;
    }

    // Verifica se o APK realmente existe no disco da VPS
    // Usa mobileVersion para o nome do arquivo (mobile tem ciclo de release separado)
    const apkPath = `/var/www/finanzaai.tech/downloads/Financa_new_v${mobileVersion}.apk`;
    const apkAvailable = fs.existsSync(apkPath);

    return {
      version,
      mobileVersion,
      apkAvailable,
      apkUrl: apkAvailable
        ? `https://finanzaai.tech/downloads/Financa_new_v${mobileVersion}.apk`
        : null,
      minRequiredVersion,
      releaseNotes,
    };
  }
}