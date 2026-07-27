import { useNavigate } from 'react-router-dom';
import { User, Eye, Bell, Monitor, Shield, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';

const SECTIONS = [
  {
    key: 'account',
    label: 'Account',
    desc: 'Profile, connected accounts, and account actions',
    icon: User,
    path: '/settings/account',
  },
  {
    key: 'privacy',
    label: 'Privacy',
    desc: 'Who can see your activity and interact with you',
    icon: Eye,
    path: '/settings/privacy',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    desc: 'Push, email, and in-app alerts',
    icon: Bell,
    path: '/settings/notifications',
  },
  {
    key: 'display',
    label: 'Display',
    desc: 'Theme, layout, and language',
    icon: Monitor,
    path: '/settings/display',
  },
  {
    key: 'security',
    label: 'Security',
    desc: 'Password, sessions, and login protection',
    icon: Shield,
    path: '/settings/security',
  },
] as const;

export function SettingsHub() {
  const navigate = useNavigate();

  return (
    <div className="divide-y divide-[#1f1f1f]">
      <p className="px-4 py-3 text-xs text-[#71767b] leading-relaxed">
        Manage your Arena preferences. Account, privacy, notifications, display, and security settings require server sync when the backend is connected.
      </p>
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <button
            key={section.key}
            type="button"
            onClick={() => navigate(section.path)}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors text-left min-h-touch"
          >
            <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-[#ef4444]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{section.label}</p>
              <p className="text-xs text-[#71767b] mt-0.5 line-clamp-2">{section.desc}</p>
            </div>
            <ChevronRight className={cn('w-4 h-4 text-[#71767b] shrink-0')} />
          </button>
        );
      })}
    </div>
  );
}
