/**
 * Expo Config Plugin: withApkInstaller
 * 
 * Adds REQUEST_INSTALL_PACKAGES permission so the app can install APK updates.
 * 
 * The FileProvider is already registered by expo-file-system (authority: ${applicationId}.FileSystemFileProvider)
 * with file_system_provider_paths.xml covering <files-path path="." /> and <cache-path path="." />.
 * That's sufficient for getContentUriAsync() to work with APK files downloaded to CacheDir/updates/.
 * 
 * What this plugin does:
 * 1. Adds REQUEST_INSTALL_PACKAGES permission to AndroidManifest
 * 2. Patch: ensure the expo-file-system FileProvider also covers the "updates/" subdirectory
 *    (although cache-path path="." already covers all subdirs, this is future-proof)
 */

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withApkInstaller(config) {
  // 1. Add REQUEST_INSTALL_PACKAGES permission
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    const permissions = manifest.manifest['uses-permission'] || [];
    const hasInstallPermission = permissions.some(
      (p) => p.$ && p.$['android:name'] === 'android.permission.REQUEST_INSTALL_PACKAGES'
    );
    if (!hasInstallPermission) {
      permissions.push({
        $: { 'android:name': 'android.permission.REQUEST_INSTALL_PACKAGES' }
      });
      manifest.manifest['uses-permission'] = permissions;
    }

    // Remove any duplicate/broken FileProvider that isn't from expo-file-system
    // (the old version of this plugin added one with corrupted authority '${appl...ider')
    const application = manifest.manifest.application;
    const appNode = Array.isArray(application) ? application[0] : application;
    
    if (appNode.provider && Array.isArray(appNode.provider)) {
      appNode.provider = appNode.provider.filter(
        (p) => {
          const authority = p.$ && p.$['android:authorities'];
          // Keep only expo-file-system's provider (has .FileSystemFileProvider in authority)
          // Remove our old broken provider and any other custom ones
          if (authority && !authority.includes('FileSystemFileProvider')) {
            console.log(`[withApkInstaller] Removing non-expo-file-system provider with authority: ${authority}`);
            return false;
          }
          return true;
        }
      );
    }

    return config;
  });

  // 2. Ensure file_system_provider_paths.xml includes cache/updates/ path
  //    expo-file-system already creates this file with <cache-path name="cached_expo_files" path="." />
  //    which covers all subdirs. But to be explicit and future-proof, add an entry.
  config = withDangerousMod(config, ['android', (config) => {
    const resXmlDir = path.join(
      config.modRequest.platformProjectRoot,
      'app', 'src', 'main', 'res', 'xml'
    );

    if (!fs.existsSync(resXmlDir)) {
      fs.mkdirSync(resXmlDir, { recursive: true });
    }

    const filePathsPath = path.join(resXmlDir, 'file_paths.xml');
    
    // Only create if it doesn't exist (expo-file-system creates file_system_provider_paths.xml)
    // We create file_paths.xml as an additional paths file if needed by our provider
    if (!fs.existsSync(filePathsPath)) {
      const filePathsContent = `<?xml version="1.0" encoding="utf-8"?>
<paths>
    <!-- React Native Blob Util downloads to CacheDir/updates/ -->
    <cache-path name="update_cache" path="updates/" />
</paths>`;
      fs.writeFileSync(filePathsPath, filePathsContent, 'utf-8');
    }

    return config;
  }]);

  return config;
}

module.exports = withApkInstaller;