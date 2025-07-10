import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.finWizard.zeno',
  appName: 'zeno',
  webDir: 'public',
  server: {
    url: 'http://192.168.0.101:3000',
    cleartext: true,
  },
};

export default config;
