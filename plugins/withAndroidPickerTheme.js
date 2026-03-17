const { withAndroidStyles, withDangerousMod } = require("@expo/config-plugins");
const { resolve } = require("path");
const { mkdirSync, writeFileSync, readFileSync, existsSync } = require("fs");

function withAndroidPickerTheme(config) {
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults;

    const appTheme = styles.resources.style.find(
      (style) => style.$.name === "AppTheme"
    );

    if (appTheme) {
      if (!appTheme.item) appTheme.item = [];

      const hasDateTheme = appTheme.item.some(
        (item) => item.$.name === "android:datePickerDialogTheme"
      );
      if (!hasDateTheme) {
        appTheme.item.push({
          _: "@style/GoFloDatePickerTheme",
          $: { name: "android:datePickerDialogTheme" },
        });
      }

      const hasTimeTheme = appTheme.item.some(
        (item) => item.$.name === "android:timePickerDialogTheme"
      );
      if (!hasTimeTheme) {
        appTheme.item.push({
          _: "@style/GoFloTimePickerTheme",
          $: { name: "android:timePickerDialogTheme" },
        });
      }
    }

    if (!styles.resources.style) styles.resources.style = [];

    const hasDateStyle = styles.resources.style.some(
      (style) => style.$.name === "GoFloDatePickerTheme"
    );
    if (!hasDateStyle) {
      styles.resources.style.push({
        $: {
          name: "GoFloDatePickerTheme",
          parent: "Theme.MaterialComponents.DayNight.Dialog.MinWidth",
        },
        item: [
          { _: "#E8614F", $: { name: "colorPrimary" } },
          { _: "#E8614F", $: { name: "colorAccent" } },
          { _: "#E8614F", $: { name: "colorOnPrimary" } },
          { _: "#E8614F", $: { name: "colorControlActivated" } },
          { _: "#E8614F", $: { name: "android:colorControlActivated" } },
          { _: "#F5F0E8", $: { name: "colorSurface" } },
          { _: "#F5F0E8", $: { name: "android:windowBackground" } },
        ],
      });
    }

    const hasTimeStyle = styles.resources.style.some(
      (style) => style.$.name === "GoFloTimePickerTheme"
    );
    if (!hasTimeStyle) {
      styles.resources.style.push({
        $: {
          name: "GoFloTimePickerTheme",
          parent: "Theme.MaterialComponents.DayNight.Dialog",
        },
        item: [
          { _: "#E8614F", $: { name: "colorPrimary" } },
          { _: "#E8614F", $: { name: "colorAccent" } },
          { _: "#E8614F", $: { name: "colorOnPrimary" } },
          { _: "#E8614F", $: { name: "colorControlActivated" } },
          { _: "#E8614F", $: { name: "android:colorControlActivated" } },
          { _: "#F5F0E8", $: { name: "colorSurface" } },
          { _: "#F5F0E8", $: { name: "android:windowBackground" } },
        ],
      });
    }

    return config;
  });

  config = withDangerousMod(config, [
    "android",
    (config) => {
      const nightValuesDir = resolve(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "values-night"
      );
      mkdirSync(nightValuesDir, { recursive: true });

      const nightStylesPath = resolve(nightValuesDir, "styles.xml");
      const dateStyleBlock = `    <style name="GoFloDatePickerTheme" parent="Theme.MaterialComponents.DayNight.Dialog.MinWidth">
        <item name="colorPrimary">#E8614F</item>
        <item name="colorAccent">#E8614F</item>
        <item name="colorOnPrimary">#FFFFFF</item>
        <item name="colorControlActivated">#E8614F</item>
        <item name="android:colorControlActivated">#E8614F</item>
        <item name="colorSurface">#1E1812</item>
        <item name="android:windowBackground">#1E1812</item>
    </style>`;
      const timeStyleBlock = `    <style name="GoFloTimePickerTheme" parent="Theme.MaterialComponents.DayNight.Dialog">
        <item name="colorPrimary">#E8614F</item>
        <item name="colorAccent">#E8614F</item>
        <item name="colorOnPrimary">#FFFFFF</item>
        <item name="colorControlActivated">#E8614F</item>
        <item name="android:colorControlActivated">#E8614F</item>
        <item name="colorSurface">#1E1812</item>
        <item name="android:windowBackground">#1E1812</item>
    </style>`;

      if (existsSync(nightStylesPath)) {
        let existing = readFileSync(nightStylesPath, "utf8");
        if (!existing.includes('name="GoFloDatePickerTheme"')) {
          existing = existing.replace("</resources>", dateStyleBlock + "\n</resources>");
        }
        if (!existing.includes('name="GoFloTimePickerTheme"')) {
          existing = existing.replace("</resources>", timeStyleBlock + "\n</resources>");
        }
        writeFileSync(nightStylesPath, existing);
      } else {
        const nightStylesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
${dateStyleBlock}
${timeStyleBlock}
</resources>
`;
        writeFileSync(nightStylesPath, nightStylesXml);
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidPickerTheme;
