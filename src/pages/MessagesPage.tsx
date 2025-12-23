import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, ArrowLeft, Send, Loader2, 
  MessageCircle, Paperclip, X, FileText, Reply, MapPin,
  MoreVertical, Calendar, Flag, Volume2, VolumeX, Ban
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useMessages, useConversation } from '@/hooks/useMessages';
import { useAppMode } from '@/hooks/useAppMode';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import SwipeableMessage from '@/components/messages/SwipeableMessage';
import SwipeableConversation from '@/components/messages/SwipeableConversation';
import { AppointmentDialog } from '@/components/appointment/AppointmentDialog';
import { ReportUserDialog } from '@/components/messages/ReportUserDialog';
import SectionTutorialButton from '@/components/tutorial/SectionTutorialButton';
import EmailVerificationRequired from '@/components/EmailVerificationRequired';
import heroBg2 from '@/assets/hero-bg-2.jpg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type MessageTab = 'all' | 'received' | 'sent' | 'archived';

const MessagesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isEmailVerified } = useAuth();
  const { appMode, isResidence } = useAppMode();
  const { 
    conversations, 
    archivedConversations,
    loading, 
    totalUnread, 
    deleteConversation, 
    archiveConversation,
    unarchiveConversation 
  } = useMessages();
  const { isUserOnline, fetchLastSeen } = useOnlineStatus();
  const [selectedConversation, setSelectedConversation] = useState<{ participantId: string; propertyId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MessageTab>('all');
  const [mutedConversations, setMutedConversations] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('mutedConversations');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const toggleMuteConversation = (conversationId: string) => {
    setMutedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
        toast({ title: 'Son activé', description: 'Vous recevrez des notifications sonores' });
      } else {
        newSet.add(conversationId);
        toast({ title: 'Son désactivé', description: 'Notifications silencieuses' });
      }
      localStorage.setItem('mutedConversations', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  // Handle recipientId and propertyId from navigation state (when coming from property detail)
  useEffect(() => {
    const state = location.state as any;
    const recipientId = state?.recipientId;
    const propertyId = state?.propertyId;
    if (recipientId && recipientId !== user?.id && propertyId) {
      setSelectedConversation({ participantId: recipientId, propertyId });
    }
  }, [location.state, user?.id]);

  // Get the base list based on tab (archived or active)
  const baseList = activeTab === 'archived' ? archivedConversations : conversations;

  // Filter conversations based on tab and search
  const filteredConversations = baseList.filter(c => {
    // Search filter
    const matchesSearch = c.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.participantName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Tab filter (only for non-archived)
    if (activeTab === 'archived') return true;
    if (activeTab === 'all') return true;
    if (activeTab === 'received') return c.propertyOwnerId === user?.id;
    if (activeTab === 'sent') return c.propertyOwnerId !== user?.id;
    
    return true;
  });

  // Count for each tab
  const receivedCount = conversations.filter(c => c.propertyOwnerId === user?.id).length;
  const sentCount = conversations.filter(c => c.propertyOwnerId !== user?.id).length;
  const archivedCount = archivedConversations.length;

  const handleDeleteConversation = async (conversationId: string) => {
    if (deleteConversation) {
      const { error } = await deleteConversation(conversationId);
      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de supprimer la conversation',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Conversation supprimée',
          description: 'La conversation a été supprimée'
        });
      }
    }
  };

  const handleArchiveConversation = async (conversationId: string) => {
    if (archiveConversation) {
      const { error } = await archiveConversation(conversationId);
      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible d\'archiver la conversation',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Archivé',
          description: 'Conversation archivée'
        });
      }
    }
  };

  const handleUnarchiveConversation = async (conversationId: string) => {
    if (unarchiveConversation) {
      const { error } = await unarchiveConversation(conversationId);
      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de désarchiver la conversation',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Désarchivé',
          description: 'Conversation restaurée'
        });
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg2})` }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background/70" />
        
        <div 
          className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-6"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
        {/* Animated illustration */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mb-8 overflow-visible"
        >
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center backdrop-blur-sm border border-primary/10">
            <motion.div
              animate={{ 
                y: [0, -8, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <MessageCircle className="w-16 h-16 text-primary" strokeWidth={1.5} />
            </motion.div>
          </div>
          {/* Decorative bubbles - kept within bounds */}
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/30" />
          <div className="absolute bottom-1 -left-2 w-3 h-3 rounded-full bg-primary/20" />
        </motion.div>

        {/* Title and subtitle */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-2xl font-bold mb-2">Vos messages vous attendent</h2>
          <p className="text-muted-foreground">Connectez-vous pour discuter avec les propriétaires</p>
        </motion.div>

        {/* Features list */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5 w-full max-w-sm mb-8"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Chat en temps réel</p>
                <p className="text-xs text-muted-foreground">Messages instantanés</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Paperclip className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Pièces jointes</p>
                <p className="text-xs text-muted-foreground">Photos et documents</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Rendez-vous</p>
                <p className="text-xs text-muted-foreground">Planifiez vos visites</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm"
        >
          <Button 
            onClick={() => navigate('/auth')} 
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            Se connecter
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Pas encore de compte ? <button onClick={() => navigate('/auth')} className="text-primary font-medium">Créer un compte</button>
          </p>
        </motion.div>
        </div>
      </div>
    );
  }

  // Email verification required
  if (!isEmailVerified) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg2})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background/70" />
        <div className="relative z-10">
          <EmailVerificationRequired 
            title="Vérifiez votre email"
            description="Pour envoyer des messages, vous devez d'abord vérifier votre adresse email."
            icon={<MessageCircle className="w-16 h-16 text-amber-500" strokeWidth={1.5} />}
          />
        </div>
      </div>
    );
  }

  if (selectedConversation) {
    // Fetch last seen when selecting a conversation
    if (!isUserOnline(selectedConversation.participantId)) {
      fetchLastSeen([selectedConversation.participantId]);
    }
    
    return (
      <ConversationView 
        participantId={selectedConversation.participantId}
        propertyId={selectedConversation.propertyId}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <div className="page-container">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-display text-2xl font-bold">
          Messages {isResidence ? 'Residence' : ''}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {totalUnread > 0 
            ? `${totalUnread} non lu${totalUnread > 1 ? 's' : ''}` 
            : isResidence ? 'Vos conversations courts séjours' : 'Vos conversations'}
        </p>
      </motion.header>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="search-bar mb-4"
        data-tutorial="messages-search"
      >
        <Search className="w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher une conversation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none"
        />
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-4 gap-2 mb-4"
        data-tutorial="messages-tabs"
      >
        <button
          onClick={() => setActiveTab('all')}
          className={`py-2 px-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Tous ({conversations.length})
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`py-2 px-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'received'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Reçus ({receivedCount})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`py-2 px-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'sent'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Envoyés ({sentCount})
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`py-2 px-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'archived'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Archivés ({archivedCount})
        </button>
      </motion.div>

      {/* Conversations List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 text-center mt-8"
        >
          <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">
            {activeTab === 'all' ? 'Pas de messages' : 
             activeTab === 'received' ? 'Aucun message reçu' : 
             activeTab === 'sent' ? 'Aucun message envoyé' :
             'Aucune conversation archivée'}
          </h3>
          <p className="text-muted-foreground text-sm">
            {activeTab === 'all' ? 'Vos conversations apparaîtront ici' :
             activeTab === 'received' ? 'Les demandes pour vos biens apparaîtront ici' :
             activeTab === 'sent' ? 'Vos demandes vers des propriétaires apparaîtront ici' :
             'Les conversations archivées apparaîtront ici'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3" data-tutorial="messages-list">
          {filteredConversations.map((conversation, index) => (
            <SwipeableConversation
              key={conversation.id}
              conversation={conversation}
              isOnline={isUserOnline(conversation.participantId)}
              onSelect={() => setSelectedConversation({ 
                participantId: conversation.participantId, 
                propertyId: conversation.propertyId 
              })}
              onDelete={() => handleDeleteConversation(conversation.id)}
              onArchive={activeTab === 'archived' 
                ? () => handleUnarchiveConversation(conversation.id)
                : () => handleArchiveConversation(conversation.id)}
              isArchived={activeTab === 'archived'}
              index={index}
              isMuted={mutedConversations.has(conversation.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
interface ConversationViewProps {
  participantId: string;
  propertyId: string;
  onBack: () => void;
}

const ConversationView = ({ participantId, propertyId, onBack }: ConversationViewProps) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { isUserOnline, getLastSeen, fetchLastSeen } = useOnlineStatus();
  const { messages, loading, sendMessage, deleteMessage, addReaction, uploadAttachment, isTyping, setTyping } = useConversation(participantId, propertyId);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [participant, setParticipant] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [propertyInfo, setPropertyInfo] = useState<{ id: string; title: string; ownerId: string } | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: 'image' | 'file'; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ open: boolean; messageId: string | null }>({ open: false, messageId: null });
  const [isMuted, setIsMuted] = useState(() => {
    const stored = localStorage.getItem('mutedConversations');
    const mutedSet = stored ? new Set(JSON.parse(stored)) : new Set();
    return mutedSet.has(`${propertyId}_${participantId}`);
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleMute = () => {
    const stored = localStorage.getItem('mutedConversations');
    const mutedSet = stored ? new Set(JSON.parse(stored)) : new Set();
    const conversationKey = `${propertyId}_${participantId}`;
    
    if (mutedSet.has(conversationKey)) {
      mutedSet.delete(conversationKey);
      setIsMuted(false);
      toast({ title: 'Son activé', description: 'Vous recevrez des notifications sonores' });
    } else {
      mutedSet.add(conversationKey);
      setIsMuted(true);
      toast({ title: 'Son désactivé', description: 'Notifications silencieuses' });
    }
    localStorage.setItem('mutedConversations', JSON.stringify([...mutedSet]));
  };

  const handleDeleteWithConfirmation = (messageId: string) => {
    setDeleteConfirmation({ open: true, messageId });
  };

  const confirmDelete = async () => {
    if (deleteConfirmation.messageId) {
      const { error } = await deleteMessage(deleteConfirmation.messageId);
      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de supprimer le message',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Message supprimé',
          description: 'Le message a été supprimé'
        });
      }
    }
    setDeleteConfirmation({ open: false, messageId: null });
  };

  const isOnline = isUserOnline(participantId);
  const lastSeen = getLastSeen(participantId);

  useEffect(() => {
    if (!isOnline) {
      fetchLastSeen([participantId]);
    }
  }, [isOnline, participantId, fetchLastSeen]);

  useEffect(() => {
    // Fetch participant info
    const fetchParticipant = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', participantId)
        .maybeSingle();
      setParticipant(data);
    };
    fetchParticipant();
  }, [participantId]);

  // Fetch property info
  useEffect(() => {
    const fetchPropertyInfo = async () => {
      if (propertyId) {
        const { data } = await supabase
          .from('properties')
          .select('id, title, user_id')
          .eq('id', propertyId)
          .maybeSingle();
        
        if (data) {
          setPropertyInfo({ id: data.id, title: data.title, ownerId: data.user_id });
        }
      }
    };
    fetchPropertyInfo();
  }, [propertyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    setTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  }, [setTyping]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTyping(false);
    };
  }, [setTyping]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Le fichier est trop volumineux (max 10MB)');
      return;
    }

    setUploading(true);
    const result = await uploadAttachment(file);
    setUploading(false);

    if (result) {
      setPendingAttachment(result);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !pendingAttachment) || sending) return;

    setSending(true);
    setTyping(false);
    
    const { error } = await sendMessage(
      newMessage.trim(), 
      pendingAttachment || undefined,
      replyTo?.id
    );
    
    setSending(false);

    if (!error) {
      setNewMessage('');
      setPendingAttachment(null);
      setReplyTo(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="bg-card border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="p-4 flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative">
            <img
              src={participant?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop'}
              alt={participant?.full_name || 'Utilisateur'}
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop';
              }}
            />
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">{participant?.full_name || 'Utilisateur'}</h2>
            {isTyping ? (
              <p className="text-xs text-primary animate-pulse">En train d'écrire...</p>
            ) : isOnline ? (
              <p className="text-xs text-green-500">En ligne</p>
            ) : lastSeen ? (
              <p className="text-xs text-muted-foreground">
                Vu {formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: fr })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Hors ligne</p>
            )}
          </div>
          
          {/* 3-dot Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-muted rounded-full" data-tutorial="messages-menu">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border z-50">
              {/* Prendre RDV - toujours visible pour prendre RDV avec le vendeur */}
              {propertyInfo && (
                <DropdownMenuItem onClick={() => setShowAppointmentDialog(true)} className="cursor-pointer">
                  <Calendar className="w-4 h-4 mr-2" />
                  Prendre RDV
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={toggleMute} className="cursor-pointer">
                {isMuted ? (
                  <>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Activer le son
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 mr-2" />
                    Désactiver le son
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('blocked_users')
                      .insert({ user_id: user?.id, blocked_user_id: participantId });
                    
                    if (error) throw error;
                    
                    toast({
                      title: 'Utilisateur bloqué',
                      description: `Vous ne recevrez plus de messages de ${participant?.full_name || 'cet utilisateur'}`,
                    });
                    onBack();
                  } catch (err: any) {
                    if (err.code === '23505') {
                      toast({ title: 'Déjà bloqué', description: 'Cet utilisateur est déjà bloqué' });
                    } else {
                      toast({ title: 'Erreur', description: 'Impossible de bloquer l\'utilisateur', variant: 'destructive' });
                    }
                  }
                }} 
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Ban className="w-4 h-4 mr-2" />
                Bloquer l'utilisateur
              </DropdownMenuItem>
              <ReportUserDialog
                userId={participantId}
                userName={participant?.full_name}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer text-destructive focus:text-destructive">
                    <Flag className="w-4 h-4 mr-2" />
                    Signaler l'utilisateur
                  </DropdownMenuItem>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Property Banner with RDV Button */}
        {propertyInfo && (
          <div className="flex items-center border-t border-primary/20">
            <button
              onClick={() => navigate(`/property/${propertyInfo.id}`)}
              className="flex-1 px-4 py-2 bg-primary/10 flex items-center gap-2 hover:bg-primary/20 transition-colors"
            >
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm text-primary font-medium truncate">{propertyInfo.title}</span>
              <ArrowLeft className="w-4 h-4 text-primary rotate-180 ml-auto flex-shrink-0" />
            </button>
            {propertyInfo.ownerId !== user?.id && (
              <AppointmentDialog
                propertyId={propertyInfo.id}
                ownerId={propertyInfo.ownerId}
                propertyTitle={propertyInfo.title}
                open={showAppointmentDialog}
                onOpenChange={setShowAppointmentDialog}
                trigger={
                  <button 
                    onClick={() => setShowAppointmentDialog(true)}
                    className="px-4 py-2 bg-primary/20 hover:bg-primary/30 transition-colors flex items-center gap-1.5"
                  >
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">RDV</span>
                  </button>
                }
              />
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Commencez la conversation</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isMe = message.sender_id === user?.id;
              // Show avatar only for the last message in a consecutive group from same sender
              const nextMessage = messages[index + 1];
              const isLastInGroup = !nextMessage || nextMessage.sender_id !== message.sender_id;
              
              return (
                <SwipeableMessage
                  key={message.id}
                  message={message}
                  isMe={isMe}
                  userId={user?.id || ''}
                  participantAvatar={participant?.avatar_url}
                  myAvatar={profile?.avatar_url}
                  showAvatar={isLastInGroup}
                  onDelete={(messageId) => handleDeleteWithConfirmation(messageId)}
                  onReaction={async (messageId, emoji) => {
                    await addReaction(messageId, emoji);
                  }}
                  onReply={(msg) => setReplyTo({ id: msg.id, content: msg.content || '📎 Pièce jointe' })}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Typing indicator in chat */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-muted p-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Pending attachment preview */}
      {pendingAttachment && (
        <div className="px-4 py-2 bg-muted/50 border-t border-border">
          <div className="flex items-center gap-2">
            {pendingAttachment.type === 'image' ? (
              <img src={pendingAttachment.url} alt="Preview" className="h-16 w-16 object-cover rounded-lg" />
            ) : (
              <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{pendingAttachment.name}</p>
              <p className="text-xs text-muted-foreground">
                {pendingAttachment.type === 'image' ? 'Image' : 'Fichier'}
              </p>
            </div>
            <button 
              onClick={() => setPendingAttachment(null)}
              className="p-2 hover:bg-muted rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-muted/50 border-t border-border">
          <div className="flex items-center gap-2">
            <Reply className="w-4 h-4 text-primary" />
            <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
              <p className="text-xs text-muted-foreground">Répondre à</p>
              <p className="text-sm truncate">{replyTo.content}</p>
            </div>
            <button 
              onClick={() => setReplyTo(null)}
              className="p-2 hover:bg-muted rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Replies */}
      {messages.length === 0 && !newMessage && (
        <div className="px-4 py-2 bg-card border-t border-border">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              "Bonjour, je suis intéressé(e)",
              "Le prix est-il négociable ?",
              "Est-il toujours disponible ?"
            ].map((quickMessage) => (
              <button
                key={quickMessage}
                onClick={() => setNewMessage(quickMessage)}
                className="flex-shrink-0 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
              >
                {quickMessage}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 pb-20 bg-card border-t border-border" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }} data-tutorial="messages-input">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-3 hover:bg-muted rounded-full transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onBlur={() => {
              // Force keyboard dismiss on iOS
              (document.activeElement as HTMLElement)?.blur();
            }}
            placeholder={replyTo ? "Répondre..." : "Votre message..."}
            className="flex-1 bg-muted px-4 py-3 rounded-full outline-none focus:ring-2 focus:ring-primary"
          />
          <Button
            onClick={handleSend}
            disabled={(!newMessage.trim() && !pendingAttachment) || sending}
            size="icon"
            className="rounded-full gradient-primary h-12 w-12"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmation.open} onOpenChange={(open) => setDeleteConfirmation({ open, messageId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le message sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MessagesPage;
