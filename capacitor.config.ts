import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ct.ws.schatzkarte',
  appName: 'Schatz-Karte',
  webDir: 'src',
  bundledWebRuntime: false,
  backgroundColor: '#030812',
  plugins: {
    Keyboard: {
      // iOS-only: keep the map/WebView fixed while the software keyboard opens.
      resize: 'none',
      style: 'DARK',
      autoBackdropColor: 'auto'
    },
    StatusBar: {
      // Keep app controls below the iPhone status bar / Dynamic Island.
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#030812'
    },
    CapacitorSQLite: {
      // Explicit persistent native location on iOS.
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: 'Abenteuerkarte'
      }
    }
  }
};

export default config;
