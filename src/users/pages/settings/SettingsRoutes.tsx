import { Routes, Route, Navigate } from 'react-router-dom';
import type { UserRole } from '../../../core/types';
import { SettingsLayout } from './SettingsLayout';
import { SettingsHub } from './SettingsHub';
import { AccountSettings } from './AccountSettings';
import { PrivacySettings } from './PrivacySettings';
import { NotificationsSettings } from './NotificationsSettings';
import { DisplaySettings } from './DisplaySettings';
import { SecuritySettings } from './SecuritySettings';
import { BlockedAccountsPage } from './BlockedAccountsPage';
import { MutedAccountsPage } from './MutedAccountsPage';
import { ConnectedAccountsPage } from './ConnectedAccountsPage';
import { PayoutAccountPage } from './PayoutAccountPage';
import { ChannelSettingsPage } from './ChannelSettingsPage';
import { ChannelMembersPage } from './ChannelMembersPage';
import { ChannelMemberProfilePage } from './ChannelMemberProfilePage';
import { SubscriptionPricingPage } from './SubscriptionPricingPage';
import { DownloadDataPage } from './DownloadDataPage';
import { LanguageSettingsPage } from './LanguageSettingsPage';
import { ActiveSessionsPage } from './ActiveSessionsPage';

interface SettingsRoutesProps {
  userRole: UserRole;
}

export function SettingsRoutes({ userRole }: SettingsRoutesProps) {
  const isTipster = userRole === 'tipster';

  return (
    <Routes>
      <Route element={<SettingsLayout />}>
        <Route index element={<SettingsHub />} />
        <Route path="account" element={<AccountSettings userRole={userRole} />} />
        <Route path="account/connected" element={<ConnectedAccountsPage />} />
        <Route path="account/download-data" element={<DownloadDataPage />} />
        {isTipster && (
          <>
            <Route path="account/payout" element={<PayoutAccountPage />} />
            <Route path="account/channels" element={<ChannelSettingsPage />} />
            <Route path="account/channels/:channelId/members" element={<ChannelMembersPage />} />
            <Route path="account/channels/:channelId/members/:memberId" element={<ChannelMemberProfilePage />} />
            <Route path="account/pricing" element={<SubscriptionPricingPage />} />
          </>
        )}
        <Route path="privacy" element={<PrivacySettings />} />
        <Route path="privacy/blocked" element={<BlockedAccountsPage />} />
        <Route path="privacy/muted" element={<MutedAccountsPage />} />
        <Route path="notifications" element={<NotificationsSettings />} />
        <Route path="display" element={<DisplaySettings />} />
        <Route path="display/language" element={<LanguageSettingsPage />} />
        <Route path="security" element={<SecuritySettings />} />
        <Route path="security/sessions" element={<ActiveSessionsPage />} />
        <Route path="*" element={<Navigate to="/settings" replace />} />
      </Route>
    </Routes>
  );
}
