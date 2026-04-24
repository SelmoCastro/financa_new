/**
 * Expo Config Plugin: withApkInstaller
 * 
 * Adds FileProvider + REQUEST_INSTALL_PACKAGES permission
 * so the app can install APK updates from within the app.
 * 
 * What it does:
 * 1. Adds REQUEST_INSTALL_PACKAGES permission to AndroidManifest
 * 2. Adds a FileProvider entry that shares the app's internal
 *    files directory so we can pass APK files to the installer Intent
 * 3. Creates res/xml/file_paths.xml with the correct path config
 */

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FILE_PROVIDER_AUTHORITIES = '${applicationId}.fileprovider';

function withApkInstaller(config) {
  // 1. Add REQUEST_INSTALL_PACKAGES permission
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Ensure <manifest> has the permission
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

    // 2. Add FileProvider to <application>
    const application = manifest.manifest.application;
    if (Array.isArray(application)) {
      // Shouldn't be, but handle it
      application[0].provider = application[0].provider || [];
    } else {
      application.provider = application.provider || [];
    }

    const appNode = Array.isArray(application) ? application[0] : application;

    const hasProvider = appNode.provider?.some(
      (p) => p.$ && p.$['android:authorities'] === FILE_PROVIDER_AUTHORITIES
    );

    if (!hasProvider) {
      appNode.provider = appNode.provider || [];
      appNode.provider.push({
        $: {
          'android:name': 'androidx.core.content.FileProvider',
          'android:authorities': FILE_PROVIDER_AUTHORITIES,
          'android:exported': 'false',
          'android:grantUriPermissions': 'true',
        },
        'meta-data': [{
          $: {
            'android:name': 'android.support.FILE_PROVIDER_PATHS',
            'android:resource': '@xml/file_paths',
          }
        }],
      });
    }

    return config;
  });

  // 3. Create res/xml/file_paths.xml in the android directory
  config = withDangerousMod(config, ['android', (config) => {
    const resXmlDir = path.join(
      config.modRequest.platformProjectRoot,
      'app', 'src', 'main', 'res', 'xml'
    );

    if (!fs.existsSync(resXmlDir)) {
      fs.mkdirSync(resXmlDir, { recursive: true });
    }

    const filePathsContent = `<?xml version="1.0" encoding="utf-8"?>
<paths>
    <!-- Internal app-specific storage where we download APK updates -->
    <files-path name="internal_files" path="." />
    <cache-path name="cache" path="." />
    <external-files-path name="external_files" path="." />
</paths>`;

    fs.writeFileSync(
      path.join(resXmlDir, 'file_paths.xml'),
      filePathsContent,
      'utf-8'
    );

    return config;
  }]);

  return config;
}

module.exports = withApkInstaller;