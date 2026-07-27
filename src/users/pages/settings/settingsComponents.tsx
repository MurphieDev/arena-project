import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';

// ── Toast & confirm context ───────────────────────────────────────────────────

interface ConfirmState {
  title: string;
  desc: string;
  onConfirm: () => void;
}

interface SettingsContextValue {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  showConfirm: (dialog: ConfirmState) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; type?: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const showConfirm = useCallback((dialog: ConfirmState) => {
    setConfirmDialog(dialog);
  }, []);

  return (
    <SettingsContext.Provider value={{ showToast, showConfirm }}>
      {children}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          className={cn(
            'fixed left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold text-white flex items-center gap-2 max-w-[90vw] bottom-[calc(var(--bottom-nav-height)+1.5rem+env(safe-area-inset-bottom))] md:bottom-8',
            toast.type === 'error' ? 'bg-[#ef4444]' : 'bg-[#16a34a]'
          )}
        >
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </motion.div>
      )}
      {confirmDialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setConfirmDialog(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-[#0f0f11] border border-[#2a2a30] rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-white">{confirmDialog.title}</h3>
            <p className="text-sm text-[#71767b] leading-relaxed">{confirmDialog.desc}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 border border-[#1f1f1f] rounded-full text-sm font-bold text-[#71767b] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="flex-1 py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white hover:bg-[#dc2626] transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsContext.Provider>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn('w-11 h-6 rounded-full transition-all relative shrink-0', value ? 'bg-[#ef4444]' : 'bg-[#71767b]/40')}
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
      />
    </button>
  );
}

export function SettingRow({
  label,
  desc,
  toggle,
  value,
  onChange,
  onClick,
  danger,
  to,
}: {
  label: string;
  desc?: string;
  toggle?: boolean;
  value?: boolean;
  onChange?: (v: boolean) => void;
  onClick?: () => void;
  danger?: boolean;
  to?: string;
}) {
  const handleClick = onClick;
  const isNav = Boolean(handleClick || to);

  const inner = (
    <>
      <div className="flex-1 min-w-0 mr-4">
        <p className={cn('text-sm font-semibold', danger ? 'text-[#ef4444]' : 'text-white')}>{label}</p>
        {desc && <p className="text-xs text-[#71767b] mt-0.5">{desc}</p>}
      </div>
      {toggle && value !== undefined && onChange ? (
        <Toggle value={value} onChange={onChange} />
      ) : isNav ? (
        <ChevronRight className={cn('w-4 h-4 shrink-0', danger ? 'text-[#ef4444]' : 'text-[#71767b]')} />
      ) : null}
    </>
  );

  if (to) {
    return (
      <a
        href={to}
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] transition-colors',
          'cursor-pointer hover:bg-white/[0.02]',
          danger && 'hover:bg-[#ef4444]/5'
        )}
      >
        {inner}
      </a>
    );
  }

  return (
    <div
      role={handleClick ? 'button' : undefined}
      tabIndex={handleClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleClick ? (e) => e.key === 'Enter' && handleClick() : undefined}
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] transition-colors',
        handleClick && 'cursor-pointer hover:bg-white/[0.02]',
        danger && 'hover:bg-[#ef4444]/5'
      )}
    >
      {inner}
    </div>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 py-2 bg-[#111]">
      <p className="text-xs font-black text-[#71767b] uppercase tracking-wider">{title}</p>
    </div>
  );
}

export function SettingsNote({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-3 text-xs text-[#71767b] leading-relaxed border-b border-[#1f1f1f]">
      {children}
    </p>
  );
}

export const BACKEND_NOTE = 'Changes on this page will sync once account settings are connected to the server.';
