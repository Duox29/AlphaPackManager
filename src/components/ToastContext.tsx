/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string, description?: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string, description?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, description }]);
      
      // Auto close after 3.5 seconds
      setTimeout(() => {
        remove(id);
      }, 3500);
    },
    [remove]
  );

  const success = useCallback((msg: string, desc?: string) => toast("success", msg, desc), [toast]);
  const error = useCallback((msg: string, desc?: string) => toast("error", msg, desc), [toast]);
  const warning = useCallback((msg: string, desc?: string) => toast("warning", msg, desc), [toast]);
  const info = useCallback((msg: string, desc?: string) => toast("info", msg, desc), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, remove }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            let icon = <Info className="w-5 h-5 text-blue-400" />;
            let bgClass = "bg-neutral-900/95 border-blue-500/30 text-white";
            let accentClass = "bg-blue-500";

            if (t.type === "success") {
              icon = <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
              bgClass = "bg-neutral-900/95 border-emerald-500/30 text-white";
              accentClass = "bg-emerald-500";
            } else if (t.type === "error") {
              icon = <AlertCircle className="w-5 h-5 text-rose-400" />;
              bgClass = "bg-neutral-900/95 border-rose-500/30 text-white";
              accentClass = "bg-rose-500";
            } else if (t.type === "warning") {
              icon = <AlertTriangle className="w-5 h-5 text-amber-400" />;
              bgClass = "bg-neutral-900/95 border-amber-500/30 text-white";
              accentClass = "bg-amber-500";
            }

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, x: 50, transition: { duration: 0.15 } }}
                className={`relative overflow-hidden pointer-events-auto rounded-lg border p-4 shadow-xl flex items-start gap-3 ${bgClass} backdrop-blur-md`}
              >
                {/* Visual accent bar */}
                <div className={`absolute top-0 bottom-0 left-0 w-1 ${accentClass}`} />
                
                <div className="flex-shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="font-semibold text-sm tracking-tight">{t.message}</h4>
                  {t.description && (
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="flex-shrink-0 text-neutral-400 hover:text-neutral-200 transition-colors p-1 rounded hover:bg-neutral-800"
                  aria-label="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast phải được bọc trong ToastProvider");
  }
  return context;
}
