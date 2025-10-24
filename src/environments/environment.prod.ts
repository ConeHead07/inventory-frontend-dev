import { app } from "firebase";

export const environment = {
  appVersion: require("../../package.json").version,
  appiBaseUrl: "", // When empty, will be set dynamically
  production: true,
};
