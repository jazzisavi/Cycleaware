const config = require('./app.json');

module.exports = {
  ...config,
  expo: {
    ...config.expo,

    android: {
      ...config.expo.android,
      package: "com.goflo.app",
      googleServicesFile: "./google-services.json",
    },

    plugins: [
      ...(config.expo.plugins || []),
      "@react-native-firebase/app",
      "expo-notifications"
    ],
  },
};