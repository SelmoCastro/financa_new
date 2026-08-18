import { Platform, type EmitterSubscription } from "react-native";
import { recordSslPinningFailure } from "./sslPinningState";
import {
  addSslPinningErrorListener,
  initializeSslPinning,
  isSslPinningAvailable,
  type PinningOptions,
} from "react-native-ssl-public-key-pinning";

/**
 * Current SPKI SHA-256 pins for api.finanzaai.tech.
 *
 * Keep a leaf and issuing-intermediate pin. The intermediate prevents an
 * ordinary leaf renewal from locking out users; the expiry date is a controlled
 * availability failsafe if the pin set is not rotated before renewal.
 */
export const FINANZA_API_PINNING: PinningOptions = {
  "api.finanzaai.tech": {
    includeSubdomains: false,
    publicKeyHashes: [
      "e1aEFcUUHIrYbgqVuGC91MC0igyqB9z7KCGhDzfK/Zg=",
      "s/tdAOmUzd8syaTuqfgGvFcn6DzA5Cmb+Vby1ST+U3Y=",
    ],
    expirationDate: "2026-09-01",
  },
};

let sslPinningInitPromise: Promise<void> | null = null;
let sslPinningErrorSubscription: EmitterSubscription | null = null;

function installSslPinningErrorListener(): void {
  if (sslPinningErrorSubscription || !isSslPinningAvailable()) {
    return;
  }

  sslPinningErrorSubscription = addSslPinningErrorListener(
    ({ serverHostname, message }) => {
      recordSslPinningFailure(serverHostname, message);
    },
  );
}

export function initSslPinning(): Promise<void> {
  if (Platform.OS === "web" || !isSslPinningAvailable()) {
    return Promise.resolve();
  }

  if (sslPinningInitPromise) {
    return sslPinningInitPromise;
  }

  installSslPinningErrorListener();
  sslPinningInitPromise = initializeSslPinning(FINANZA_API_PINNING).catch(
    (error) => {
      sslPinningInitPromise = null;
      throw error;
    },
  );

  return sslPinningInitPromise;
}
