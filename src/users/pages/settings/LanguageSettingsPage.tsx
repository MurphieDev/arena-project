import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useSettings } from './settingsComponents';

const LANGUAGE_KEY = 'arena-language';

const LANGUAGES = [
  { code: 'en-GB', label: 'English (UK)', native: 'English' },
  { code: 'en-US', label: 'English (US)', native: 'English' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'yo', label: 'Yoruba', native: 'Yorùbá' },
  { code: 'ig', label: 'Igbo', native: 'Igbo' },
  { code: 'ha', label: 'Hausa', native: 'Hausa' },
];

export function LanguageSettingsPage() {
  const { showToast } = useSettings();
  const [selected, setSelected] = useState('en-GB');

  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved) setSelected(saved);
  }, []);

  const select = (code: string, label: string) => {
    setSelected(code);
    localStorage.setItem(LANGUAGE_KEY, code);
    document.documentElement.lang = code.split('-')[0];
    showToast(`Language set to ${label}`);
  };

  return (
    <div>
      <p className="px-4 py-3 text-xs text-[#71767b] leading-relaxed border-b border-[#1f1f1f]">
        Choose your preferred language. Saved on this device — full translations roll out progressively.
      </p>

      <div className="divide-y divide-[#1f1f1f]">
        {LANGUAGES.map((lang) => {
          const active = selected === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => select(lang.code, lang.label)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/[0.02] transition-colors text-left min-h-touch"
            >
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-bold', active ? 'text-[#ef4444]' : 'text-white')}>
                  {lang.native}
                </p>
                <p className="text-xs text-[#71767b]">{lang.label}</p>
              </div>
              {active && <Check className="w-5 h-5 text-[#ef4444] shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
