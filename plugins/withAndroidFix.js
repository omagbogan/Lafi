const {
  withAndroidManifest,
  withGradleProperties,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Plugin Expo pour corriger le crash natif Android au démarrage en mode Release (APK) :
 * 1. Désactive l'auto-initialisation de WorkManagerInitializer dans AndroidManifest.xml
 *    (évite le crash Fatal Exception: Failed to create an instance of class androidx.work.impl.WorkDatabase.canonicalName).
 * 2. Active android:usesCleartextTraffic="true" pour autoriser les appels HTTP vers l'API FastAPI locale.
 * 3. Désactive R8 fullMode / minification agressive dans gradle.properties.
 * 4. Ajoute les règles ProGuard de conservation pour Room et WorkManager.
 */
module.exports = function withAndroidFix(config) {
  // 1. Correctifs dans AndroidManifest.xml
  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    // Assure la présence du namespace tools
    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    const mainApp = manifest.application?.[0];
    if (mainApp) {
      // Autorise le trafic HTTP en clair (ex: http://192.168.x.x:8000)
      mainApp.$ = mainApp.$ || {};
      mainApp.$["android:usesCleartextTraffic"] = "true";

      // Supprime WorkManagerInitializer de androidx.startup.InitializationProvider
      mainApp.provider = mainApp.provider || [];
      const existingProvider = mainApp.provider.find(
        (p) =>
          p.$?.["android:name"] === "androidx.startup.InitializationProvider",
      );

      const removeWorkManagerMeta = {
        $: {
          "android:name": "androidx.work.WorkManagerInitializer",
          "android:value": "androidx.startup",
          "tools:node": "remove",
        },
      };

      if (existingProvider) {
        existingProvider.$["tools:node"] = "merge";
        existingProvider["meta-data"] = existingProvider["meta-data"] || [];
        existingProvider["meta-data"].push(removeWorkManagerMeta);
      } else {
        mainApp.provider.push({
          $: {
            "android:name": "androidx.startup.InitializationProvider",
            "android:authorities": "${applicationId}.androidx-startup",
            "android:exported": "false",
            "tools:node": "merge",
          },
          "meta-data": [removeWorkManagerMeta],
        });
      }
    }

    return modConfig;
  });

  // 2. Correctifs dans gradle.properties
  config = withGradleProperties(config, (modConfig) => {
    const props = modConfig.modResults;
    const setProp = (key, value) => {
      const idx = props.findIndex((p) => p.type === "property" && p.key === key);
      if (idx >= 0) {
        props[idx].value = value;
      } else {
        props.push({ type: "property", key, value });
      }
    };

    setProp("android.enableMinifyInReleaseBuilds", "false");
    setProp("android.enableShrinkResourcesInReleaseBuilds", "false");
    setProp("android.enableR8.fullMode", "false");

    return modConfig;
  });

  // 3. Règles de protection dans proguard-rules.pro
  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const proguardPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "proguard-rules.pro",
      );
      if (fs.existsSync(proguardPath)) {
        let content = fs.readFileSync(proguardPath, "utf8");
        const keepRules = `
# Protection WorkManager & Room contre l'obfuscation R8 (AGP 9 / Expo 58)
-keep class androidx.work.** { *; }
-keep class androidx.work.impl.** { *; }
-keep class androidx.room.** { *; }
-keep class * extends androidx.room.RoomDatabase { *; <init>(); }
-keepnames class androidx.work.impl.WorkDatabase
-keep class androidx.work.impl.WorkDatabase_Impl { *; <init>(); }
`;
        if (!content.includes("androidx.work.impl.WorkDatabase")) {
          content += "\n" + keepRules;
          fs.writeFileSync(proguardPath, content, "utf8");
        }
      }
      return modConfig;
    },
  ]);

  return config;
};

