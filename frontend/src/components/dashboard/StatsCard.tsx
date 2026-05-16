import React from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'indigo' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  subtitle?: string;
}

const colorMap = {
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'bg-indigo-600 text-white',
    text: 'text-indigo-600',
    border: 'border-indigo-100',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-600 text-white',
    text: 'text-blue-600',
    border: 'border-blue-100',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-600 text-white',
    text: 'text-green-600',
    border: 'border-green-100',
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'bg-yellow-500 text-white',
    text: 'text-yellow-600',
    border: 'border-yellow-100',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-600 text-white',
    text: 'text-red-600',
    border: 'border-red-100',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-600 text-white',
    text: 'text-purple-600',
    border: 'border-purple-100',
  },
};

export function StatsCard({ title, value, icon, color, subtitle }: StatsCardProps) {
  const c = colorMap[color];

  return (
    <div className={cn('bg-white rounded-xl border shadow-sm p-6 flex items-center gap-5', c.border)}>
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', c.icon)}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
