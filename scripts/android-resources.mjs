// Writes ProEd launcher icon, splash and theme resources into a Capacitor Android project.
// Usage: node scripts/android-resources.mjs <app-dir> <icon-background-hex>
// Example: node scripts/android-resources.mjs proed-app "#1D378C"
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [appDir, iconBg = '#1D378C'] = process.argv.slice(2);
if (!appDir) throw new Error('usage: node scripts/android-resources.mjs <app-dir> <icon-background-hex>');
const res = join(appDir, 'android/app/src/main/res');
if (!existsSync(res)) throw new Error(`No Android project in ${appDir}. Run "npx cap add android" first.`);

const write = (rel, content) => {
  const file = join(res, rel);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, content.trim() + '\n');
};

const P_PATHS = `
    <path android:pathData="M22,46V18h12.5a9.5,9.5 0,0 1,0 19H22" android:fillColor="#00000000"
        android:strokeColor="#FFFFFF" android:strokeWidth="6" android:strokeLineCap="round" android:strokeLineJoin="round" />
    <path android:pathData="M39,46h6" android:fillColor="#00000000"
        android:strokeColor="#93ACF2" android:strokeWidth="6" android:strokeLineCap="round" />`;

// Remove template images that would override our resources (Capacitor logo splash, foreground PNGs).
for (const dir of readdirSync(res)) {
  for (const name of ['splash.png', 'ic_launcher_foreground.png']) {
    const f = join(res, dir, name);
    if (existsSync(f)) rmSync(f);
  }
}
for (const f of ['drawable/ic_launcher_background.xml', 'drawable-v24/ic_launcher_foreground.xml']) {
  if (existsSync(join(res, f))) rmSync(join(res, f));
}

// Adaptive icon (API 26+): solid background + vector foreground (the P mark inside the safe zone).
write(
  'drawable/ic_launcher_foreground.xml',
  `
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <group android:translateX="18" android:translateY="18" android:scaleX="1.125" android:scaleY="1.125">${P_PATHS}
  </group>
</vector>`,
);
for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  write(
    `mipmap-anydpi-v26/${name}`,
    `
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>`,
  );
}
write(
  'values/ic_launcher_background.xml',
  `
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${iconBg}</color>
</resources>`,
);

// Splash: neutral background with the mark, light and dark.
write(
  'drawable/splash_mark.xml',
  `
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="72dp" android:height="72dp" android:viewportWidth="64" android:viewportHeight="64">
    <path android:fillColor="${iconBg}"
        android:pathData="M14,0h36a14,14 0,0 1,14 14v36a14,14 0,0 1,-14 14h-36a14,14 0,0 1,-14 -14v-36a14,14 0,0 1,14 -14z" />${P_PATHS}
</vector>`,
);
write(
  'drawable/splash.xml',
  `
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/proed_background" />
    <item android:drawable="@drawable/splash_mark" android:gravity="center" android:width="72dp" android:height="72dp" />
</layer-list>`,
);
write(
  'values/proed_colors.xml',
  `
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="proed_background">#F7F7F8</color>
    <color name="colorPrimary">${iconBg}</color>
    <color name="colorPrimaryDark">${iconBg}</color>
    <color name="colorAccent">${iconBg}</color>
</resources>`,
);
write(
  'values-night/proed_colors.xml',
  `
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="proed_background">#0E0F12</color>
</resources>`,
);
write(
  'values/styles.xml',
  `
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
        <item name="android:windowBackground">@color/proed_background</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <item name="windowSplashScreenBackground">@color/proed_background</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/ic_launcher_foreground</item>
        <item name="windowSplashScreenIconBackgroundColor">@color/ic_launcher_background</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>
</resources>`,
);
console.log(`Android resources written for ${appDir}`);
