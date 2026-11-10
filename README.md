# VocabNote – Sổ từ vựng tiếng Anh

Ứng dụng web cài được (PWA): chạy trên **máy tính** (trình duyệt hoặc cài như app) và **điện thoại** (cài như app từ màn hình chính, chạy được cả khi không có mạng). Dữ liệu của mỗi người được lưu trong **Google Drive riêng** của người đó.

## Tính năng

| Nhóm | Chức năng |
|---|---|
| **Sổ từ vựng** | Thêm / sửa / xoá từ. Mỗi từ có: nghĩa, phiên âm, từ loại, ghi chú cách dùng, từ đồng nghĩa, từ trái nghĩa, nhiều câu ví dụ (kèm dịch nghĩa), chủ đề. Báo khi nhập trùng từ. |
| **Từ điển** | Nút “Tra từ điển” để tự điền phiên âm, định nghĩa, ví dụ, từ đồng nghĩa (từ điển Anh–Anh miễn phí), cùng liên kết nhanh tới Cambridge Anh–Việt, Oxford, Laban, Google Dịch, YouGlish. |
| **Phát âm** | Máy đọc từ và từng câu ví dụ (giọng Mỹ / Anh / Úc, chỉnh được tốc độ, có nút đọc chậm 0.5×). |
| **Danh sách** | Tìm kiếm; lọc theo: Mới, Đang học, Đã thuộc, Đến hạn ôn, ★ đã đánh dấu, chủ đề; sắp xếp A–Z, theo số lần học, theo từ hay sai… Mỗi từ hiển thị số lần học và tỉ lệ nhớ đúng. |
| **Học & ôn tập** | 5 chế độ: Thẻ ghi nhớ (lặp lại ngắt quãng – tự lên lịch ôn), Trắc nghiệm 4 đáp án, Gõ từ, Nghe & chép, Luyện viết tay. Học theo hướng Anh→Việt, Việt→Anh hoặc trộn lẫn. Kết thúc phiên có bảng tổng kết và nút “Học lại từ sai”. |
| **Luyện viết tay** | Bảng viết có dòng kẻ như vở tập viết, chữ mẫu mờ để tô theo, nhiều màu bút và cỡ bút, tẩy, hoàn tác. Hỗ trợ ngón tay, bút cảm ứng (có lực nhấn) và chống chạm nhầm lòng bàn tay. |
| **Thống kê** | Tổng số từ, số ngày học liên tiếp, số từ đến hạn hôm nay/ngày mai, tỉ lệ nhớ đúng, biểu đồ 14 ngày, các từ hay quên nhất. Có mục tiêu số lượt ôn mỗi ngày. |
| **Đồng bộ** | Lưu ngay trên máy (dùng được khi offline) và tự động đồng bộ lên Google Drive. Gộp dữ liệu thông minh khi dùng nhiều thiết bị. |
| **Dữ liệu** | Xuất/nhập JSON và CSV (mở được bằng Excel / Google Sheets), đặt lại tiến độ học. |
| **Giao diện** | Tiếng Việt, chế độ sáng/tối, tự co giãn theo màn hình. Phím tắt trên máy tính: `N` thêm từ, `/` tìm kiếm, `Space` lật thẻ, `1–4` chấm điểm. |

## 1. Chạy thử trên máy tính

```bash
cd vocab-app
python3 -m http.server 8000
```
Mở http://localhost:8000. Lúc này ứng dụng đã dùng được đầy đủ (lưu trên trình duyệt). Phần Google Drive cần cấu hình thêm theo mục 3.

## 2. Đưa lên mạng (miễn phí) để dùng trên điện thoại

Muốn cài lên điện thoại thì ứng dụng phải có địa chỉ **https**. Chọn một trong các cách sau:

- **GitHub Pages**: tạo repository → tải toàn bộ thư mục `vocab-app` lên → Settings → Pages → chọn nhánh `main` → bạn sẽ có địa chỉ dạng `https://<tên-tài-khoản>.github.io/<tên-repo>/`.
- **Netlify Drop**: vào https://app.netlify.com/drop rồi kéo–thả thư mục `vocab-app` vào.
- **Cloudflare Pages / Vercel**: cách làm tương tự.

**Cài lên điện thoại**
- Android (Chrome): mở địa chỉ trang → menu ⋮ → **Cài đặt ứng dụng** / **Thêm vào màn hình chính**.
- iPhone/iPad (Safari): nút **Chia sẻ** → **Thêm vào MH chính**.
- Máy tính (Chrome/Edge): bấm biểu tượng cài đặt ở thanh địa chỉ.

## 3. Cấu hình Google Drive (người triển khai chỉ làm 1 lần)

1. Vào https://console.cloud.google.com/ → **tạo dự án mới** (ví dụ: `VocabNote`).
2. **APIs & Services → Library** → tìm **Google Drive API** → bấm **Enable**.
3. **APIs & Services → OAuth consent screen** (giao diện mới gọi là *Google Auth Platform*):
   - User type: **External**. Điền tên ứng dụng và email hỗ trợ.
   - Scopes: thêm `.../auth/drive.file`, `openid`, `email`, `profile`.
   - Khi đang thử nghiệm: thêm email của những người sẽ dùng vào **Test users** (tối đa 100 người).
   - Muốn ai cũng dùng được thì bấm **Publish app**. Quyền `drive.file` thuộc loại không nhạy cảm nên thường không phải chờ Google xét duyệt.
4. **Credentials → Create credentials → OAuth client ID** → Application type: **Web application**.
   - **Authorized JavaScript origins**: thêm địa chỉ trang của bạn, ví dụ `https://tenban.github.io` (chỉ phần tên miền, không có đường dẫn phía sau), và `http://localhost:8000` để chạy thử.
5. Sao chép **Client ID** (dạng `xxxx.apps.googleusercontent.com`) và dán vào `config.js`:
   ```js
   window.VOCAB_CONFIG = { googleClientId: 'xxxx.apps.googleusercontent.com', driveFileName: 'VocabNote-data.json' };
   ```
   (Hoặc mỗi người tự dán vào **Cài đặt → Google Drive → Cấu hình Google Client ID**.)

**Người dùng sử dụng thế nào?** Vào **Cài đặt → Kết nối Google Drive** rồi đăng nhập bằng tài khoản Google của mình. Ứng dụng sẽ tạo file `VocabNote-data.json` trong *Drive của tôi*. Trên thiết bị khác, chỉ cần đăng nhập cùng tài khoản là dữ liệu tự tải về. Mỗi người một tài khoản Google nên dữ liệu luôn riêng biệt. Một người cũng có thể dùng nhiều sổ khác nhau bằng cách đổi “Tên file dữ liệu trên Drive”.

**Lưu ý**
- Ứng dụng chỉ đọc/ghi được những file do chính nó tạo ra (quyền `drive.file`), không thể xem các file khác trong Drive của bạn.
- Phiên đăng nhập Google kéo dài khoảng 1 giờ. Khi hết hạn, nút đồng bộ ở góc trên sẽ hiện **“Đăng nhập lại”**. Chỉ cần bấm một lần là xong (thường không phải nhập lại mật khẩu). Trong lúc chờ, mọi thay đổi vẫn được lưu trên máy và sẽ tự đồng bộ sau khi đăng nhập lại.
- Khi sửa trên nhiều thiết bị, bản chỉnh sửa mới nhất của từng từ sẽ được giữ lại. Từ đã xoá sẽ bị xoá trên mọi thiết bị.

## Cấu trúc thư mục

```
vocab-app/
├── index.html            khung trang
├── styles.css            giao diện (sáng/tối, responsive)
├── app.js                toàn bộ logic: dữ liệu, ôn tập, viết tay, Drive, TTS
├── config.js             Google Client ID
├── sw.js                 service worker (chạy offline)
├── manifest.webmanifest  thông tin để cài như ứng dụng
└── icons/                biểu tượng
```

Ứng dụng không cần máy chủ hay cơ sở dữ liệu riêng: chỉ là các file tĩnh, cộng với Google Drive của từng người dùng.
