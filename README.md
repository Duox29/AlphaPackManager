# 🎮 Hướng Dẫn Cấu Hình Game Modpack Drive Manager

Dự án này là hệ thống quản lý Modpack Game thế hệ mới chạy hoàn toàn client-side (Single Page Application), sử dụng **Google Drive** làm kho lưu trữ tệp tin nén `.zip` và làm cơ sở dữ liệu (`index.json` và cơ chế tự động nhân bản bảo mật `index_backup.json`). 

Dưới đây là cẩm nang cấu hình ngắn gọn trên **Google Cloud Console** để bạn nhanh chóng làm chủ và kích hoạt hệ thống phân phối modpack của mình.

---

## 📂 Bước 1: Chuẩn bị Thư mục trên Google Drive
1. Đăng nhập vào Google Drive của bạn.
2. Tạo một thư mục mới (ví dụ: `My Modpacks`).
3. Chuột phải vào Thư mục > **Chia sẻ (Share)** > Đổi quyền truy cập thành **"Bất kỳ ai có liên kết đều có thể xem" (Anyone with link can view)**.
   * *Lưu ý: Đây là bước quan trọng nhất để người chơi có thể tải tệp tin và đọc cơ sở dữ liệu.*
4. Copy lại **Folder ID** từ đường dẫn dán trên trình duyệt:  
   `https://drive.google.com/drive/folders/`**`<FOLDER_ID>`**

---

## 🌩️ Bước 2: Tạo dự án tại Google Cloud Console

1. Truy cập vào **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Phía trên cùng, chọn danh sách Project > bấm **Dự án mới (New Project)**, đặt tên tùy ý (ví dụ: `Minecraft Modpack Portal`) và nhấn **Tạo (Create)**.

---

## 🔌 Bước 3: Kích Hoạt Google Drive API

1. Trên thanh tìm kiếm ở đầu Cloud Console, gõ **"Google Drive API"**.
2. Chọn kết quả tương ứng từ danh sách hiện ra.
3. Nhấp vào nút xanh hiển thị chữ **Kích hoạt (Enable)**.

---

## 🔑 Bước 4: Thiết Lập Màn Hình Đồng ý OAuth (OAuth Consent Screen)

Để Admin có thể đăng nhập uỷ quyền ghi tệp tin lên Drive mà không bị chặn, bạn cần cấu hình màn hình đồng ý OAuth:
1. Truy cập vào menu bên trái: **APIs & Services (API và dịch vụ) > OAuth consent screen**.
2. Chọn loại người dùng là **External (Ngoài tổ chức)** > nhấn **Tạo (Create)**.
3. Điền các trường thông tin cơ bản bắt buộc:
   * **App name**: vd `Cổng Quản Lý Modpack`
   * **User support email**: Email quản lý của bạn.
   * **Developer contact information**: Nhập lại email của bạn.
4. Nhấn **Save and Continue (Lưu và tiếp tục)** cho đến bước **Test Users (Người dùng thử nghiệm)**.
5. **[Cực kỳ quan trọng!]** Trong mục Test Users, bấm **Add Users** và điền địa chỉ email Gmail quản trị viên Google Drive của bạn. Nếu thiếu bước này, bạn sẽ bị báo lỗi *Blocked* khi đăng nhập thực tế.
6. Nhấn hoàn thành.

---

## 🔒 Bước 5: Tạo API Key (Dành cho Người chơi đọc dữ liệu)

1. Đi tới menu: **APIs & Services > Credentials (Thông tin xác thực)**.
2. Bấm **Create Credentials (Tạo thông tin xác thực)** ở menu phía trên > chọn **API Key**.
3. Bút chì chỉnh sửa API Key vừa nhận được để bảo vệ khóa:
   * Chọn **API Restriction** > Đánh dấu chọn duy nhất **Google Drive API**.
   * Lưu lại và lưu trữ API Key này lại.

---

## 🖥️ Bước 6: Tạo OAuth Client ID (Dành cho Admin đăng nhập)

1. Trở về màn hình **Credentials**.
2. Bấm **Create Credentials** > chọn **OAuth Client ID**.
3. Thiết lập loại ứng dụng là **Web Application (Ứng dụng web)**.
4. Cấu hình bảo mật CORS & chuyển hướng:
   * **Authorized JavaScript origins (Nguồn gốc JavaScript được ủy quyền)**:  
     Thêm liên kết trang GitHub Pages hoặc URL chạy chính thức của bạn (Không kết thúc bằng dấu gạch chéo `/`).  
     *Ví dụ:* `https://username.github.io` hoặc `http://localhost:3000`
   * **Authorized redirect URIs (URI chuyển hướng được cấp phép)**:  
     Thêm liên kết chính xác của bạn tương tự như trên.  
     *Ví dụ:* `https://username.github.io` hoặc `http://localhost:3000`
5. Nhấn **Tạo (Create)**. Bạn sẽ nhận được chuỗi **Client ID** (Dạng `xxxxxxx.apps.googleusercontent.com`).

---

## 🪐 Bước 7: Xuất tệp tin cấu hình cấp phát `.alpha`

1. Đăng nhập vào trang web game Modpack của bạn ở tab **Quản Lý Modpack (Admin)** (Mật khẩu mặc định là `admin123`).
2. Nhập các thông tin vừa tạo bao gồm:
   * **API Key**
   * **Folder ID**
   * **OAuth Client ID**
3. Bấm nút **"Xuất tệp cấu hình (.alpha)"**.
4. Trình duyệt tự tải tệp tin mã hóa `modpack.alpha`.
5. Đơn giản gửi tệp tin này cho người chơi. Người chơi truy cập vào web chỉ cần kéo thả tệp này vào vùng rỗng là có thể tự kết nối và tải toàn bộ modpack từ sever Drive của bạn mà không cần tài khoản hay uỷ quyền phức tạp!
