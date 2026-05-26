/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Download, 
  Search, 
  Info, 
  Grid, 
  Layers, 
  RefreshCw, 
  FileCode, 
  Upload, 
  X,
  Sparkles,
  Calendar,
  Layers3,
  Heart,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { AppConfig, Modpack, ModpackDatabase, ModpackVersion } from "../types";
import { useToast } from "./ToastContext";
import { 
  findFileByName, 
  readFileContent, 
  getAccessTokenFromServiceAccount,
  downloadDriveFileWithToken
} from "../utils/drive";
import { motion, AnimatePresence } from "motion/react";

// Mock database to let users try the application instantly if they have no Google Drive credentials!
export const DEMO_DATABASE: ModpackDatabase = {
  lastUpdated: new Date().toISOString(),
  modpacks: [
    {
      id: "sky-evolution",
      name: "Rồng Thiêng Sky Evolution",
      description: "Thế giới Skyblock hoàn toàn đổi mới với cơ chế chế tạo tự động, hệ thống nhiệm vụ phong phú chứa hơn 500+ Quest và các cụm hòn đảo bay huyền bí khó nhằn.",
      category: "Skyblock",
      createdAt: "2026-01-10T12:00:00Z",
      updatedAt: "2026-05-25T08:30:00Z",
      versions: [
        {
          id: "v2.1.0",
          fileName: "sky_evolution_v2.1.0_tech.zip",
          fileId: "demo-file-1",
          uploadedAt: "2026-05-20T10:15:00Z",
          size: 1458920140, // ~1.36 GB
          changelog: "+ Nâng cấp Forge lên phiên bản 47.2\n+ Cập nhật AE2 và Industrial Foregoing tối ưu hoá VPS\n+ Thêm 45 nhiệm vụ huyền thoại mới ở Nhánh Không Gian\n- Sửa lỗi văng game lúc chế tạo bàn thờ Astral Sorcery\n* Fix lỗi hiệu năng liên quan tới thực thể rác.",
          gameVersion: "1.20.1",
          isActive: true
        },
        {
          id: "v2.0.0",
          fileName: "sky_evolution_v2.0.0_major.zip",
          fileId: "demo-file-2",
          uploadedAt: "2026-04-12T09:00:00Z",
          size: 1210459301, // ~1.12 GB
          changelog: "+ Bản phát hành chính thức Sky Evolution 2.0\n+ Reset thế giới và thêm mod quan sát hành tinh\n+ Tích hợp OptiFine và các mod tối ưu hoá hiệu năng cực cao.",
          gameVersion: "1.20.1",
          isActive: true
        }
      ]
    },
    {
      id: "rlcraft-reborn",
      name: "RLCraft Vietsub Reborn",
      description: "Hành trình sinh tồn siêu khó cổ điển được làm mới lại trên phiên bản game mới hơn. Modpack dành cho những game thủ cứng cựa, mong muốn thử thách các giới hạn sinh tồn của bản thân.",
      category: "RPG / Sinh Tồn",
      createdAt: "2026-02-15T15:00:00Z",
      updatedAt: "2026-05-22T14:20:00Z",
      versions: [
        {
          id: "v1.2.6",
          fileName: "rlcraft_reborn_v1.2.6_fixed.zip",
          fileId: "demo-file-3",
          uploadedAt: "2026-05-22T14:15:00Z",
          size: 489304859, // ~466 MB
          changelog: "+ Thích ứng hoá hoàn toàn ngôn ngữ Tiếng Việt\n+ Thêm 12 hầm ngục (Dungeon) mới rải rác xung quanh spawn\n* Sửa lỗi rồng lửa hồi máu bất thường\n* Cân bằng chỉ số giáp vẩy rồng giảm 10% sát thương nhận vào.",
          gameVersion: "1.12.2",
          isActive: true
        }
      ]
    },
    {
      id: "magic-academy",
      name: "Học Viện Pháp Thuật & Công Nghệ",
      description: "Sự dung hợp đỉnh cao giữa hai trường phái Magic và Tech. Học pháp thuật của các vị thần song song với việc xây dựng lò phản ứng hạt nhân lượng tử khổng lồ.",
      category: "Magic & Tech",
      createdAt: "2026-03-01T08:00:00Z",
      updatedAt: "2026-05-18T11:00:00Z",
      versions: [
        {
          id: "v1.0.4",
          fileName: "magic_tech_academy_v1.0.4.zip",
          fileId: "demo-file-4",
          uploadedAt: "2026-05-18T11:00:00Z",
          size: 893405903, // ~852 MB
          changelog: "+ Thích hợp Botania bản lồng tiếng Việt hóa\n+ Thêm cơ chế bay năng lượng Jetpack của Mekanism\n* Tối ưu RAM khởi động (Chỉ cần tối thiểu 6GB RAM).",
          gameVersion: "1.16.5",
          isActive: true
        }
      ]
    }
  ]
};

interface UserDashboardProps {
  onAdminRequest: () => void;
}

export default function UserDashboard({ onAdminRequest }: UserDashboardProps) {
  const { success, error, warning, info } = useToast();
  
  const [db, setDb] = useState<ModpackDatabase | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGameVersion, setSelectedGameVersion] = useState("Tất cả");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedModpack, setSelectedModpack] = useState<Modpack | null>(null);
  
  // Drag and Drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  // Load configured server on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem("modpack_drive_config");
    const savedDemo = localStorage.getItem("modpack_drive_is_demo");
    
    if (savedDemo === "true") {
      setIsDemo(true);
      setDb(DEMO_DATABASE);
      info("Đang hiển thị chế độ Thử nghiệm (Demo)", "Bạn có thể trải nghiệm giao diện người dùng hoàn toàn miễn phí.");
    } else if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as AppConfig;
        setConfig(parsed);
        fetchDatabaseFromDrive(parsed);
      } catch (e) {
        localStorage.removeItem("modpack_drive_config");
      }
    }
  }, []);

  // Fetch index.json from Google Drive using active config
  const fetchDatabaseFromDrive = async (cfg: AppConfig) => {
    setLoading(true);
    try {
      if (!cfg.serviceAccountKey) {
        throw new Error("Tệp cấu hình .alpha thiếu thông tin Khóa Service Account.");
      }

      // Generate Access Token
      info("Đang kết nối bảo mật G-Drive...", "Nhận lập mã xác thực an toàn khách hàng...");
      const token = await getAccessTokenFromServiceAccount(
        cfg.serviceAccountKey.client_email,
        cfg.serviceAccountKey.private_key
      );

      // Find index.json in the specified folder
      const fileId = await findFileByName("", cfg.folderId, "index.json", token);
      if (!fileId) {
        warning("Không tìm thấy tệp cơ sở dữ liệu", "Thư mục Drive trống hoặc Admin chưa đồng bộ file index.json.");
        setDb({ lastUpdated: new Date().toISOString(), modpacks: [] });
        setLoading(false);
        return;
      }

      const content = await readFileContent<ModpackDatabase>("", fileId, token);
      if (content) {
        setDb(content);
        success("Đã đồng bộ dữ liệu Modpack", "Toàn bộ thông tin mới nhất từ Google Drive đã tải thành công.");
      } else {
        throw new Error("Tệp index.json bị rỗng hoặc lỗi cú pháp.");
      }
    } catch (err: any) {
      console.error(err);
      error("Đồng bộ thất bại", `Đường truyền bị gián đoạn hoặc khóa Service Account không hợp lệ. Chi tiết: ${err.message}`);
      setConfig(null);
      localStorage.removeItem("modpack_drive_config");
    } finally {
      setLoading(false);
    }
  };

  // Drag handers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Drop handler
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
 
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processConfigFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processConfigFile(file);
    }
  };

  // Base64 decode and check config structure
  const processConfigFile = async (file: File) => {
    // Check file end
    if (!file.name.endsWith(".alpha")) {
      error("Định dạng không hợp lệ", "Hãy kéo thả tệp tin có đuôi mở rộng dạng '.alpha'.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const textEncrypted = event.target?.result as string;
        if (!textEncrypted) throw new Error("File rỗng");
        
        // Base64 Decode
        let decodedStr = "";
        try {
          decodedStr = decodeURIComponent(escape(atob(textEncrypted.trim())));
        } catch (b64Err) {
          try {
            decodedStr = atob(textEncrypted.trim());
          } catch (e) {
            throw new Error("Không thể giải mã hóa Base64.");
          }
        }

        const parsedConfig = JSON.parse(decodedStr) as AppConfig;
        
        if (!parsedConfig.folderId || !parsedConfig.serviceAccountKey) {
          throw new Error("Thiếu cấu phần bắt buộc (folderId hoặc serviceAccountKey) trong tệp.");
        }

        // Test credentials by performing a mini test request
        setLoading(true);
        info("Đang kiểm tra kết nối Google Drive...", "Giao tiếp tới máy chủ đám mây...");
        
        try {
          const token = await getAccessTokenFromServiceAccount(
            parsedConfig.serviceAccountKey.client_email,
            parsedConfig.serviceAccountKey.private_key
          );

          await findFileByName("", parsedConfig.folderId, "index.json", token);
          
          // Successful test! Save
          localStorage.setItem("modpack_drive_config", JSON.stringify(parsedConfig));
          localStorage.removeItem("modpack_drive_is_demo");
          setConfig(parsedConfig);
          setIsDemo(false);
          await fetchDatabaseFromDrive(parsedConfig);
        } catch (fetchErr: any) {
          throw new Error(`Khóa Service Account chưa được chia sẻ quyền xem/độc đối với Thư mục Drive này. Chi tiết: ${fetchErr.message}`);
        }

      } catch (err: any) {
        error("Nhập cấu hình thất bại", err.message || "Tệp cấu hình bị hỏng hoặc lỗi cú pháp.");
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // Load demo mode instantly
  const handleEnableDemo = () => {
    localStorage.setItem("modpack_drive_is_demo", "true");
    setIsDemo(true);
    setDb(DEMO_DATABASE);
    success("Kích hoạt Chế độ Thử nghiệm", "Đang tải dữ liệu Modpack RPG & Sky Evolution ảo để trải nghiệm.");
  };

  // Reset current config
  const handleResetConfig = () => {
    localStorage.removeItem("modpack_drive_config");
    localStorage.removeItem("modpack_drive_is_demo");
    setConfig(null);
    setDb(null);
    setIsDemo(false);
    setSelectedModpack(null);
    success("Đã đóng kết nối máy chủ", "Mời bạn kéo thả tệp .alpha mới để đăng nhập.");
  };

  const handleDownloadFile = async (modpack: Modpack, version: ModpackVersion) => {
    if (isDemo) {
      info("Đang giả lập tải xuống Modpack", `Hệ thống giả lập tải tệp "${version.fileName}" của Modpack "${modpack.name}".`);
      return;
    }

    if (!config) return;
    
    try {
      success(`Đang bắt đầu tải tệp: ${version.fileName || `${modpack.id}-${version.id}.zip`}`, "Tệp tin đang được tải trực tiếp mã hóa từ máy chủ Google Drive của bạn.");
      const token = await getAccessTokenFromServiceAccount(
        config.serviceAccountKey.client_email,
        config.serviceAccountKey.private_key
      );

      const progressKey = `${modpack.id}__${version.id}`;
      setDownloadProgress((prev) => ({ ...prev, [progressKey]: 0 }));

      await downloadDriveFileWithToken(
        version.fileId,
        token,
        version.fileName || `${modpack.id}-${version.id}.zip`,
        (percent) => {
          setDownloadProgress((prev) => ({ ...prev, [progressKey]: percent }));
        }
      );

      setDownloadProgress((prev) => ({ ...prev, [progressKey]: 100 }));
      setTimeout(() => {
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[progressKey];
          return next;
        });
      }, 1200);
    } catch (err: any) {
      error("Tải xuống thất bại", `Không thể trao đổi mã dịch vụ Google: ${err.message}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  // Generate dynamic cover gradient from pack ID
  const getGradientFromId = (id: string) => {
    const gradients = [
      "from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500",
      "from-violet-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500",
      "from-blue-600 to-amber-500 hover:from-blue-500 hover:to-amber-400",
      "from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500",
      "from-teal-600 to-violet-600 hover:from-teal-500 hover:to-violet-500",
    ];
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
      sum += id.charCodeAt(i);
    }
    return gradients[sum % gradients.length];
  };

  // Filter computation
  const activeModpacks = db?.modpacks || [];
  
  // Extract all game versions available for filtering
  const allGameVersions = ["Tất cả"];
  activeModpacks.forEach((p) => {
    p.versions.forEach((v) => {
      if (v.gameVersion && !allGameVersions.includes(v.gameVersion)) {
        allGameVersions.push(v.gameVersion);
      }
    });
  });

  // Extract all categories available
  const allCategories = ["Tất cả"];
  activeModpacks.forEach((p) => {
    if (p.category && !allCategories.includes(p.category)) {
      allCategories.push(p.category);
    }
  });

  // Perform search and filter logic
  const filteredModpacks = activeModpacks.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === "Tất cả" || 
      p.category === selectedCategory;

    const matchesVersion = 
      selectedGameVersion === "Tất cả" ||
      p.versions.some((v) => v.gameVersion === selectedGameVersion && v.isActive);

    return matchesSearch && matchesCategory && matchesVersion;
  });

  return (
    <div className="space-y-6">
      
      {/* 2.1 INCASE LOADING OR INITIAL STATE */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="relative w-12 h-12">
            <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin absolute inset-0" />
            <div className="w-12 h-12 rounded-full border border-indigo-500/20 animate-ping absolute inset-0" />
          </div>
          <p className="text-neutral-400 text-sm font-medium tracking-wide font-display">Đang đồng bộ cơ sở dữ liệu với đám mây...</p>
        </div>
      )}

      {/* BEFORE SERVER SYNC: Drag and Drop Area */}
      {!loading && !db && !config && (
        <div className="max-w-3xl mx-auto py-12 px-4 space-y-10">
          
          {/* Welcome Text */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider font-mono">
              <Sparkles className="w-3.5 h-3.5" /> Client Portal
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl font-display">
              Cổng Tải Modpack Trực Tiếp
            </h1>
            <p className="text-neutral-400 text-sm sm:text-base max-w-lg mx-auto">
              Chỉ một bước kéo thả tệp tin để kết nối máy chủ dữ liệu Google Drive từ Admin của bạn!
            </p>
          </div>

          {/* Drap & Drop Area */}
          <div
            id="file-drop-zone"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-3xl border border-dashed p-12 text-center flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 bento-glow ${
              dragActive 
                ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]" 
                : "border-bento-border bg-bento-card hover:bg-neutral-900/60 hover:border-neutral-700"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".alpha"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="w-16 h-16 rounded-2xl bg-neutral-950 flex items-center justify-center text-neutral-450 border border-neutral-800 transition-transform duration-300">
              <Upload className="w-8 h-8 text-indigo-400 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight font-display">Kéo & Thả tệp cấu hình <code>.alpha</code> vào đây</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                Tệp <strong className="text-indigo-400">.alpha</strong> chứa API Key bí mật và ID thư mục được sinh ra từ bảng điều khiển của Quản lý.
              </p>
              <p className="text-indigo-400 text-xs font-semibold underline mt-2 hover:text-indigo-300 font-display">
                Hoặc bấm vào để chọn thủ công từ máy tính
              </p>
            </div>
          </div>

          {/* Demo Fallback Area */}
          <div className="rounded-2xl bg-bento-card bento-glow-border bento-glow bento-glow-amber p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5 font-display">
                <Sparkles className="w-4 h-4 text-amber-400" /> Bạn chưa có máy chủ dữ liệu riêng?
              </h4>
              <p className="text-xs text-neutral-400 max-w-md">
                Kích hoạt chế độ Thử nghiệm để kiểm định tính năng, bộ lọc tìm kiếm và phong cách thiết kế với dữ liệu ảo ngay lập tức.
              </p>
            </div>
            
            <button
              onClick={handleEnableDemo}
              className="w-full sm:w-auto bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-neutral-950 font-bold text-xs py-2.5 px-5 rounded-xl border border-amber-500/10 hover:border-amber-500 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer font-display"
            >
              <FileCode className="w-4 h-4" /> Dùng Thử Dữ Liệu Demo
            </button>
          </div>

          {/* Guide Alert */}
          <div className="text-center">
            <p className="text-xs text-neutral-500">
              Bạn là Quản trị viên của Server game? Hãy nhấn vào mục{" "}
              <button 
                onClick={onAdminRequest} 
                className="text-indigo-400 hover:underline inline font-semibold cursor-pointer font-display"
              >
                Quản lý Modpack (Admin)
              </button>{" "}
              để tự cấu hình và xuất file <code>.alpha</code> cấp phát cho người chơi.
            </p>
          </div>

        </div>
      )}

      {/* WITH ACTIVE SERVER (User has config or demo) */}
      {!loading && db && (
        <div className="space-y-6">
          
          {/* Main Title Banner & Connection Status - Bento Cell */}
          <div className="p-4 rounded-3xl bg-bento-card bento-glow-border bento-glow flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/15 px-2.5 py-0.5 rounded-full font-mono">
                  {isDemo ? "Chế độ Thử nghiệm (Demo)" : "Đã đồng bộ Google Drive"}
                </span>
              </div>
              
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-0 font-display">
                Modpack Distributer
              </h1>
              <p className="text-xs text-neutral-400 max-w-xl">
              </p>
            </div>

            <div className="flex items-center gap-3 self-end md:self-center">
              <button
                onClick={() => isDemo ? handleEnableDemo() : fetchDatabaseFromDrive(config!)}
                className="p-3 rounded-xl bg-neutral-950 text-neutral-300 hover:text-white border border-white/5 hover:bg-neutral-900 transition-all cursor-pointer"
                title="Làm mới dữ liệu từ Google Drive"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleResetConfig}
                className="bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-600 text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-display"
              >
                <X className="w-4 h-4" /> Đóng Kết Nối
              </button>
            </div>
          </div>

          {/* SPLIT VIEW PORTAL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: LIST FILTER & CARDS (8 COLS) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Filter controls - Bento Cell */}
              <div className="p-5 rounded-2xl bg-bento-card bento-glow-border space-y-4 text-left">
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4.5 h-4.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm tên pack, mô tả hoặc từ khóa..."
                    className="w-full bg-neutral-950 border border-white/5 focus:border-indigo-500 text-sm text-neutral-200 py-3 pl-11 pr-4 rounded-xl outline-none placeholder-neutral-550 transition-all font-medium"
                    id="user-search-input"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Sub Filters row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
                  
                  {/* Category select tags / buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mr-1 font-mono">Thể loại:</span>
                    {allCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-xs py-1.5 px-3.5 rounded-full font-semibold transition-all cursor-pointer font-display ${
                          selectedCategory === cat
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                            : "bg-neutral-950 text-neutral-400 hover:bg-neutral-900 hover:text-white border border-white/5"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Game version select filter dropdown */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <label htmlFor="user-version-select" className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">Phiên bản:</label>
                    <select
                      id="user-version-select"
                      value={selectedGameVersion}
                      onChange={(e) => setSelectedGameVersion(e.target.value)}
                      className="bg-neutral-950 border border-white/5 text-xs text-neutral-300 py-1.5 px-3.5 rounded-lg outline-none hover:border-neutral-700 font-mono cursor-pointer"
                    >
                      {allGameVersions.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                </div>

              </div>

              {/* LIST CARDS */}
              {filteredModpacks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/5 bg-bento-card/30 p-12 text-center flex flex-col items-center justify-center gap-3">
                  <AlertCircle className="w-8 h-8 text-neutral-500" />
                  <p className="text-sm text-neutral-400 font-semibold font-display">Không tìm thấy Modpack nào phù hợp bộ lọc.</p>
                  <p className="text-xs text-neutral-500 max-w-xs">Hãy thử làm gọn từ khóa tìm kiếm hoặc chỉnh lại bộ lọc thể loại/phiên bản.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredModpacks.map((p) => {
                      const activeVersCount = p.versions.filter(v => v.isActive).length;
                      const hasActive = activeVersCount > 0;
                      const latestVersion = p.versions.find(v => v.isActive);

                      return (
                        <motion.div
                           key={p.id}
                           layout
                           initial={{ opacity: 0, y: 15 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.95 }}
                           onClick={() => setSelectedModpack(p)}
                           className={`group rounded-2xl p-5 text-left flex flex-col justify-between gap-5 cursor-pointer transition-all duration-300 ${
                             selectedModpack?.id === p.id 
                               ? "bg-indigo-950/15 border-indigo-500 ring-1 ring-indigo-500/20 shadow-xl bento-glow" 
                               : "bg-bento-card border-bento-border hover:border-neutral-700 hover:scale-[1.015]"
                           }`}
                           id={`modpack-card-${p.id}`}
                        >
                          <div className="space-y-3.5">
                            
                            {/* Graphic Header / Banner */}
                            <div className={`relative h-28 w-full rounded-xl bg-gradient-to-br ${getGradientFromId(p.id)} flex items-center justify-center p-4 overflow-hidden border border-white/5`}>
                              <div className="absolute inset-0 bg-black/20 mix-blend-overlay" />
                              <div className="absolute top-2 right-2 bg-neutral-950/90 backdrop-blur border border-white/10 px-2.5 py-0.5 rounded-md text-[9px] font-bold text-white uppercase tracking-wider font-mono">
                                {p.category || "General"}
                              </div>
                              <h3 className="text-lg font-black text-white text-center drop-shadow-md tracking-tight w-full truncate font-display">
                                {p.name}
                              </h3>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed h-10">
                              {p.description || "Chưa có mô tả tóm tắt cho modpack này."}
                            </p>
                          </div>

                          {/* Footer details card */}
                          <div className="flex items-center justify-between pt-3.5 border-t border-white/5">
                            <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
                              <Layers className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{activeVersCount} phiên bản</span>
                            </div>

                            <button 
                              className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all font-display ${
                                selectedModpack?.id === p.id 
                                  ? "bg-indigo-600 text-white shadow-md" 
                                  : "bg-neutral-950 text-neutral-300 group-hover:bg-neutral-900 border border-white/5"
                              }`}
                            >
                              <span>Chi tiết</span> <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: EXPANDED MODPACK DETAILS VIEW (4 COLS) - Bento Cell */}
            <div className="lg:col-span-4 lg:sticky lg:top-6 text-left">
              <AnimatePresence mode="wait">
                {selectedModpack ? (
                  <motion.div
                    key={selectedModpack.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                    className="p-5 rounded-3xl bg-bento-card bento-glow-border bento-glow space-y-6"
                  >
                    
                    {/* Header Details */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 px-3 py-0.5 rounded-full uppercase tracking-wider font-mono">
                          {selectedModpack.category || "Minecraft"}
                        </span>
                        
                        <button
                          onClick={() => setSelectedModpack(null)}
                          className="text-neutral-400 hover:text-neutral-200 transition-colors p-1.5 rounded-lg hover:bg-neutral-950 border border-transparent hover:border-white/5 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <h2 className="text-xl font-black text-white tracking-tight font-display">{selectedModpack.name}</h2>
                      
                      <div className="p-4 rounded-xl bg-neutral-950 border border-white/5 text-xs text-neutral-400 leading-relaxed">
                        {selectedModpack.description || " Chưa có mô tả cho modpack này."}
                      </div>
                    </div>

                    {/* Versions list */}
                    <div className="space-y-3.5">
                      <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5 font-display">
                        <Layers3 className="w-4 h-4 text-indigo-500" /> Tải về máy (.zip)
                      </h3>

                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {selectedModpack.versions.filter(v => v.isActive).length === 0 ? (
                          <p className="text-xs text-neutral-500 text-center py-4">Chưa có phiên bản khả dụng công khai cho pack này.</p>
                        ) : (
                          selectedModpack.versions
                            .filter((v) => v.isActive)
                            .map((v) => (
                              <div 
                                key={v.id}
                                className="group p-3 rounded-xl bg-neutral-950 border border-white/5 hover:border-neutral-850 transition-all space-y-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-black text-white">{v.id}</span>
                                      <span className="text-[10px] bg-neutral-900 border border-white/5 px-2 py-0.5 rounded text-neutral-400 font-mono">
                                        MC {v.gameVersion}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-neutral-500 truncate mt-1 max-w-[150px] font-mono">
                                      {v.fileName}
                                    </p>
                                  </div>

                                  <div className="text-right flex-shrink-0">
                                    <span className="text-xs text-neutral-400 font-mono">
                                      {formatSize(v.size)}
                                    </span>
                                  </div>
                                </div>

                                {/* Compact changelog */}
                                {v.changelog && (
                                  <div className="p-3 bg-neutral-900 border border-white/5 rounded-lg text-[10px] text-neutral-400 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto text-left leading-relaxed">
                                    {v.changelog}
                                  </div>
                                )}

                                {/* Download Action */}
                                {(() => {
                                  const progressKey = `${selectedModpack.id}__${v.id}`;
                                  const progress = downloadProgress[progressKey];
                                  const isDownloading = progress !== undefined;

                                  return (
                                    <div className="space-y-2">
                                      <button
                                        onClick={() => handleDownloadFile(selectedModpack, v)}
                                        disabled={isDownloading}
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700/60 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-650/10 cursor-pointer font-display"
                                      >
                                        <Download className="w-3.5 h-3.5" /> {isDownloading ? `Đang tải ${progress}%` : "Tải bản này"}
                                      </button>

                                      {isDownloading && (
                                        <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden border border-white/5">
                                          <div
                                            className="h-full bg-indigo-500 transition-all duration-200"
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ))
                        )}
                      </div>
                    </div>

                    {/* Meta info dates */}
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 border-t border-white/5 pt-3.5 font-mono">
                      <span>Cập nhật ngày:</span>
                      <span className="font-medium text-neutral-400">{formatDate(selectedModpack.updatedAt)}</span>
                    </div>

                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-selection"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6 rounded-3xl border border-dashed border-white/5 bg-bento-card/30 text-center py-24 flex flex-col items-center justify-center gap-4 text-neutral-550 text-xs"
                  >
                    <div className="w-10 h-10 rounded-xl border border-white/5 flex items-center justify-center text-neutral-500 bg-neutral-950">
                      <Layers className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="font-bold text-neutral-400 uppercase tracking-wider font-display text-[11px]">Chi Tiết Modpack</p>
                      <p className="text-neutral-500 max-w-[200px] mx-auto leading-relaxed">Chọn một modpack bất kỳ ở cột bên trái để hiển thị chi tiết, lịch sử cập nhật và tải trực tiếp.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
