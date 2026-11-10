# VocabNote – Sổ từ vựng tiếng Anh

Ứng dụng học từ vựng chạy được ở 2 dạng từ **cùng một bộ mã nguồn**:
- **Web**: dùng trên máy tính bất kỳ (Chrome, Edge, Firefox, Safari).
- **App điện thoại**: Android (file `.apk`) và iOS (cần máy Mac để build).

## Dữ liệu được lưu ở đâu?

```
                   ┌─────────────────────────────┐
  Máy tính  ───────┤  Vocab-app-folder/          │  ← file trên máy: học offline, sao lưu nhanh,
  Điện thoại ──────┤     vocab-data.json         │    mở ra xem / sửa được
                   └──────────────┬──────────────┘
                                  │ đồng bộ (tự động hoặc khi bấm)
                   ┌──────────────┴──────────────┐
                   │ Google Drive của từng người │  ← học ở BẤT KỲ máy tính nào có internet
                   │  Vocab-app-folder/          │
                   │     vocab-data.json         │
                   └─────────────────────────────┘
```

| Thiết bị | Vị trí file trên máy | Ghi chú |
|---|---|---|
| **App Android** | `Bộ nhớ trong / Documents / Vocab-app-folder / vocab-data.json` | Vị trí cố định, tự động lưu. Xem bằng ứng dụng *Files / Quản lý tệp*. |
| **App iPhone/iPad** | `Tệp › Trên iPhone › VocabNote › Vocab-app-folder / vocab-data.json` | Vị trí cố định, tự động lưu. |
| **Máy tính – Chrome / Edge** | Do bạn **chọn** (vd: `Documents`). App tự tạo `Vocab-app-folder/vocab-data.json` bên trong. Cũng có thể **mở một file có sẵn** ở bất kỳ đâu. | Tự động lưu. Sửa file bằng phần mềm khác thì app tự cập nhật khi bạn quay lại cửa sổ. Mỗi lần mở lại trang, trình duyệt hỏi xác nhận quyền ghi file (1 cú bấm). |
| **Máy tính – Firefox / Safari, web trên điện thoại** | Trình duyệt không cho web tự ghi file | Dùng nút **Lưu file về máy** (vào thư mục Tải về) và **Mở file dữ liệu**. |

Trình duyệt vẫn giữ một bản sao tạm của dữ liệu để ứng dụng chạy nhanh. Bản chính là **file trên máy** và **file trên Google Drive**.

### Xem và sửa file dữ liệu
`vocab-data.json` là file văn bản (JSON, UTF-8), mở được bằng Notepad, TextEdit, VS Code hoặc trình sửa văn bản trên điện thoại:

```json
{
  "app": "VocabNote",
  "words": [
    {
      "word": "resilient",
      "ipa": "/rɪˈzɪliənt/",
      "pos": "adjective",
      "meaning": "kiên cường, mau phục hồi",
      "notes": "resilient to/against something",
      "synonyms": "tough, adaptable",
      "antonyms": "fragile",
      "examples": [{ "en": "Children are often resilient.", "vi": "Trẻ em thường kiên cường." }],
      "tags": "IELTS",
      "id": "…", "srs": { … }, "stats": { … }
    }
  ]
}
```
- **Thêm từ**: thêm một mục vào `words`, chỉ cần `{"word": "...", "meaning": "..."}`. App sẽ tự cấp `id`.
- **Sửa**: đổi nội dung các trường. **Giữ nguyên `id`**.
- **Xoá từ**: xoá cả mục đó.
- Lưu file xong, app tự nhận thay đổi. Nếu file bị lỗi cú pháp (thiếu dấu phẩy, ngoặc…), app báo lỗi và **tạm ngừng ghi** để không đè mất nội dung bạn đang sửa. Sửa xong bấm **Tải lại từ file**.

### Google Drive – học mọi lúc mọi nơi
Mở trang web VocabNote ở máy tính bất kỳ → **Cài đặt → Kết nối Google Drive** → đăng nhập. Dữ liệu sẽ được tải về để học. Mỗi người dùng tài khoản Google riêng nên dữ liệu không lẫn vào nhau.
- **Tự động đồng bộ** bật/tắt được. Khi tắt, app chỉ đồng bộ khi bạn bấm **Đồng bộ ngay**.
- **Máy công cộng**: học xong bấm **Đăng xuất & xoá dữ liệu trên máy này**. Dữ liệu trên Drive vẫn còn nguyên.
- Lần đầu kết nối trên một máy đã có sẵn dữ liệu, app sẽ hỏi bạn muốn **gộp** hay **chỉ dùng dữ liệu trên Drive**.

---

## Hướng dẫn triển khai (làm 1 lần)

Cách đơn giản nhất là dùng **1 tài khoản GitHub miễn phí**. Một kho mã (repository) vừa đưa trang web lên mạng, vừa tự build file APK cho Android.

### Bước 1 – Đưa mã nguồn lên GitHub
1. Tạo tài khoản tại https://github.com và tạo repository mới (vd: `vocabnote`, chọn *Public*).
2. Bấm **uploading an existing file** → kéo toàn bộ nội dung thư mục `vocab-app` vào (bao gồm các thư mục `.github`, `scripts`, `signing`, `icons`). Bấm **Commit changes**.

### Bước 2 – Trang web
Vào repository → **Settings → Pages** → *Source: Deploy from a branch*, *Branch: main / (root)* → **Save**.
Sau 1–2 phút, trang web có địa chỉ `https://<tên-tài-khoản>.github.io/vocabnote/`.

### Bước 3 – App Android (APK)
Mỗi lần bạn đưa mã lên nhánh `main`, GitHub sẽ tự build app (xem tiến trình ở tab **Actions**, mất khoảng 5–8 phút).
Khi xong, vào **Releases** (cột bên phải trang repository) → tải **VocabNote.apk** bằng điện thoại → mở file để cài.
Android sẽ hỏi cho phép *cài ứng dụng từ nguồn không xác định*: hãy cho phép.

### Bước 4 – Google Drive
1. https://console.cloud.google.com/ → tạo dự án → **APIs & Services → Library** → bật **Google Drive API**.
2. **OAuth consent screen** (*Google Auth Platform*): loại *External*. Thêm scope `drive.file`, `openid`, `email`, `profile`. Thêm email người dùng vào **Test users**, hoặc bấm **Publish app** để ai cũng dùng được (`drive.file` là quyền không nhạy cảm nên thường không phải chờ xét duyệt).
3. **Credentials → Create credentials → OAuth client ID**, tạo **2 Client ID**:
   - **Web application**, dùng cho trang web và app. *Authorized JavaScript origins*: `https://<tên-tài-khoản>.github.io` (và `http://localhost:8000` nếu chạy thử trên máy).
   - **Android**, chỉ cần để app Android đăng nhập được. *Package name*: `com.vocabnote.app`. *SHA-1*:
     ```
     09:69:00:89:CD:2B:F0:79:F5:91:0C:EB:0D:01:34:77:1D:E6:C7:2F
     ```
4. Mở `config.js` trên GitHub (biểu tượng bút chì để sửa) → dán **Client ID loại Web** vào `googleClientId` → Commit. Trang web cập nhật ngay, đồng thời GitHub tự build lại APK có sẵn cấu hình đăng nhập.

### App iPhone/iPad (tuỳ chọn)
Cần máy Mac có Xcode và tài khoản Apple Developer:
```bash
npm install
npm run ios
npx cap open ios
```
Trong Xcode: chọn Team ký app rồi bấm Run. Để đăng nhập Google trên iOS, cần tạo thêm Client ID loại **iOS** (Bundle ID `com.vocabnote.app`) và làm theo hướng dẫn của plugin `@codetrix-studio/capacitor-google-auth`.
Người dùng iPhone cũng có thể dùng ngay **bản web** (Safari → Chia sẻ → *Thêm vào MH chính*), lưu/mở file bằng nút *Lưu file về máy*.

### Chạy thử trên máy tính
```bash
python3 -m http.server 8000
```
Sau đó mở http://localhost:8000

---

## Lưu ý quan trọng
- **Gỡ rồi cài lại app Android**: Android không cho bản cài mới ghi đè file do bản cài cũ tạo ra. App sẽ tự lưu sang tên mới (`vocab-data-YYYYMMDD.json`) trong cùng thư mục. Để lấy lại dữ liệu cũ: **Cài đặt → Nhập từ file khác** → chọn `vocab-data.json` cũ. Nếu đã kết nối Google Drive thì chỉ cần đăng nhập lại.
- **Khoá ký app** (`signing/vocabnote.keystore`, mật khẩu `vocabnote`) phải giữ nguyên để các bản APK sau cài đè được lên bản trước và đăng nhập Google hoạt động. Nếu muốn phát hành lên Google Play, hãy tạo khoá riêng và giữ bí mật.
- Phiên đăng nhập Google trên web kéo dài khoảng 1 giờ. Khi hết hạn, nút Drive ở góc trên hiện **Đăng nhập lại**. Trong lúc đó dữ liệu vẫn được lưu vào file trên máy.

## Cấu trúc thư mục
```
vocab-app/
├── index.html, styles.css, app.js   giao diện + toàn bộ logic
├── config.js                        Google Client ID
├── sw.js, manifest.webmanifest      chạy offline / cài như app từ trình duyệt
├── icons/                           biểu tượng
├── package.json, capacitor.config.json   cấu hình đóng gói app điện thoại (Capacitor)
├── scripts/                         script chuẩn bị dự án Android/iOS
├── signing/vocabnote.keystore       khoá ký app Android
└── .github/workflows/build-android.yml   GitHub tự build APK
```
