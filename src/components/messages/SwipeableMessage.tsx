import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, FileText, Reply, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  is_read: boolean | null;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  reactions?: MessageReaction[];
  reply_to_id?: string | null;
  reply_to?: Message | null;
}

interface SwipeableMessageProps {
  message: Message;
  isMe: boolean;
  userId: string;
  participantAvatar?: string | null;
  myAvatar?: string | null;
  showAvatar?: boolean;
  onDelete: (messageId: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
}

const EMOJI_OPTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

const SwipeableMessage = ({ message, isMe, userId, participantAvatar, myAvatar, showAvatar = false, onReaction, onReply }: SwipeableMessageProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);
  const initialDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCloseLightbox = () => {
    setEnlargedImage(null);
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap - toggle between 1x and 2x zoom
      if (imageScale === 1) {
        setImageScale(2);
      } else {
        setImageScale(1);
        setImagePosition({ x: 0, y: 0 });
      }
    }
    lastTapRef.current = now;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialDistanceRef.current = distance;
      initialScaleRef.current = imageScale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = (distance / initialDistanceRef.current) * initialScaleRef.current;
      setImageScale(Math.min(Math.max(scale, 0.5), 4));
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(imageScale * delta, 0.5), 4);
    setImageScale(newScale);
    if (newScale <= 1) {
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const handleLongPressStart = () => {
    longPressRef.current = setTimeout(() => {
      setShowReactions(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const handleReactionSelect = (emoji: string) => {
    onReaction(message.id, emoji);
    setShowReactions(false);
  };

  // Group reactions by emoji
  const groupedReactions = message.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const hasMyReaction = (emoji: string) => 
    message.reactions?.some(r => r.emoji === emoji && r.user_id === userId);

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-end gap-2`}>
      {/* Avatar for received messages */}
      {!isMe && (
        <div className="flex-shrink-0 w-6">
          {showAvatar ? (
            participantAvatar ? (
              <img
                src={participantAvatar}
                alt="Avatar"
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                }}
              />
            ) : null
          ) : (
            <div className="w-6" />
          )}
          {showAvatar && (
            <div className={`w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary ${participantAvatar ? 'hidden' : ''}`}>
              ?
            </div>
          )}
        </div>
      )}
      
      {/* Reply button - left side for received messages */}
      {!isMe && (
        <button
          onClick={() => onReply(message)}
          className="opacity-0 group-hover:opacity-100 self-center p-1.5 hover:bg-muted rounded-full transition-opacity"
        >
          <Reply className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
      
      <motion.div
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        whileTap={{ scale: 0.98 }}
        className="relative max-w-[80%]"
      >
        {/* Reply preview */}
        {message.reply_to && (
          <div className={`mb-1 px-3 py-1.5 rounded-lg text-xs ${isMe ? 'bg-primary/20' : 'bg-muted/70'} border-l-2 border-primary/50`}>
            <p className="text-muted-foreground truncate">
              {message.reply_to.content || (message.reply_to.attachment_url ? '📎 Pièce jointe' : '')}
            </p>
          </div>
        )}
        
        <div
          className={`p-3 rounded-2xl ${
            isMe
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
          }`}
        >
          {/* Attachment */}
          {message.attachment_url && (
            <div className="mb-2">
              {message.attachment_type === 'image' ? (
                <img 
                  src={message.attachment_url} 
                  alt="Image" 
                  className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setEnlargedImage(message.attachment_url!)}
                />
              ) : (
                <a 
                  href={message.attachment_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 p-2 rounded-lg ${isMe ? 'bg-primary-foreground/10' : 'bg-background/50'}`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-sm truncate">{message.attachment_name || 'Fichier'}</span>
                </a>
              )}
            </div>
          )}
          
          {message.content && (
            <p className="text-sm">{message.content}</p>
          )}
          
          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
            <p className={`text-[10px] ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: fr })}
            </p>
            {isMe && (
              message.is_read ? (
                <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/70" />
              ) : (
                <Check className="w-3.5 h-3.5 text-primary-foreground/70" />
              )
            )}
          </div>
        </div>

        {/* Reactions display */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReactionSelect(emoji)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs ${
                  hasMyReaction(emoji) 
                    ? 'bg-primary/20 border border-primary/30' 
                    : 'bg-muted/50 border border-border'
                }`}
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-muted-foreground">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Reaction picker */}
        <AnimatePresence>
          {showReactions && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setShowReactions(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className={`absolute z-50 ${isMe ? 'right-0' : 'left-0'} bottom-full mb-2 bg-card border border-border rounded-full px-2 py-1 flex gap-1 shadow-lg`}
              >
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReactionSelect(emoji)}
                    className={`p-1.5 hover:bg-muted rounded-full transition-transform hover:scale-125 ${
                      hasMyReaction(emoji) ? 'bg-primary/20' : ''
                    }`}
                  >
                    <span className="text-lg">{emoji}</span>
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Reply button - right side for sent messages */}
      {isMe && (
        <button
          onClick={() => onReply(message)}
          className="opacity-0 group-hover:opacity-100 self-center p-1.5 hover:bg-muted rounded-full transition-opacity"
        >
          <Reply className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
      
      {/* Avatar for sent messages */}
      {isMe && (
        <div className="flex-shrink-0 w-6">
          {showAvatar ? (
            myAvatar ? (
              <img
                src={myAvatar}
                alt="Mon avatar"
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                }}
              />
            ) : null
          ) : (
            <div className="w-6" />
          )}
          {showAvatar && (
            <div className={`w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary ${myAvatar ? 'hidden' : ''}`}>
              ?
            </div>
          )}
        </div>
      )}

      {/* Image Lightbox with Pinch-to-Zoom */}
      <AnimatePresence>
        {enlargedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 touch-none"
            onClick={handleCloseLightbox}
            onWheel={handleWheel}
          >
            <button
              onClick={handleCloseLightbox}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            {/* Zoom indicator */}
            {imageScale !== 1 && (
              <div className="absolute top-4 left-4 px-2 py-1 bg-white/10 rounded-full text-white text-xs">
                {Math.round(imageScale * 100)}%
              </div>
            )}
            
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ 
                scale: imageScale,
                x: imagePosition.x,
                y: imagePosition.y
              }}
              exit={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag={imageScale > 1}
              dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
              onDragEnd={(_, info) => {
                setImagePosition({ x: info.offset.x, y: info.offset.y });
              }}
              src={enlargedImage}
              alt="Image agrandie"
              className="max-w-full max-h-full object-contain rounded-lg cursor-grab active:cursor-grabbing"
              onClick={(e) => {
                e.stopPropagation();
                handleDoubleTap();
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            />
            
            {/* Zoom hint */}
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">
              Double-tap ou pincez pour zoomer
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwipeableMessage;
