const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /\.local\/state\/.*/,
  /\.local\/skills\/\.old-deployment-.*/,
];

module.exports = config;
