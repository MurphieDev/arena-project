// ── Shared Dashboard Components ────────────────────────────────────────────────

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  children,
  className = '',
  action,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-[#12121A] rounded-2xl border border-[#1f1f1f] p-4 sm:p-5 h-full flex flex-col',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
        <h3 className="text-sm sm:text-base font-bold text-white">{title}</h3>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </motion.div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  prefix?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  prefix,
  change,
  changeType = 'neutral',
  icon,
}) => {
  const changeColor = {
    positive: 'text-green-400 bg-green-500/10 border-green-500/20',
    negative: 'text-red-400 bg-red-500/10 border-red-500/20',
    neutral: 'text-[#71767b] bg-white/5 border-[#1f1f1f]',
  }[changeType];

  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
  const isCompactValue = `${prefix ?? ''}${displayValue}`.length > 7;

  return (
    <div className="bg-[#12121A] rounded-2xl border border-[#1f1f1f] p-4 sm:p-5 flex flex-col h-full min-h-[9.5rem]">
      <div className="flex items-start justify-between gap-2 mb-3 min-h-[2.25rem]">
        <p className="text-xs sm:text-sm text-[#71767b] font-semibold leading-tight">{label}</p>
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-[#ef4444]/10 flex items-center justify-center shrink-0 text-[#ef4444]">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-0.5 min-w-0 mb-3">
        {prefix && (
          <span className="text-sm sm:text-base font-bold text-[#71767b] shrink-0 leading-none">{prefix}</span>
        )}
        <span
          className={cn(
            'font-black text-white tabular-nums tracking-tight leading-none truncate',
            isCompactValue ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
          )}
        >
          {displayValue}
        </span>
      </div>

      <div className="mt-auto min-h-[1.5rem]">
        {change ? (
          <span
            className={cn(
              'inline-flex text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap max-w-full truncate',
              changeColor
            )}
          >
            {change}
          </span>
        ) : (
          <span className="inline-block h-[1.375rem]" aria-hidden="true" />
        )}
      </div>
    </div>
  );
};

interface ActivityFeedProps {
  activities: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
}

const activityDot: Record<string, string> = {
  prediction: 'bg-[#ef4444]',
  follower: 'bg-blue-400',
  revenue: 'bg-green-400',
  subscriber: 'bg-purple-400',
  default: 'bg-[#71767b]',
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3">
          <div
            className={cn(
              'w-2 h-2 rounded-full mt-2 shrink-0',
              activityDot[activity.type] ?? activityDot.default
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#e7e9ea] leading-relaxed">{activity.message}</p>
            <p className="text-xs text-[#71767b] mt-1">{activity.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

interface QuickActionProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'success' | 'accent' | 'muted';
  icon?: React.ReactNode;
}

export const QuickActionButton: React.FC<QuickActionProps> = ({
  label,
  onClick,
  variant = 'primary',
  icon,
}) => {
  const styles = {
    primary: 'bg-[#ef4444] hover:bg-[#dc2626] text-white border-transparent',
    success: 'bg-green-600/90 hover:bg-green-600 text-white border-transparent',
    accent: 'bg-purple-600/90 hover:bg-purple-600 text-white border-transparent',
    muted: 'bg-[#1f1f1f] hover:bg-[#2a2a30] text-white border-[#2a2a30]',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-colors border min-h-touch',
        styles
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};
