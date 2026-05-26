/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, Copy, ExternalLink, Key, FolderOpen, ShieldCheck } from "lucide-react";
import { useToast } from "./ToastContext";

interface GCloudGuideProps {
  onClose: () => void;
}

export default function GCloudGuide({ onClose }: GCloudGuideProps) {
  const { success } = useToast();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    success(`Đã sao chép ${label}`, "Bạn có thể dán trực tiếp vào Google Cloud Console hoặc biểu mẫu.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Hướng dẫn cấu hình kết nối Google Drive</h2>
              <p className="text-xs text-neutral-400">Cách sử dụng Service Account làm Cơ sở dữ liệu cho Modpack</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-8 text-neutral-300 text-sm leading-relaxed">
          
          {/* Quick Info */}
          <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-indigo-200 text-left">
            <strong>💡 Tổng quan cơ chế mới:</strong> Hệ thống hoạt động 100% Client-side (SPA). Cả người chơi (User) và Quản trị viên (Admin) không cần đăng nhập Google OAuth. Mọi giao dịch đọc/ghi diễn ra qua một **Google Cloud Service Account** được mã hóa gọn gàng trong tệp <code>.alpha</code>.
          </div>

          {/* Step 1 */}
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-2 text-white font-semibold">
              <span className="w-6 h-6 rounded-full bg-neutral-850 text-neutral-300 flex items-center justify-center text-xs">1</span>
              <h3>Chuẩn bị Thư mục lưu trữ trên Google Drive</h3>
            </div>
            <div className="pl-8 space-y-2">
              <p>Tạo một thư mục trên Google Drive để chứa toàn bộ các file modpack dạng nén <code>.zip</code>.</p>
              <p className="text-xs text-neutral-400">
                Từ liên kết thư mục (Folder URL), chúng ta sẽ có <strong>Folder ID</strong>. Ví dụ: URL <code>https://drive.google.com/drive/folders/<strong>18_K236iBvYourFolderIDHere</strong></code> tương ứng với ID nằm ở cuối đường dẫn.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-2 text-white font-semibold">
              <span className="w-6 h-6 rounded-full bg-neutral-850 text-neutral-300 flex items-center justify-center text-xs">2</span>
              <h3>Kích hoạt API và Tạo Service Account trên Google Cloud</h3>
            </div>
            <div className="pl-8 space-y-3">
              <p>Truy cập vào dịch vụ điều khiển của Google để thiết lập cấu hình dịch vụ ẩn:</p>
              <ol className="list-decimal pl-5 space-y-2 text-neutral-400">
                <li>Vào website <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-indigo-400 inline-flex items-center gap-1 hover:underline">Google Cloud Console <ExternalLink className="w-3 h-3" /></a>, tạo hoặc lựa chọn một Project.</li>
                <li>Tìm kiếm từ khóa <strong>"Google Drive API"</strong> từ ô tìm kiếm trên cùng và bấm nút <strong>Kích hoạt (Enable)</strong>.</li>
                <li>Mở mục <strong>APIs & Services &gt; Credentials (Thông tin xác thực)</strong>.</li>
                <li>Bấm nút <strong>Create Credentials</strong> trên thanh công cụ và lựa chọn mục <strong>Service Account</strong>.</li>
                <li>Khai báo thông tin tên tuỳ thích (ví dụ: <code>modpack-drive-database</code>) rồi nhấn <strong>Create and Continue</strong> và bấm <strong>Done</strong>.</li>
              </ol>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-2 text-white font-semibold">
              <span className="w-6 h-6 rounded-full bg-neutral-850 text-neutral-300 flex items-center justify-center text-xs">3</span>
              <h3>Tải Khóa riêng tư bảo mật (Private Key JSON File)</h3>
            </div>
            <div className="pl-8 space-y-3">
              <p>Khóa riêng tư này cấp quyền truy cập an toàn cho ứng dụng web tĩnh:</p>
              <ol className="list-decimal pl-5 space-y-2 text-neutral-400">
                <li>Trong danh sách tại trang Credentials, tìm tới mục <strong>Service Accounts</strong> và nhấp vào Email Service Account vừa tạo.</li>
                <li>Chuyển qua tab <strong>Keys (Khóa)</strong> ở thanh danh mục phụ phía trên.</li>
                <li>Bấm chọn <strong>Add Key (Thêm khóa) &gt; Create new key (Tạo khóa mới)</strong>.</li>
                <li>Chọn định dạng loại tệp là <strong>JSON</strong> rồi bấm nút <strong>Create</strong>. Tệp tin cấu hình bảo mật dạng <code>&lt;project-name&gt;-xxxx.json</code> sẽ tự động được tải xuống máy tính của bạn.</li>
              </ol>
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-2 text-white font-semibold">
              <span className="w-6 h-6 rounded-full bg-neutral-850 text-indigo-400 flex items-center justify-center text-xs font-bold">4</span>
              <h3>Liên kết quyền sở hữu trên Google Drive</h3>
            </div>
            <div className="pl-8 space-y-2">
              <p>Bạn bắt buộc phải chia sẻ thư mục trên Google Drive của mình với tài khoản Service Account vừa tạo:</p>
              <div className="p-3 bg-neutral-950 rounded border border-neutral-800 text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-neutral-400">
                <div className="text-left font-sans">
                  Hãy mở tệp JSON key đã tải, tìm tới trường: <code>"client_email": "<strong>your-service-account@project.iam.gserviceaccount.com</strong>"</code>
                </div>
              </div>
              <p className="font-medium text-neutral-200">Các bước gán quyền thư mục:</p>
              <ol className="list-decimal pl-5 space-y-1 text-neutral-450">
                <li>Vào Google Drive, nhấn chuột phải vào thư mục Modpack của bạn rồi chọn <strong>Chia sẻ (Share) &gt; Chia sẻ (Share)</strong>.</li>
                <li>Dán địa chỉ email của Service Account (tìm được từ tệp JSON) vào ô thêm người dùng.</li>
                <li>Gán vai trò cho Email này là: <strong>Người chỉnh sửa (Editor)</strong> để Admin có thể thêm/sửa/xóa modpack, hoặc <strong>Người xem (Viewer)</strong> nếu chỉ muốn người chơi đọc file.</li>
                <li>Bỏ tích thông báo qua email rồi nhấp <strong>Gửi/Chia sẻ (Share)</strong>.</li>
              </ol>
            </div>
          </div>

          {/* Alpha format template info */}
          <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 text-left space-y-3">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 font-display text-indigo-400">
              <Key className="w-4 h-4 text-amber-400" /> Tệp cấu hình .alpha mã hóa một chạm
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Ngay khi nạp xong khóa JSON Service Account và URL Thư mục Drive trong biểu đồ cấu hình Admin, bạn hãy bấm <strong>"Xuất cấu hình (.alpha)"</strong>. Tệp tin này đóng gói toàn bộ thông tin kết nối dưới dạng Base64:
            </p>
            <pre className="text-[11px] font-mono text-indigo-300 bg-neutral-900 rounded p-3 overflow-x-auto leading-tight border border-white/5">
{`{
  "folderUrl": "https://drive.google.com/drive/folders/...",
  "folderId": "18_K236iBvYourFolderIDHere",
  "serviceAccountKey": {
    "type": "service_account",
    "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADAN...",
    "client_email": "modpack-drive@project.iam.gserviceaccount.com"
  },
  "password": "mật_khẩu_admin_đã_thiết_lập"
}`}
            </pre>
            <p className="text-xs text-neutral-400">
              Người chơi chỉ cần nhặt tệp <code>modpack.alpha</code> này kéo thả vào giao diện máy chơi là hệ sinh thái tự liên lạc kết nối an toàn bảo mật 100%!
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 px-6 py-4 bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-lg text-xs transition-colors shadow-lg shadow-indigo-650/20 cursor-pointer font-display"
          >
            Tôi Đã Hiểu & Đóng Lại
          </button>
        </div>

      </div>
    </div>
  );
}
