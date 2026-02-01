import { Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '@/components/UserAvatar';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    reviewer: {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  };
}

export const ReviewCard = ({ review }: ReviewCardProps) => {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <div className="flex items-start gap-3">
        <UserAvatar
          src={review.reviewer?.avatar_url}
          name={review.reviewer?.full_name}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">{review.reviewer?.full_name || 'Utilisateur'}</p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
          
          {/* Stars */}
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= review.rating 
                    ? 'text-primary fill-primary' 
                    : 'text-muted-foreground'
                }`}
              />
            ))}
          </div>
          
          {review.comment && (
            <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
          )}
        </div>
      </div>
    </div>
  );
};