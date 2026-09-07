import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saqlainap.coursetracker',
  appName: 'TrackBack',
  webDir: 'dist',
  android: {
    // We paint our own background behind the status/nav bars and handle the
    // Android 15+ edge-to-edge insets in CSS (see --safe-top in index.css).
    backgroundColor: '#0a0a0f',
  },
};

export default config;
