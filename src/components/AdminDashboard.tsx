/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Key, 
  Lock, 
  FolderOpen, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Save, 
  Download, 
  ExternalLink, 
  Plus, 
  Edit3, 
  Trash2, 
  Layers, 
  AlertTriangle,
  RefreshCw,
  X,
  FileCode,
  CheckCircle,
  Clock,
  Settings,
  HelpCircle
} from "lucide-react";
import { AppConfig, Modpack, ModpackDatabase, ModpackVersion, DriveFileInfo } from "../types";
import { useToast } from "./ToastContext";
import { 
  findFileByName, 
  readFileContent, 
  listFiles, 
  saveDatabaseWithBackup, 
  uploadFileToFolder,
  extractFolderIdFromUrl,
  getAccessTokenFromServiceAccount
} from "../utils/drive";
import { motion, AnimatePresence } from "motion/react";
import { DEMO_DATABASE } from "./UserDashboard";

interface AdminDashboardProps {
  onShowGuide: () => void;
}

export default function AdminDashboard({ onShowGuide }: AdminDashboardProps) {
  const { success, error, warning, info } = useToast();

  // Authentication Gate State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Settings Credentials
  const [folderUrl, setFolderUrl] = useState("");
  const [folderId, setFolderId] = useState("");
  const [serviceAccountKey, setServiceAccountKey] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [oauthToken, setOauthToken] = useState("");

  // DB and Drive State
  const [db, setDb] = useState<ModpackDatabase | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFileInfo[]>([]);
  const [indexFileId, setIndexFileId] = useState<string | null>(null);
  const [backupFileId, setBackupFileId] = useState<string | null>(null);
  
  // UI Panels / Interactive tabs
  const [activeSubTab, setActiveSubTab] = useState<"metadata" | "unmapped">("metadata");
  const [selectedPack, setSelectedPack] = useState<Modpack | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  
  // Modpack Form state
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formVersions, setFormVersions] = useState<ModpackVersion[]>([]);
  
  // Version addition sub-form state
  const [vFormId, setVFormId] = useState("");
  const [vFormFileId, setVFormFileId] = useState("");
  const [vFormChangelog, setVFormChangelog] = useState("");
  const [vFormGameVersion, setVFormGameVersion] = useState("1.20.1");

  // Check URL Hash and config on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem("modpack_drive_config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as AppConfig;
        setFolderUrl(parsed.folderUrl || "");
        setFolderId(parsed.folderId || "");
        setServiceAccountKey(parsed.serviceAccountKey || null);
        setPassword(parsed.password || "");

        // Lock tab manager only after an alpha config exists/is imported 
        if (sessionStorage.getItem("modpack_admin_authenticated") === "true") {
          setIsAdminLoggedIn(true);
        } else {
          setIsAdminLoggedIn(false);
        }
      } catch (e) {
        console.error("Lỗi đọc credentials từ localStorage");
        setIsAdminLoggedIn(true);
      }
    } else {
      // If no config, is unlocked by default so admin can configure!
      setIsAdminLoggedIn(true);
    }

    const savedToken = sessionStorage.getItem("modpack_drive_gtoken");
    if (savedToken) {
      setOauthToken(savedToken);
    }
  }, []);

  const handleImportServiceAccountKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsed = JSON.parse(text);
          if (!parsed.private_key || !parsed.client_email) {
            error("Tệp Credentials sai định dạng", "Hãy kiểm tra xem đây có phải tệp Google Service Account JSON hợp lệ không.");
            return;
          }
          setServiceAccountKey(parsed);
          success("Nạp Service Account thành công!", `Sẵn sàng cho: ${parsed.client_email}`);
        } catch (err) {
          error("Không thể đọc tệp XML/JSON", "Cú pháp tệp tin bị hỏng.");
        }
      };
      reader.readAsText(file);
    }
  };

  const getOrFetchToken = async (): Promise<string> => {
    if (oauthToken) return oauthToken;
    if (serviceAccountKey) {
      const token = await getAccessTokenFromServiceAccount(
        serviceAccountKey.client_email,
        serviceAccountKey.private_key
      );
      setOauthToken(token);
      sessionStorage.setItem("modpack_drive_gtoken", token);
      return token;
    }
    throw new Error("Vui lòng cấu hình Credentials và nạp tệp Private Key Service Account trước.");
  };

  // Password Login Handler
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    let correctPassword = "admin123";
    const savedConfig = localStorage.getItem("modpack_drive_config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as AppConfig;
        if (parsed.password) {
          correctPassword = parsed.password;
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (passwordInput === correctPassword) {
      setIsAdminLoggedIn(true);
      sessionStorage.setItem("modpack_admin_authenticated", "true");
      success("Đăng nhập Admin thành công!", "Chào mừng bạn quay lại bảng điều khiển.");
    } else {
      error("Sai mật khẩu!", "Mật khẩu quản trị viên không chính xác. Hãy nhập lại.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem("modpack_admin_authenticated");
    success("Đã thoát tài khoản Admin");
  };

  // Trigger file loading from Drive using admin credentials
  const handleSyncFromDrive = async () => {
    if (!folderId) {
      warning("Thiếu Folder ID", "Vui lòng nhập Google Drive Folder URL hoặc Folder ID.");
      return;
    }
    if (!serviceAccountKey) {
      warning("Thiếu Credentials", "Vui lòng nạp hoặc chọn tệp Private Key (.json) của Service Account.");
      return;
    }

    setLoading(true);

    try {
      // Get OAuth token first
      info("Đang kết nối bảo mật G-Drive...", "Xác thực tệp tin Credentials qua Google TLS...");
      const activeToken = await getOrFetchToken();

      // 1. Find or List files
      info("Đang dò quét thư mục...", "Đang tải danh sách các tệp tin .zip trên thư mục Drive.");
      const files = await listFiles("", folderId, activeToken);
      
      const zipFiles = files.filter((f) => f.name.toLowerCase().endsWith(".zip"));
      setDriveFiles(zipFiles);

      // 2. Resolve index.json database file
      const indexId = await findFileByName("", folderId, "index.json", activeToken);
      setIndexFileId(indexId);

      const backupId = await findFileByName("", folderId, "index_backup.json", activeToken);
      setBackupFileId(backupId);

      if (indexId) {
        const loadedDb = await readFileContent<ModpackDatabase>("", indexId, activeToken);
        if (loadedDb) {
          setDb(loadedDb);
          success("Đã đồng bộ cơ sở dữ liệu!", `Đã tìm thấy ${loadedDb.modpacks.length} Modpack được lập chỉ mục.`);
        } else {
          throw new Error("Tệp index.json rỗng.");
        }
      } else {
        warning("Chưa có cơ sở dữ liệu trên Drive", "Tạo một cơ sở dữ liệu mới để bắt đầu quản trị.");
        setDb({ lastUpdated: new Date().toISOString(), modpacks: [] });
      }

      // Sync settings credentials state into modpack_drive_config in localstorage, locking the administrative panel
      const clientConf: AppConfig = {
        folderId,
        folderUrl,
        serviceAccountKey,
        password: password || "admin123"
      };
      localStorage.setItem("modpack_drive_config", JSON.stringify(clientConf));

    } catch (err: any) {
      console.error(err);
      error("Đồng bộ máy chủ thất bại", `Đường truyền bị gián đoạn hoặc phân quyền tệp/thư mục không hợp lệ. Chi tiết: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create clean empty index.json on GDrive for the user
  const handleBootstrapDatabase = async () => {
    setSaving(true);
    try {
      const activeToken = await getOrFetchToken();
      const initialDb: ModpackDatabase = {
        lastUpdated: new Date().toISOString(),
        modpacks: []
      };
      
      const id = await uploadFileToFolder(
        activeToken,
        folderId,
        "index.json",
        JSON.stringify(initialDb, null, 2),
        indexFileId
      );
      
      setIndexFileId(id);
      setDb(initialDb);
      success("Khởi tạo index.json thành công!", "Dữ liệu ban đầu đã cập nhật lên Google Drive.");
    } catch (err: any) {
      error("Lỗi khởi tạo", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Base64 configuration encoder & downloader
  const handleExportConfig = () => {
    if (!folderId || !serviceAccountKey) {
      warning("Thiếu cấu hình kết nối", "Vui lòng nhập Link Thư mục Drive, nạp Credentials và đặt Password trước khi xuất.");
      return;
    }

    const clientConf: AppConfig = {
      folderId,
      folderUrl,
      serviceAccountKey,
      password: password || "admin123"
    };
    
    const jsonStr = JSON.stringify(clientConf);
    const base64Str = btoa(unescape(encodeURIComponent(jsonStr)));
    
    // File Download Trigger
    const element = document.createElement("a");
    const file = new Blob([base64Str], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "modpack.alpha";
    document.body.appendChild(element); // Required for Firefox support
    element.click();
    document.body.removeChild(element);

    success("Đã xuất tệp cấu hình .alpha!", "Hãy đưa tệp tin này cho người chơi; tệp tin chứa mã bảo mật đã thiết lập.");
  };

  // Add or update modpack in database local state, then upload to Drive
  const handleSaveModpackFromForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formId || !formName) {
      warning("Dữ liệu không hợp lệ", "Mã Modpack và Tên Modpack không được phép để trống.");
      return;
    }

    if (!db) {
      error("Chưa có cơ sở dữ liệu", "Đồng bộ dữ liệu hoặc bootstrap index.json trước khi thực hiện.");
      return;
    }

    // 1. Build Modpack entry object
    const updatedPack: Modpack = {
      id: formId.trim().toLowerCase().replace(/\s+/g, "-"),
      name: formName.trim(),
      description: formDesc.trim(),
      category: formCategory.trim() || "Chung",
      versions: formVersions,
      createdAt: drawerMode === "create" ? new Date().toISOString() : (selectedPack?.createdAt || new Date().toISOString()),
      updatedAt: new Date().toISOString(),
    };

    // 2. Sync to local database state
    let newModpacks = [...db.modpacks];
    if (drawerMode === "create") {
      // Check duplicate ID
      if (newModpacks.some((x) => x.id === updatedPack.id)) {
        error("Trùng mã ID", "Mã Modpack này đã tồn tại trong danh sách. Hãy dùng mã riêng biệt.");
        return;
      }
      newModpacks.push(updatedPack);
    } else {
      newModpacks = newModpacks.map((x) => x.id === selectedPack?.id ? updatedPack : x);
    }

    const updatedDb: ModpackDatabase = {
      lastUpdated: new Date().toISOString(),
      modpacks: newModpacks,
    };

    // 3. Commit immediately to Drive with backup if Credentials loaded
    setSaving(true);
    try {
      const activeToken = await getOrFetchToken();
      const ids = await saveDatabaseWithBackup(
        activeToken,
        folderId,
        updatedDb,
        indexFileId,
        backupFileId
      );
      setIndexFileId(ids.indexFileId);
      setBackupFileId(ids.backupFileId);
      setDb(updatedDb);
      setShowDrawer(false);
      setSelectedPack(updatedPack);
      success("Đã lưu & đồng bộ Drive!", "Dữ liệu (gồm tệp sao lưu) đã cập nhật trực tiếp lên đám mây thành công.");
    } catch (err: any) {
      error("Lưu G-Drive thất bại", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete modpack entry from database
  const handleDeletePack = async (packId: string) => {
    if (!db) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa Modpack với mã "${packId}" không? Hành động này sẽ cập nhật database.`)) return;

    const filtered = db.modpacks.filter((x) => x.id !== packId);
    const updatedDb = { ...db, lastUpdated: new Date().toISOString(), modpacks: filtered };

    setSaving(true);
    try {
      const activeToken = await getOrFetchToken();
      const ids = await saveDatabaseWithBackup(
        activeToken,
        folderId,
        updatedDb,
        indexFileId,
        backupFileId
      );
      setIndexFileId(ids.indexFileId);
      setBackupFileId(ids.backupFileId);
      setDb(updatedDb);
      setSelectedPack(null);
      success("Đã xóa Modpack khỏi đám mây!");
    } catch (err: any) {
      error("Lỗi xóa tệp", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Initialize form states for creating/editing drawer
  const openFormForCreate = () => {
    setDrawerMode("create");
    setFormId("");
    setFormName("");
    setFormDesc("");
    setFormCategory("");
    setFormVersions([]);
    
    setVFormId("");
    setVFormFileId("");
    setVFormChangelog("");
    setVFormGameVersion("1.20.1");

    setShowDrawer(true);
  };

  const openFormForEdit = (pack: Modpack) => {
    setDrawerMode("edit");
    setFormId(pack.id);
    setFormName(pack.name);
    setFormDesc(pack.description || "");
    setFormCategory(pack.category || "");
    setFormVersions(pack.versions || []);

    setVFormId("");
    setVFormFileId("");
    setVFormChangelog("");
    setVFormGameVersion("1.20.1");

    setShowDrawer(true);
  };

  // Add version list items on active form
  const handleAddVersionToForm = () => {
    if (!vFormId || !vFormFileId) {
      warning("Thiếu phiên bản", "Lựa chọn tệp zip và gõ định dạng phiên bản (ví dụ v1.0.0)");
      return;
    }

    // Resolve details from files in Drive
    const matchedFile = driveFiles.find((f) => f.id === vFormFileId);

    const newVersion: ModpackVersion = {
      id: vFormId.trim(),
      fileId: vFormFileId,
      fileName: matchedFile?.name || "unresolved.zip",
      uploadedAt: new Date().toISOString(),
      size: matchedFile ? parseInt(matchedFile.size || "0") : 0,
      changelog: vFormChangelog,
      gameVersion: vFormGameVersion,
      isActive: true
    };

    // Eliminate duplicates
    const filtered = formVersions.filter((v) => v.id !== newVersion.id);
    setFormVersions([...filtered, newVersion]);
    
    // Reset sub-form
    setVFormId("");
    setVFormFileId("");
    setVFormChangelog("");
    
    success(`Đã đính kèm bản: ${vFormId}`);
  };

  const handleToggleVersionActive = (vId: string) => {
    setFormVersions(
      formVersions.map((v) => v.id === vId ? { ...v, isActive: !v.isActive } : v)
    );
  };

  const handleRemoveVersionFromForm = (vId: string) => {
    setFormVersions(formVersions.filter((v) => v.id !== vId));
  };

  // Identify unmapped files
  const getUnmappedFiles = (): DriveFileInfo[] => {
    if (!db) return driveFiles;
    const mappedIds = new Set<string>();
    db.modpacks.forEach((p) => {
      p.versions.forEach((v) => {
        mappedIds.add(v.fileId);
      });
    });
    return driveFiles.filter((f) => !mappedIds.has(f.id));
  };

  const unmappedFiles = getUnmappedFiles();

  return (
    <div className="space-y-6">
      
      {/* 2.2 ADMINISTRATION ACCESS PROTECTION GATE */}
      {!isAdminLoggedIn ? (
        <div className="max-w-md mx-auto py-24 px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-3xl bg-bento-card bento-glow-border bento-glow shadow-2xl space-y-6 flex flex-col items-center text-center border border-white/5 backdrop-blur-md"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-tight font-display">Khu Vực Quản Trị Viên</h2>
              <p className="text-xs text-neutral-400 max-w-[280px] leading-relaxed">
                Nhập mật khẩu kiểm quyền quản trị viên để mở khóa bảng điều khiển cơ sở dữ liệu.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="w-full space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Mật khẩu (mặc định: admin123)"
                  className="w-full bg-neutral-950/80 border border-white/5 focus:border-indigo-500 text-xs text-center text-white py-3 px-4 rounded-xl outline-none placeholder-neutral-600 transition-all font-mono"
                  id="admin-password-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/15 cursor-pointer font-display uppercase tracking-wider"
              >
                Mở Khóa Hệ Thống
              </button>
            </form>
          </motion.div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Dashboard Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-bento-card bento-glow-border bento-glow shadow-xl border border-white/5">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-450" />
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  QUẢN TRỊ VIÊN ACTIVE
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight font-display">⚙️ Bảng Quản Trị Modpack</h1>
              <p className="text-xs text-neutral-400">Thiết lập kết nối, tạo file cấu hình cấp cho User, định lượng và biên soạn metadata tệp modpack.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onShowGuide}
                className="bg-neutral-900 hover:bg-neutral-850 text-indigo-400 hover:text-indigo-300 border border-white/5 hover:border-indigo-550/30 text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-display"
              >
                <HelpCircle className="w-4 h-4" /> Tài liệu Hướng dẫn
              </button>
              
              <button
                onClick={handleAdminLogout}
                className="text-xs text-neutral-400 hover:text-rose-400 font-bold px-3.5 py-2.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer font-display"
              >
                Đăng Xuất
              </button>
            </div>
          </div>

          {/* Core Settings / GCloud & G-Drive Credentials form */}
          <div className="p-6 rounded-3xl bg-bento-card bento-glow-border bento-glow space-y-6 text-left border border-white/5">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 font-display">
              <Settings className="w-4.5 h-4.5 text-indigo-500" /> Cấu hình máy chủ dữ liệu G-Drive
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Google Drive Folder URL */}
              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="admin-folder-url" className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider font-display">Đường dẫn thư mục Google Drive (Folder URL):</label>
                <input
                  type="text"
                  id="admin-folder-url"
                  value={folderUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFolderUrl(val);
                    setFolderId(extractFolderIdFromUrl(val));
                  }}
                  placeholder="https://drive.google.com/drive/folders/abcdef123..."
                  className="w-full bg-neutral-950/80 border border-white/5 focus:border-indigo-500 text-xs text-neutral-200 py-3 px-4 rounded-xl outline-none transition-all font-mono"
                />
                {folderId && (
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">Dò tìm Folder ID: <span className="text-indigo-400">{folderId}</span></p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="admin-access-password" className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider font-display">Mật khẩu truy cập Admin:</label>
                <input
                  type="text"
                  id="admin-access-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu bảo vệ tab quản trị (Mặc định: admin123)"
                  className="w-full bg-neutral-950/80 border border-white/5 focus:border-indigo-500 text-xs text-neutral-200 py-3 px-4 rounded-xl outline-none transition-all font-mono"
                />
              </div>

              {/* Service Account File */}
              <div className="space-y-1.5 md:col-span-3">
                <label className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider font-display block">Tệp kết nối dự án (Service Account Key JSON):</label>
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1 text-left flex-1">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${serviceAccountKey ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {serviceAccountKey ? "Trạng thái xác thực: Đã nạp khóa" : "Trạng thái xác thực: Thiếu khóa"}
                    </h4>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Google Service Account cấp quyền đọc/ghi mà không cần đăng nhập uỷ quyền. Hệ thống mã hóa khóa này trực tiếp vào tệp .alpha.
                    </p>
                    {serviceAccountKey && (
                      <p className="text-[11px] text-emerald-400 font-mono bg-neutral-900/85 px-2.5 py-1 rounded-md border border-emerald-500/10 inline-block mt-1">
                        Email liên kết: {serviceAccountKey.client_email}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 self-stretch md:self-center justify-end">
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleImportServiceAccountKey}
                      id="service-account-uploader"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById("service-account-uploader")?.click()}
                      className="whitespace-nowrap bg-neutral-900 hover:bg-neutral-850 text-indigo-400 hover:text-indigo-300 border border-white/5 hover:border-indigo-500/20 text-xs font-black py-3 px-4 rounded-xl transition-all cursor-pointer font-display flex items-center gap-1.5"
                    >
                      <FileCode className="w-4 h-4" /> Nạp tệp JSON Service Account
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Buttons for actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
              
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSyncFromDrive}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-650/15 disabled:opacity-50 cursor-pointer font-display uppercase tracking-wider"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Đồng bộ & Quét G-Drive
                </button>

                {db && indexFileId === null && (
                  <button
                    onClick={handleBootstrapDatabase}
                    disabled={saving}
                    className="bg-neutral-900 hover:bg-neutral-850 text-emerald-450 border border-white/5 hover:border-emerald-500/25 font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-display"
                  >
                    <FileCode className="w-4 h-4" /> Khởi tạo tệp index.json mới
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportConfig}
                  className="bg-neutral-900 hover:bg-neutral-850 text-amber-400 hover:text-amber-350 border border-white/5 hover:border-amber-500/20 text-xs font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-display"
                >
                  <Download className="w-4 h-4" /> Xuất cấu hình (.alpha)
                </button>
              </div>

            </div>

          </div>

          {/* SYSTEM PANEL OVERVIEWS WITH DETAILED WORKFLOWS */}
          {db && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
              
              {/* Left Panel: Tabs for existing modpacks or unmapped zip file list */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Header subtabs toggle */}
                <div className="flex border-b border-neutral-850 p-1 bg-neutral-950/60 rounded-xl">
                  
                  <button
                    onClick={() => setActiveSubTab("metadata")}
                    className={`flex-1 py-2.5 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      activeSubTab === "metadata"
                        ? "bg-neutral-900 border border-neutral-800 text-white"
                        : "text-neutral-450 hover:text-neutral-200"
                    }`}
                  >
                    <Layers className="w-4 h-4" /> Modpack Đã Định Nghĩa ({db.modpacks.length})
                  </button>

                  <button
                    onClick={() => setActiveSubTab("unmapped")}
                    className={`flex-1 py-2.5 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      activeSubTab === "unmapped"
                        ? "bg-neutral-900 border border-neutral-800 text-white"
                        : "text-neutral-450 hover:text-neutral-200"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" /> Tệp Zip Chưa Định Nghĩa ({unmappedFiles.length})
                  </button>

                </div>

                {/* TAB 1 CONTENT: EXISITING MODPACKS */}
                {activeSubTab === "metadata" && (
                  <div className="space-y-4">
                    
                    {/* Header Action */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-neutral-450 uppercase tracking-widest">Danh sách các Modpack cấu hình</h3>
                      <button
                        onClick={openFormForCreate}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Thêm Modpack Mới
                      </button>
                    </div>

                    {db.modpacks.length === 0 ? (
                      <div className="p-12 text-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/50 flex flex-col items-center justify-center gap-3">
                        <FileCode className="w-8 h-8 text-neutral-500" />
                        <p className="text-xs text-neutral-400 font-bold">Thư mục hiện tại chưa thiết lập modpack nào.</p>
                        <p className="text-[10px] text-neutral-500">Bấm nút "Thêm Modpack Mới" ở góc phải để bắt đầu thiết lập chỉ mục database.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {db.modpacks.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPack(selectedPack?.id === p.id ? null : p)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                              selectedPack?.id === p.id
                                ? "bg-indigo-500/5 border-indigo-500/40 shadow"
                                : "bg-neutral-900/40 border-neutral-800 hover:bg-neutral-900/80 hover:border-neutral-750"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-white">{p.name}</span>
                                <span className="text-[9px] font-mono uppercase bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">
                                  {p.id}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-400 line-clamp-1 truncate max-w-md">{p.description}</p>
                              
                              <div className="flex items-center gap-4 text-[10px] text-neutral-500 pt-1">
                                <span>Thể loại: <strong>{p.category}</strong></span>
                                <span>Hệ thống: <strong>{p.versions.length} bản phát hành</strong></span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openFormForEdit(p)}
                                className="p-1.5 rounded bg-neutral-850 hover:bg-neutral-750 text-indigo-400 hover:text-white transition-all"
                                title="Sửa thông tin"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => handleDeletePack(p.id)}
                                className="p-1.5 rounded bg-neutral-850 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-500 transition-all"
                                title="Xóa Modpack"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}

                {/* TAB 2 CONTENT: UNMAPPED DRIVE ZIP FILES */}
                {activeSubTab === "unmapped" && (
                  <div className="space-y-4">
                    <p className="text-xs text-neutral-400 leading-snug">
                      Các tệp tin nén <code>.zip</code> dưới đây được tìm thấy trên thư mục Drive của bạn nhưng chưa được thêm vào database metadata. Người chơi sẽ không thể xem hoặc tải nếu không khai báo chúng.
                    </p>

                    {unmappedFiles.length === 0 ? (
                      <div className="p-12 text-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/20 flex flex-col items-center justify-center gap-2">
                        <CheckCircle className="w-8 h-8 text-emerald-450" />
                        <p className="text-xs text-neutral-400 font-bold text-emerald-500">Tất cả tệp tin đã được lập chỉ mục!</p>
                        <p className="text-[10px] text-neutral-500 max-w-xs">Không còn file nén .zip thô nào không khớp trong thư mục đám mây của bạn.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {unmappedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="bg-neutral-950 border border-neutral-850 p-3 rounded-lg flex items-center justify-between gap-4 hover:border-neutral-750 transition-all"
                          >
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-white truncate font-mono">{file.name}</h4>
                              <div className="flex items-center gap-3 text-[10px] text-neutral-500 mt-1">
                                <span>ID: <code className="font-mono text-neutral-400">{file.id}</code></span>
                                {file.size && <span>Dung lượng: <strong>{(parseInt(file.size) / (1024 * 1024)).toFixed(1)} MB</strong></span>}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                // Preset creation flow and preselect the file
                                openFormForCreate();
                                setVFormFileId(file.id);
                                setVFormId("v1.0.0");
                              }}
                              className="flex-shrink-0 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-[10px] font-bold py-1.5 px-3 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Tạo Chỉ Mục Metadata
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Right Panel: Selected metadata summary metrics */}
              <div className="lg:col-span-4 sticky top-6 space-y-4">
                
                {selectedPack ? (
                  <div className="p-5 rounded-2xl bg-neutral-900 border border-indigo-500/30 bg-indigo-500/[0.01] shadow-2xl space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Xem nhanh Metadata</h3>
                      <button 
                        onClick={() => setSelectedPack(null)}
                        className="text-neutral-400 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-black text-white">{selectedPack.name}</h3>
                      <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">{selectedPack.description}</p>
                    </div>

                    <div className="space-y-2 border-t border-neutral-800 pt-3">
                      <h4 className="text-[11px] font-bold text-neutral-550 uppercase tracking-wider">Phiên bản đính kèm:</h4>
                      
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {selectedPack.versions.length === 0 ? (
                          <p className="text-xs text-neutral-500 py-2">Chưa khai báo phiên bản nào.</p>
                        ) : (
                          selectedPack.versions.map((v) => (
                            <div key={v.id} className="p-2 bg-neutral-950 rounded border border-neutral-850 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-xs font-extrabold text-white">{v.id}</span>
                                <span className="text-[9px] text-neutral-500 ml-1.5 font-mono">MC {v.gameVersion}</span>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center ${v.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>
                                {v.isActive ? 'Bật' : 'Tắt'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2 text-[10px] text-neutral-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Cập nhật mới: {new Date(selectedPack.updatedAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl border border-dashed border-neutral-800 text-center py-20 flex flex-col items-center justify-center gap-3 text-neutral-400 text-xs">
                    <div className="w-10 h-10 rounded-full border border-neutral-800 flex items-center justify-center text-neutral-500 bg-neutral-900/10">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <p className="text-neutral-400 font-bold uppercase tracking-wider">Lập chỉ mục</p>
                    <p className="text-neutral-500 max-w-[180px] mx-auto text-[11px] leading-relaxed">
                      Lựa chọn Modpack ở cột bên trái để phân tích nhanh cấu trúc metadata hiện hành.
                    </p>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      )}

      {/* 2.3 DRAWER WITH TRANSITION FOR COMPACT SPLIT VIEWS TO EDIT MODPACK */}
      <AnimatePresence>
        {showDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
            
            {/* Overlay click block */}
            <div className="absolute inset-0" onClick={() => setShowDrawer(false)} />

            {/* Inner Drawer container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%", transition: { duration: 0.2 } }}
              className="relative w-full max-w-2xl bg-neutral-900 border-l border-neutral-800 shadow-2xl h-screen flex flex-col justify-between overflow-hidden"
            >
              
              {/* Header Drawer */}
              <div className="flex items-center justify-between px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex-shrink-0 text-left">
                <div className="space-y-0.5">
                  <h3 className="text-base font-black text-white">
                    {drawerMode === "create" ? "✨ Lập Thêm Modpack Mới" : `⚙️ Chỉnh Sửa Modpack`}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {drawerMode === "create" ? "Nhập metadata ban đầu và gắn file nén zip" : `Cập nhật chỉnh sửa đổi tên hoặc chép changelog`}
                  </p>
                </div>

                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Scroll Body */}
              <form onSubmit={handleSaveModpackFromForm} className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                
                {/* ID and Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="form-pack-id" className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Mã ID viết liền (Nhận diện):</label>
                    <input
                      type="text"
                      id="form-pack-id"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      placeholder="vd: skyblock-2026"
                      disabled={drawerMode === "edit"}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-xs text-white py-2 px-3 rounded-lg outline-none transition-all disabled:opacity-50 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="form-pack-name" className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Tên Modpack hiển thị:</label>
                    <input
                      type="text"
                      id="form-pack-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="vd: Rồng Thiêng Thế Hệ Mới"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-xs text-white py-2 px-3 rounded-lg outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Sub-Metadata Category and Image */}
                <div className="space-y-1.5">
                  <label htmlFor="form-category" className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Thể loại (Category / Tag):</label>
                  <input
                    type="text"
                    id="form-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="vd: RPG / Sinh Tồn, Skyblock, Magic & Tech..."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-xs text-white py-2 px-3 rounded-lg outline-none transition-all"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label htmlFor="form-desc" className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Mô tả tóm tắt tính năng:</label>
                  <textarea
                    id="form-desc"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Cung cấp giới thiệu ngắn về lối chơi hoặc yêu cầu cấu hình tối thiểu để người chơi tham khảo..."
                    rows={3}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-xs text-white py-2 px-3 rounded-lg outline-none transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* VERSIONS ATTACHMENT PORTION */}
                <div className="space-y-4 border-t border-neutral-800 pt-4">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-5 text-indigo-500" /> Quản lý các file phiên bản (.zip) gắn kết
                  </h4>

                  {/* Attachment Form Box */}
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 space-y-3">
                    <p className="text-[10px] text-neutral-500 leading-snug">
                      Ghép nối một tệp tin zip có sẵn từ bộ nhớ đám mây của bạn vào mốc phát hành của Modpack dạng cơ sở dữ liệu.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      
                      {/* Version String Label */}
                      <div className="space-y-1">
                        <label htmlFor="vform-id" className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Mã phiên bản:</label>
                        <input
                          type="text"
                          id="vform-id"
                          value={vFormId}
                          onChange={(e) => setVFormId(e.target.value)}
                          placeholder="vd: v1.0.0-fixed"
                          className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500 text-[11px] text-white py-1.5 px-2.5 rounded outline-none transition-all"
                        />
                      </div>

                      {/* Game Version Select */}
                      <div className="space-y-1">
                        <label htmlFor="vform-game" className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Game Version:</label>
                        <input
                          type="text"
                          id="vform-game"
                          value={vFormGameVersion}
                          onChange={(e) => setVFormGameVersion(e.target.value)}
                          placeholder="vd: 1.20.1 hoặc 1.12.2"
                          className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500 text-[11px] text-white py-1.5 px-2.5 rounded outline-none transition-all"
                        />
                      </div>

                      {/* Drive File link selection dropdown */}
                      <div className="space-y-1">
                        <label htmlFor="vform-file" className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Lựa chọn tệp tin zip:</label>
                        <select
                          id="vform-file"
                          value={vFormFileId}
                          onChange={(e) => setVFormFileId(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 py-1.5 px-2.5 rounded outline-none cursor-pointer"
                        >
                          <option value="">-- Chọn tệp tin zip --</option>
                          {driveFiles.map((df) => (
                            <option key={df.id} value={df.id}>{df.name}</option>
                          ))}
                        </select>
                      </div>

                    </div>

                    {/* Version changelog */}
                    <div className="space-y-1">
                      <label htmlFor="vform-changelog" className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Nhật ký thay đổi (Changelog):</label>
                      <textarea
                        id="vform-changelog"
                        value={vFormChangelog}
                        onChange={(e) => setVFormChangelog(e.target.value)}
                        placeholder="Nhập những cập nhật chính (Dùng dấu '+' ở đầu dòng để dòng hiển thị đẹp hơn)..."
                        rows={2}
                        className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500 text-[11px] text-white py-1.5 px-2.5 rounded outline-none resize-none leading-relaxed font-mono"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddVersionToForm}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-4 rounded transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ghép Phiên Bản
                      </button>
                    </div>

                  </div>

                  {/* Active versions attached to form */}
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Danh sách phiên bản đã đính kèm ({formVersions.length}):</h5>
                    
                    {formVersions.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic py-2">Chưa gán bản phát hành nào.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {formVersions.map((v) => (
                          <div 
                            key={v.id}
                            className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 flex items-center justify-between gap-4 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-white">{v.id}</span>
                                <span className="text-[10px] bg-neutral-800 px-1.5 rounded text-neutral-400 font-mono">Game: {v.gameVersion}</span>
                              </div>
                              <p className="text-[10px] text-neutral-500 truncate mt-0.5">{v.fileName}</p>
                            </div>

                            <div className="flex items-center gap-3">
                              
                              {/* Toggle active button */}
                              <button
                                type="button"
                                onClick={() => handleToggleVersionActive(v.id)}
                                className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${
                                  v.isActive 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" 
                                    : "bg-neutral-850 border-neutral-750 text-neutral-500 hover:text-neutral-300"
                                }`}
                              >
                                {v.isActive ? "Công khai" : "Ẩn tệp"}
                              </button>

                              {/* Remove version button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveVersionFromForm(v.id)}
                                className="text-neutral-500 hover:text-rose-500 p-1"
                                title="Gỡ khỏi danh sách"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>

                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                </div>

              </form>

              {/* Drawer Footer Actions */}
              <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="bg-neutral-850 hover:bg-neutral-755 text-neutral-400 hover:text-white font-bold text-xs py-2 px-4 rounded-lg transition-colors border border-neutral-800 cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  onClick={handleSaveModpackFromForm}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-5 rounded-lg transition-colors flex items-center gap-1.5 shadow shadow-indigo-650/40 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu & Áp Dụng
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
