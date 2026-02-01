import { cn } from '@/lib/utils';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-24 h-24 text-3xl',
};

export const UserAvatar = ({ 
  src, 
  name, 
  size = 'md', 
  className,
  showOnlineIndicator = false,
  isOnline = false,
}: UserAvatarProps) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const sizeClass = sizeClasses[size];
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
    if (fallback) fallback.style.display = 'flex';
  };

  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/40',
        sizeClass
      )}>
        {src ? (
          <>
            <img
              src={src}
              alt={name || 'Utilisateur'}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
            {/* Fallback initials - hidden by default, shown on image error */}
            <div 
              className="hidden w-full h-full items-center justify-center absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40"
            >
              <span className="font-bold text-primary">{initial}</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-bold text-primary">{initial}</span>
          </div>
        )}
      </div>
      
      {showOnlineIndicator && isOnline && (
        <span className={cn(
          'absolute bg-emerald-500 border-2 border-card rounded-full',
          size === 'xs' ? 'w-2 h-2 bottom-0 right-0' :
          size === 'sm' ? 'w-2.5 h-2.5 bottom-0 right-0' :
          'w-3 h-3 bottom-0 right-0'
        )} />
      )}
    </div>
  );
};
