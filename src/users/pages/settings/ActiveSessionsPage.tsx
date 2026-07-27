import { useState } from 'react';
import { Smartphone, Monitor, Tablet } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useSettings } from './settingsComponents';

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
  icon: 'phone' | 'desktop' | 'tablet';
}

const INITIAL_SESSIONS: Session[] = [
  {
    id: '1',
    device: 'Chrome on Android',
    location: 'Lagos, Nigeria',
    lastActive: 'Active now',
    current: true,
    icon: 'phone',
  },
  {
    id: '2',
    device: 'Safari on iPhone',
    location: 'Abuja, Nigeria',
    lastActive: '2 days ago',
    current: false,
    icon: 'phone',
  },
  {
    id: '3',
    device: 'Chrome on Windows',
    location: 'Lagos, Nigeria',
    lastActive: '1 week ago',
    current: false,
    icon: 'desktop',
  },
  {
    id: '4',
    device: 'Arena on iPad',
    location: 'Port Harcourt, Nigeria',
    lastActive: '3 weeks ago',
    current: false,
    icon: 'tablet',
  },
];

function DeviceIcon({ type }: { type: Session['icon'] }) {
  const className = 'w-5 h-5 text-[#71767b]';
  if (type === 'desktop') return <Monitor className={className} />;
  if (type === 'tablet') return <Tablet className={className} />;
  return <Smartphone className={className} />;
}

export function ActiveSessionsPage() {
  const { showToast, showConfirm } = useSettings();
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);

  const revoke = (id: string, device: string) => {
    showConfirm({
      title: 'Sign out this device?',
      desc: `${device} will be signed out and need to log in again.`,
      onConfirm: () => {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        showToast(`Signed out from ${device}`);
      },
    });
  };

  return (
    <div>
      <p className="px-4 py-3 text-xs text-[#71767b] leading-relaxed border-b border-[#1f1f1f]">
        These devices are currently signed in to your Arena account. Sign out any session you do not recognize.
      </p>

      <div className="divide-y divide-[#1f1f1f]">
        {sessions.map((session) => (
          <div key={session.id} className="px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#111] border border-[#1f1f1f] flex items-center justify-center shrink-0">
                <DeviceIcon type={session.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-white">{session.device}</p>
                  {session.current && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">
                      This device
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#71767b] mt-0.5">{session.location}</p>
                <p className="text-xs text-[#71767b]">{session.lastActive}</p>
              </div>
              {!session.current && (
                <button
                  type="button"
                  onClick={() => revoke(session.id, session.device)}
                  className={cn(
                    'px-3 py-1.5 rounded-full border border-[#ef4444]/40 text-xs font-bold text-[#ef4444]',
                    'hover:bg-[#ef4444]/10 transition-colors shrink-0'
                  )}
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {sessions.length <= 1 && (
        <p className="px-4 py-6 text-xs text-[#71767b] text-center">Only this device is signed in.</p>
      )}
    </div>
  );
}
