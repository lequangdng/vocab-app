// Chỉnh dự án Android do Capacitor tạo ra: quyền ghi thư mục Documents, khoá ký app, biểu tượng, Google Sign-In.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), app = path.join(root, 'android', 'app');
const edit = (file, fn) => { const p = path.join(app, file); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };

edit('src/main/AndroidManifest.xml', s => {
  if (!s.includes('WRITE_EXTERNAL_STORAGE')) s = s.replace('<application', `<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />

    <application android:requestLegacyExternalStorage="true"`);
  return s;
});

const cap = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
edit('src/main/res/values/strings.xml', s => s.includes('server_client_id') ? s
  : s.replace('</resources>', `    <string name="server_client_id">${cap.plugins.GoogleAuth.serverClientId}</string>\n</resources>`));

const run = Number(process.env.GITHUB_RUN_NUMBER || 1);
edit('build.gradle', s => {
  s = s.replace(/versionCode \d+/, `versionCode ${run}`).replace(/versionName "[^"]*"/, `versionName "1.1.${run}"`);
  if (!s.includes('signingConfigs')) s = s.replace(/buildTypes\s*\{\s*release\s*\{/, `signingConfigs {
        release {
            storeFile file('../../signing/vocabnote.keystore')
            storePassword 'vocabnote'
            keyAlias 'vocabnote'
            keyPassword 'vocabnote'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release`);
  return s;
});

// Biểu tượng ứng dụng
const res = path.join(app, 'src/main/res');
fs.rmSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true, force: true });
for (const d of fs.readdirSync(res).filter(d => d.startsWith('mipmap-'))) {
  for (const n of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'])
    fs.copyFileSync(path.join(root, 'icons', 'icon-192.png'), path.join(res, d, n));
}
console.log('Đã chỉnh dự án Android.');
