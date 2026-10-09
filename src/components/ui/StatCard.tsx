import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'accent' | 'gray';
  trend?: { value: string; positive: boolean };
}

const colorMap = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-600', icon: 'text-primary-600', iconBg: 'bg-primary-100' },
  success: { bg: 'bg-success-50', text: 'text-success-600', icon: 'text-success-600', iconBg: 'bg-success-100' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-600', icon: 'text-warning-600', iconBg: 'bg-warning-100' },
  error: { bg: 'bg-error-50', text: 'text-error-600', icon: 'text-error-600', iconBg: 'bg-error-100' },
  accent: { bg: 'bg-accent-50', text: 'text-accent-600', icon: 'text-accent-600', iconBg: 'bg-accent-100' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-700', icon: 'text-gray-500', iconBg: 'bg-gray-100' },
};

export function StatCard({ title, value, subtitle, icon: Icon, color = 'gray', trend }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`mt-1.5 text-2xl font-bold ${c.text}`}>{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
          {trend && (
            <p className={`mt-1.5 text-xs font-semibold ${trend.positive ? 'text-success-600' : 'text-error-600'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.iconBg}`}>
            <Icon className={`h-5.5 w-5.5 ${c.icon}`} />
          </div>
        )}
      </div>
    </div>
  );
}
