import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SettingsProvider } from './settingsComponents';

const PAGE_TITLES: Record<string, string> = {
  '/settings': 'Settings',
  '/settings/account': 'Account',
  '/settings/account/connected': 'Connected Accounts',
  '/settings/account/payout': 'Payout Account',
  '/settings/account/channels': 'Channel Settings',
  '/settings/account/pricing': 'Subscription Pricing',
  '/settings/account/download-data': 'Download My Data',
  '/settings/privacy': 'Privacy',
  '/settings/privacy/blocked': 'Blocked Accounts',
  '/settings/privacy/muted': 'Muted Accounts',
  '/settings/notifications': 'Notifications',
  '/settings/display': 'Display',
  '/settings/display/language': 'App Language',
  '/settings/security': 'Security',
  '/settings/security/sessions': 'Active Sessions',
};

export function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHub = location.pathname === '/settings' || location.pathname === '/settings/';
  const isMembersPage = /\/settings\/account\/channels\/[^/]+\/members$/.test(location.pathname);
  const isMemberProfile = /\/settings\/account\/channels\/[^/]+\/members\/[^/]+$/.test(location.pathname);
  const title = isMemberProfile
    ? 'Member Profile'
    : isMembersPage
      ? 'Channel Members'
      : PAGE_TITLES[location.pathname] ?? 'Settings';

  return (
    <SettingsProvider>
      <div className="min-h-full">
        <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
          <div className="px-4 py-3 flex items-center gap-3">
            {!isHub ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white min-h-touch min-w-touch flex items-center justify-center shrink-0"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9 shrink-0" />
            )}
            <h1 className="text-lg font-black text-white flex-1 text-center">{title}</h1>
            {isHub ? (
              <div className="w-9 shrink-0" />
            ) : (
              <Link
                to="/settings"
                className="text-xs font-bold text-[#ef4444] shrink-0 hover:underline"
              >
                All
              </Link>
            )}
          </div>
        </div>
        <Outlet />
      </div>
    </SettingsProvider>
  );
}
