/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { ToastProvider, useToast } from "./components/ToastContext";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import GCloudGuide from "./components/GCloudGuide";
import { Gamepad2, Settings2, HelpCircle, HardDrive, ShieldAlert, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function AppContent() {
  const [activeTab, setActiveTab] = useState<"user" | "admin">("user");
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="min-h-screen bg-bento-bg text-neutral-200 font-sans selection:bg-indigo-600/30 selection:text-white overflow-x-hidden">
      
      {/* Decorative ambient light gradients in the background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main client shell header - Floating Bento Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-bento-card/60 backdrop-blur-md bento-glow-border rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bento-glow">
          
          {/* Brand/Logo Assembly */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 bento-glow-border">
              <Gamepad2 className="w-5.5 h-5.5" />
            </div>
            <div className="text-left">
              <span className="text-sm font-black text-white tracking-tight uppercase block font-display">
                ALPHA PACK MANAGER
              </span>
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest block -mt-0.5 font-mono">
                Portal v2.6.5
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5 bg-neutral-950/80 bento-glow-border p-1 rounded-xl">
            
            <button
              onClick={() => setActiveTab("user")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-display ${
                activeTab === "user"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/30"
                  : "text-neutral-450 hover:text-neutral-200"
              }`}
              id="tab-btn-user"
            >
              <Gamepad2 className="w-4 h-4" /> Người Chơi (User)
            </button>

            <button
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-display ${
                activeTab === "admin"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/30"
                  : "text-neutral-450 hover:text-neutral-200"
              }`}
              id="tab-btn-admin"
            >
              <Settings2 className="w-4 h-4" /> Quản Lý (Admin)
            </button>
            
          </div>

          {/* Extra utility guides */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGuide(true)}
              className="text-xs text-neutral-400 hover:text-indigo-400 transition-colors font-semibold flex items-center gap-1 cursor-pointer font-display"
            >
              <HelpCircle className="w-4 h-4 text-indigo-500" />Guide
            </button>
          </div>

        </div>
      </header>

      {/* Main Dynamic Viewport Component */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15, transition: { duration: 0.15 } }}
          >
            {activeTab === "user" ? (
              <UserDashboard onAdminRequest={() => setActiveTab("admin")} />
            ) : (
              <AdminDashboard onShowGuide={() => setShowGuide(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Embedded footer */}
      <footer className="relative z-10 border-t border-neutral-900 bg-neutral-950/40 py-2 mt-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 text-[9px] text-neutral-650 leading-none">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" /> Alpha Survival
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> 100% Thuần virus
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Vô hạn luân hồi
            </span>
          </div>
        </div>
      </footer>

      {/* Google Cloud Step Guide modal */}
      <AnimatePresence>
        {showGuide && (
          <GCloudGuide onClose={() => setShowGuide(false)} />
        )}
      </AnimatePresence>

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
