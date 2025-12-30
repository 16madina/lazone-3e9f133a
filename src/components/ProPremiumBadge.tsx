import { Crown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type ProPremiumLevel = 'none' | 'pro' | 'premium';

interface ProPremiumBadgeProps {
  listingsCount: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  variant?: 'badge' | 'ribbon';
  className?: string;
}

export const getProPremiumLevel = (listingsCount: number): ProPremiumLevel => {
  if (listingsCount >= 15) return 'premium';
  if (listingsCount >= 5) return 'pro';
  return 'none';
};

const badgeConfig = {
  none: null,
  pro: {
    name: 'Pro',
    description: '5+ annonces publiées',
    gradient: 'bg-gradient-to-r from-purple-500 to-pink-500',
  },
  premium: {
    name: 'Premium',
    description: '15+ annonces publiées',
    gradient: 'bg-gradient-to-r from-amber-500 to-orange-500',
  },
};

const sizeConfig = {
  sm: {
    container: 'px-1 py-0.5 text-[9px]',
    icon: 'w-2 h-2',
  },
  md: {
    container: 'px-1.5 py-0.5 text-[10px]',
    icon: 'w-2.5 h-2.5',
  },
  lg: {
    container: 'px-2 py-1 text-xs',
    icon: 'w-3 h-3',
  },
};

export const ProPremiumBadge = ({ 
  listingsCount, 
  size = 'sm', 
  showTooltip = true,
  variant = 'badge',
  className = '' 
}: ProPremiumBadgeProps) => {
  const level = getProPremiumLevel(listingsCount);
  const config = badgeConfig[level];
  
  if (!config) return null;

  const sizes = sizeConfig[size];

  // Ribbon variant for profile photo overlay
  if (variant === 'ribbon') {
    return (
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className={`px-2 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider shadow-lg rounded-full ${config.gradient}`}>
          {config.name}
        </div>
      </div>
    );
  }

  const badge = (
    <span className={`rounded-full font-semibold text-white flex items-center gap-0.5 ${config.gradient} ${sizes.container} ${className}`}>
      <Crown className={sizes.icon} />
      {config.name}
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold">{config.name}</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
};
