import { Building2, User, Briefcase, Home } from 'lucide-react';

export type UserType = 'particulier' | 'proprietaire' | 'demarcheur' | 'agence' | null;

interface UserTypeBadgeProps {
  userType: UserType;
  agencyName?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const userTypeConfig: Record<NonNullable<UserType>, { 
  label: string; 
  icon: typeof User; 
  colors: string;
}> = {
  particulier: {
    label: 'Particulier',
    icon: User,
    colors: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  },
  proprietaire: {
    label: 'Propriétaire',
    icon: Home,
    colors: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  demarcheur: {
    label: 'Démarcheur',
    icon: Briefcase,
    colors: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  agence: {
    label: 'Agence',
    icon: Building2,
    colors: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
};

const sizeStyles = {
  sm: {
    container: 'px-1.5 py-0.5 text-[10px] gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-2 py-1 text-xs gap-1.5',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'px-3 py-1.5 text-sm gap-2',
    icon: 'w-4 h-4',
  },
};

export const UserTypeBadge = ({ 
  userType, 
  agencyName, 
  size = 'md',
  showLabel = true 
}: UserTypeBadgeProps) => {
  if (!userType || userType === 'particulier') return null;

  const config = userTypeConfig[userType];
  const Icon = config.icon;
  const sizeStyle = sizeStyles[size];

  const displayLabel = userType === 'agence' && agencyName 
    ? agencyName 
    : config.label;

  return (
    <span 
      className={`inline-flex items-center font-medium rounded-full border ${config.colors} ${sizeStyle.container}`}
    >
      <Icon className={sizeStyle.icon} />
      {showLabel && <span className="truncate max-w-[120px]">{displayLabel}</span>}
    </span>
  );
};

export const getUserTypeLabel = (userType: UserType): string => {
  if (!userType) return 'Particulier';
  return userTypeConfig[userType]?.label || 'Particulier';
};
