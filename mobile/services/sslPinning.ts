import { Platform } from 'react-native';
import { initializeSslPinning } from 'react-native-ssl-public-key-pinning';

let sslPinningInitPromise: Promise<void> | null = null;

export function initSslPinning(): Promise<void> {
  if (Platform.OS === 'web') {
    return Promise.resolve();
  }

  if (sslPinningInitPromise) {
    return sslPinningInitPromise;
  }

  sslPinningInitPromise = initializeSslPinning({
    'api.finanzaai.tech': {
      includeSubdomains: false,
      publicKeyHashes: [
        'rzD0iwB05bDoWz5rFlWPlL6yc8LDcEHs5Ggdx1cXUis=',
        'y7xVm0TVJNahMr2sZydE2jQH8SquXV9yLF9seROHHHU=',
      ],
      expirationDate: '2027-06-05',
    },
  }).catch((error) => {
    sslPinningInitPromise = null;
    throw error;
  });

  return sslPinningInitPromise;
}