import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  SectionHeader,
  SettingRow,
  useSettings,
} from './settingsComponents';

const DISPLAY_KEY = 'arena-display-settings';

interface DisplayPrefs {
  darkMode: boolean;
  compactMode: boolean;
  autoplayVideos: boolean;
  reduceMotion: boolean;
}

function loadDisplayPrefs(): DisplayPrefs {
  try {
    const raw = localStorage.getItem(DISPLAY_KEY);
    if (raw) return JSON.parse(raw) as DisplayPrefs;
  } catch {
    /* ignore */
  }
  return { darkMode: true, compactMode: false, autoplayVideos: true, reduceMotion: false };
}

function saveDisplayPrefs(prefs: DisplayPrefs) {
  localStorage.setItem(DISPLAY_KEY, JSON.stringify(prefs));
}

export function DisplaySettings() {
  const navigate = useNavigate();
  const { showToast } = useSettings();
  const [prefs, setPrefs] = useState<DisplayPrefs>(loadDisplayPrefs);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', prefs.reduceMotion);
    document.documentElement.classList.toggle('compact-mode', prefs.compactMode);
  }, [prefs.reduceMotion, prefs.compactMode]);

  const update = (patch: Partial<DisplayPrefs>, label: string) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveDisplayPrefs(next);
    showToast(`${label} saved`);
  };

  return (
    <div>
      <p className="px-4 py-3 text-xs text-[#71767b] leading-relaxed border-b border-[#1f1f1f]">
        Display preferences are saved on this device and work without a server connection.
      </p>

      <SectionHeader title="Theme" />
      <div className="px-4 py-3 border-b border-[#1f1f1f]">
        <div className="grid grid-cols-2 gap-3">
          {[
            { mode: true, icon: Moon, label: 'Dark' },
            { mode: false, icon: Sun, label: 'Light' },
          ].map((t) => {
            const Icon = t.icon;
            const active = prefs.darkMode === t.mode;
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => update({ darkMode: t.mode }, `${t.label} theme`)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all min-h-touch',
                  active ? 'bg-[#ef4444]/10 border-[#ef4444]/30' : 'bg-[#111] border-[#1f1f1f] hover:border-white/10'
                )}
              >
                <Icon className={cn('w-6 h-6', active ? 'text-[#ef4444]' : 'text-[#71767b]')} />
                <span className={cn('text-xs font-bold', active ? 'text-[#ef4444]' : 'text-[#71767b]')}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
        {!prefs.darkMode && (
          <p className="text-[10px] text-[#71767b] mt-2">Light theme applies when the full theme system is enabled.</p>
        )}
      </div>

      <SectionHeader title="Layout" />
      <SettingRow
        label="Compact Mode"
        desc="Show more content with smaller spacing"
        toggle
        value={prefs.compactMode}
        onChange={(v) => update({ compactMode: v }, 'Compact mode')}
      />
      <SettingRow
        label="Autoplay Videos"
        desc="Videos play automatically in feed"
        toggle
        value={prefs.autoplayVideos}
        onChange={(v) => update({ autoplayVideos: v }, 'Autoplay videos')}
      />
      <SettingRow
        label="Reduce Motion"
        desc="Minimize animations throughout the app"
        toggle
        value={prefs.reduceMotion}
        onChange={(v) => update({ reduceMotion: v }, 'Reduce motion')}
      />

      <SectionHeader title="Language" />
      <SettingRow
        label="App Language"
        desc="English (UK)"
        onClick={() => navigate('/settings/display/language')}
      />
    </div>
  );
}
