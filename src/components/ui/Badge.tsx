import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className = 'bg-gray-100 text-gray-700' }: BadgeProps) {
  return <span className={`badge ${className}`}>{children}</span>;
}
