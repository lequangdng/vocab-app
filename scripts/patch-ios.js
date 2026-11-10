// Cho phép thư mục Documents của app hiện trong ứng dụng Tệp (Files) của iPhone.
const fs = require('fs'), path = require('path');
const p = path.join(__dirname, '..', 'ios', 'App', 'App', 'Info.plist');
let s = fs.readFileSync(p, 'utf8');
if (!s.includes('UIFileSharingEnabled')) s = s.replace(/<dict>/, `<dict>
	<key>UIFileSharingEnabled</key>
	<true/>
	<key>LSSupportsOpeningDocumentsInPlace</key>
	<true/>`);
fs.writeFileSync(p, s);
console.log('Đã bật hiển thị file trong ứng dụng Tệp.');
