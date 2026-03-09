const { withAndroidStyles } = require("@expo/config-plugins");

function withAndroidPickerTheme(config) {
  return withAndroidStyles(config, (config) => {
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
          parent: "ThemeOverlay.MaterialComponents.MaterialCalendar",
        },
        item: [
          { _: "#E8614F", $: { name: "colorPrimary" } },
          { _: "#E8614F", $: { name: "colorAccent" } },
          { _: "#E8614F", $: { name: "colorOnPrimary" } },
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
          parent: "ThemeOverlay.MaterialComponents.TimePicker",
        },
        item: [
          { _: "#E8614F", $: { name: "colorPrimary" } },
          { _: "#E8614F", $: { name: "colorAccent" } },
          { _: "#E8614F", $: { name: "colorOnPrimary" } },
        ],
      });
    }

    return config;
  });
}

module.exports = withAndroidPickerTheme;
