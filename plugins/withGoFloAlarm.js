/**
 * Config plugin: registers GoFlo's native alarm receivers and permissions
 * in the Android manifest during `expo prebuild`.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const ALARM_FIRE_RECEIVER = 'expo.modules.gofloalarm.AlarmFireReceiver';
const ALARM_ACTION_RECEIVER = 'expo.modules.gofloalarm.AlarmActionReceiver';

const REQUIRED_PERMISSIONS = [
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_EXACT_ALARM',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.VIBRATE',
];

function addPermission(manifest, name) {
  if (!Array.isArray(manifest['uses-permission'])) {
    manifest['uses-permission'] = [];
  }
  const already = manifest['uses-permission'].some((p) => p.$?.['android:name'] === name);
  if (!already) {
    manifest['uses-permission'].push({ $: { 'android:name': name } });
  }
}

function addReceiver(app, name, exported = false) {
  if (!Array.isArray(app.receiver)) {
    app.receiver = [];
  }
  const already = app.receiver.some((r) => r.$?.['android:name'] === name);
  if (!already) {
    app.receiver.push({
      $: {
        'android:name': name,
        'android:exported': exported ? 'true' : 'false',
      },
    });
  }
}

function withGoFloAlarm(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const app = manifest.application?.[0];

    if (!app) {
      console.warn('[withGoFloAlarm] AndroidManifest.xml has no <application> — skipping');
      return config;
    }

    for (const perm of REQUIRED_PERMISSIONS) {
      addPermission(manifest, perm);
    }

    addReceiver(app, ALARM_FIRE_RECEIVER, false);
    addReceiver(app, ALARM_ACTION_RECEIVER, false);

    return config;
  });
}

module.exports = withGoFloAlarm;
