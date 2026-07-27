import type { UserRole } from '../../core/types';
import { SettingsRoutes } from './settings/SettingsRoutes';

interface SettingsPageProps {
  userRole: UserRole;
}

export function SettingsPage({ userRole }: SettingsPageProps) {
  return <SettingsRoutes userRole={userRole} />;
}
