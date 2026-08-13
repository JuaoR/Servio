import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isDestructive = true
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5 text-left"
          >
            <div className={`flex items-center gap-3 border-b border-[var(--border-color)] pb-4 ${isDestructive ? 'text-red-500' : 'text-sky-500'}`}>
              <AlertTriangle size={24} className="shrink-0" />
              <h3 className="text-base font-bold text-[var(--text-main)]">
                {title}
              </h3>
            </div>
            
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              {message}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 px-4 bg-[var(--bg-base)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] font-bold text-sm rounded-xl border border-[var(--border-color)] transition-colors cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2.5 px-4 text-white font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer ${
                  isDestructive 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                    : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
