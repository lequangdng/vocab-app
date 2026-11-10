// Sao chép giao diện web vào thư mục www/ để đóng gói thành app,
// và lấy Google Client ID từ config.js đưa vào cấu hình app.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), www = path.join(root, 'www');
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(path.join(www, 'icons'), { recursive: true });
for (const f of ['index.html', 'styles.css', 'app.js', 'config.js', 'manifest.webmanifest', 'sw.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png']) fs.copyFileSync(path.join(root, f), path.join(www, f));
const cfg = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
const id = (cfg.match(/googleClientId:\s*'([^']*)'/) || [])[1] || '';
const capPath = path.join(root, 'capacitor.config.json');
const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
cap.plugins.GoogleAuth.serverClientId = id;
fs.writeFileSync(capPath, JSON.stringify(cap, null, 2) + '\n');
console.log('www/ sẵn sàng. Google Client ID:', id || '(chưa có – đồng bộ Drive trong app sẽ chưa dùng được)');
