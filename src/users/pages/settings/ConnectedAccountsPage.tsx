import { useState } from 'react';
import { cn } from '../../../lib/utils';
import { useSettings } from './settingsComponents';

interface Provider {
  id: string;
  name: string;
  email?: string;
  connected: boolean;
  icon: string;
}

const INITIAL_PROVIDERS: Provider[] = [
  { id: 'google', name: 'Google', email: 'sportxfan@gmail.com', connected: true, icon: 'G' },
  { id: 'apple', name: 'Apple', connected: false, icon: '' },
];

export function ConnectedAccountsPage() {
  const { showToast } = useSettings();
  const [providers, setProviders] = useState(INITIAL_PROVIDERS);

  const toggle = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.connected) {
          showToast(`${p.name} account disconnected`);
          return { ...p, connected: false, email: undefined };
        }
        showToast(`${p.name} connected successfully`);
        return {
          ...p,
          connected: true,
          email: id === 'google' ? 'sportxfan@gmail.com' : 'user@icloud.com',
        };
      })
    );
  };

  return (
    <div>
      <p className="px-4 py-3 text-xs text-[#71767b] leading-relaxed border-b border-[#1f1f1f]">
        Link social accounts for faster sign-in. Disconnecting removes that login method from your account.
      </p>

      <div className="divide-y divide-[#1f1f1f]">
        {providers.map((provider) => (
          <div key={provider.id} className="flex items-center gap-3 px-4 py-4">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0',
                provider.id === 'google' ? 'bg-white text-black' : 'bg-black text-white border border-[#1f1f1f]'
              )}
            >
              {provider.icon || ''}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{provider.name}</p>
              <p className="text-xs text-[#71767b] truncate">
                {provider.connected ? provider.email : 'Not connected'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle(provider.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0',
                provider.connected
                  ? 'border border-[#ef4444]/40 text-[#ef4444] hover:bg-[#ef4444]/10'
                  : 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
              )}
            >
              {provider.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
