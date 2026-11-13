const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const apiFolder = new RegExp(
  `^${escape(path.resolve(__dirname, "api"))}[\\\\/].*`,
);

const existing = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existing)
  ? [...existing, apiFolder]
  : existing
    ? [existing, apiFolder]
    : [apiFolder];

module.exports = config;
