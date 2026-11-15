// Patches a Capacitor app/build.gradle: version from package.json + release signing from keystore.properties
// (or environment variables in CI). Safe to run more than once.
// Usage: node scripts/android-gradle.mjs <app-dir>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const appDir = process.argv[2];
if (!appDir) throw new Error('usage: node scripts/android-gradle.mjs <app-dir>');
const file = join(appDir, 'android/app/build.gradle');
let s = readFileSync(file, 'utf8');
if (s.includes('// ProEd: version and signing')) {
  console.log('already patched');
  process.exit(0);
}

const header = `// ProEd: version and signing
def proedPkg = new groovy.json.JsonSlurper().parse(file('../../package.json'))
def proedVersion = proedPkg.version.tokenize('.').collect { it as int }
def keystorePropsFile = rootProject.file('keystore.properties')
def keystoreProps = new Properties()
if (keystorePropsFile.exists()) keystorePropsFile.withInputStream { keystoreProps.load(it) }
def signValue = { String key, String env -> keystoreProps.getProperty(key) ?: System.getenv(env) }
def hasSigning = signValue('storeFile', 'PROED_KEYSTORE_FILE') != null

`;

s = s.replace("apply plugin: 'com.android.application'\n", `apply plugin: 'com.android.application'\n\n${header}`);
s = s.replace(
  /versionCode 1\n(\s*)versionName "1.0"/,
  'versionCode proedVersion[0] * 10000 + proedVersion[1] * 100 + proedVersion[2]\n$1versionName proedPkg.version',
);
s = s.replace(
  '    buildTypes {\n        release {\n            minifyEnabled false',
  `    signingConfigs {
        release {
            if (hasSigning) {
                storeFile file(signValue('storeFile', 'PROED_KEYSTORE_FILE'))
                storePassword signValue('storePassword', 'PROED_KEYSTORE_PASSWORD')
                keyAlias signValue('keyAlias', 'PROED_KEY_ALIAS')
                keyPassword signValue('keyPassword', 'PROED_KEY_PASSWORD')
            }
        }
    }
    buildTypes {
        release {
            if (hasSigning) signingConfig signingConfigs.release
            minifyEnabled false`,
);
writeFileSync(file, s);
console.log(`patched ${file}`);
