import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Users, 
  Home, 
  Flag, 
  Shield, 
  Star,
  Loader2,
  Search,
  Trash2,
  Ban,
  AlertTriangle,
  Mail,
  MessageCircle,
  UserPlus,
  Eye,
  Check,
  X,
  Clock,
  ChevronRight,
  CalendarIcon,
  MapPin,
  Bell,
  Send,
  Phone,
  Image,
  Plus,
  Edit2,
  ExternalLink,
  Upload,
  GripVertical,
  Wallet,
  CreditCard
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/stores/appStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { africanCountries } from '@/data/africanCountries';
import ListingLimitsTab from '@/components/admin/ListingLimitsTab';
import PaymentValidationTab from '@/components/admin/PaymentValidationTab';

type TabType = 'users' | 'properties' | 'properties-residence' | 'reports' | 'admins' | 'sponsored' | 'notifications' | 'banners' | 'limits' | 'payments';

// Predefined notification templates
const notificationTemplates = [
  {
    id: 'verify_email',
    label: 'Vérification email',
    title: '📧 Vérifiez votre email',
    body: 'N\'oubliez pas de vérifier votre adresse email pour accéder à toutes les fonctionnalités de LaZone.',
  },
  {
    id: 'promotion',
    label: 'Promotion',
    title: '🎉 Offre spéciale LaZone',
    body: 'Profitez de nos offres exclusives pour sponsoriser vos annonces et augmenter leur visibilité !',
  },
  {
    id: 'delete_listing',
    label: 'Supprimer annonce',
    title: '⚠️ Action requise sur votre annonce',
    body: 'Votre annonce ne respecte pas nos conditions d\'utilisation. Veuillez la modifier ou la supprimer.',
  },
  {
    id: 'welcome',
    label: 'Bienvenue',
    title: '👋 Bienvenue sur LaZone',
    body: 'Merci de rejoindre notre communauté immobilière africaine ! Commencez à explorer les annonces.',
  },
  {
    id: 'update_app',
    label: 'Mise à jour',
    title: '🆕 Nouvelle version disponible',
    body: 'Une nouvelle version de LaZone est disponible avec de nouvelles fonctionnalités !',
  },
  {
    id: 'inactive',
    label: 'Compte inactif',
    title: '💤 Vous nous manquez',
    body: 'Cela fait un moment que vous n\'êtes pas venu sur LaZone. De nouvelles annonces vous attendent !',
  },
  {
    id: 'security',
    label: 'Sécurité',
    title: '🔒 Alerte sécurité',
    body: 'Nous vous recommandons de mettre à jour votre mot de passe pour sécuriser votre compte.',
  },
  {
    id: 'custom',
    label: 'Personnalisé',
    title: '',
    body: '',
  },
];

interface UserData {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  avatar_url: string | null;
  created_at: string;
  is_banned?: boolean;
  warnings_count?: number;
  properties_count?: number;
  average_rating?: number;
  reviews_count?: number;
}

interface PropertyData {
  id: string;
  title: string;
  price: number;
  city: string;
  country: string | null;
  is_active: boolean;
  is_sponsored: boolean;
  sponsored_until: string | null;
  created_at: string;
  user_id: string;
  owner_name?: string;
  image_url?: string;
  listing_type?: string;
}

interface SponsorDialogData {
  open: boolean;
  property: PropertyData | null;
}

interface ReportData {
  id: string;
  property_id: string;
  property_title?: string;
  reporter_name?: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface UserReportData {
  id: string;
  reported_user_id: string;
  reported_user_name?: string;
  reporter_id: string;
  reporter_name?: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface AdminData {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  email: string;
  created_at: string;
}

interface BannerData {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  click_count: number;
}

// URL validation helper
const isValidUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid (optional)
  try {
    // Add https if no protocol
    const urlToTest = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : 'https://' + url;
    new URL(urlToTest);
    return true;
  } catch {
    return false;
  }
};

// Sortable Banner Item Component
interface SortableBannerItemProps {
  banner: BannerData;
  onToggleActive: (id: string, isActive: boolean) => void;
  onEdit: (banner: BannerData) => void;
  onDelete: (id: string) => void;
}

const SortableBannerItem = ({ banner, onToggleActive, onEdit, onDelete }: SortableBannerItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="bg-card rounded-xl overflow-hidden shadow-sm border border-border"
    >
      <div className="aspect-[3/1] relative">
        <img 
          src={banner.image_url} 
          alt={banner.title}
          className="w-full h-full object-cover"
        />
        {!banner.is_active && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="secondary">Désactivée</Badge>
          </div>
        )}
        {/* Click stats badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-black/60 text-white border-0">
            {banner.click_count || 0} clics
          </Badge>
        </div>
        {/* Drag handle */}
        <div 
          {...attributes} 
          {...listeners}
          className="absolute top-2 left-2 p-2 bg-black/60 backdrop-blur-sm rounded-lg cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{banner.title}</h3>
            {banner.link_url && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">{banner.link_url}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleActive(banner.id, banner.is_active)}
              className={`p-2 rounded-lg hover:bg-muted transition-colors ${
                banner.is_active ? 'text-green-500' : 'text-muted-foreground'
              }`}
              title={banner.is_active ? 'Désactiver' : 'Activer'}
            >
              {banner.is_active ? <Eye className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onEdit(banner)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(banner.id)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isModerator, loading: loadingRoles } = useAdmin();
  const { user } = useAuth();
  const appMode = useAppStore((state) => state.appMode);
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState<'all' | 'active' | 'inactive' | 'sponsored'>('all');
  
  // Data states
  const [users, setUsers] = useState<UserData[]>([]);
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [residenceProperties, setResidenceProperties] = useState<PropertyData[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [userReports, setUserReports] = useState<UserReportData[]>([]);
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [banners, setBanners] = useState<BannerData[]>([]);
  
  // Dialog states
  const [warningDialog, setWarningDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' });
  const [banDialog, setBanDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' });
  const [messageDialog, setMessageDialog] = useState<{ open: boolean; userId: string; userName: string; type: 'app' | 'email' }>({ open: false, userId: '', userName: '', type: 'app' });
  const [sponsorDialog, setSponsorDialog] = useState<SponsorDialogData>({ open: false, property: null });
  const [addAdminDialog, setAddAdminDialog] = useState(false);
  const [bannerDialog, setBannerDialog] = useState<{ open: boolean; banner: BannerData | null }>({ open: false, banner: null });
  
  // Banner form states
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerLinkUrl, setBannerLinkUrl] = useState('');
  const [bannerLinkUrlError, setBannerLinkUrlError] = useState('');
  const [bannerIsActive, setBannerIsActive] = useState(true);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  
  // Form states
  const [warningReason, setWarningReason] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banPermanent, setBanPermanent] = useState(false);
  const [banDays, setBanDays] = useState('7');
  const [messageContent, setMessageContent] = useState('');
  const [sponsorMode, setSponsorMode] = useState<'days' | 'dates'>('days');
  const [sponsorDays, setSponsorDays] = useState('30');
  const [sponsorStartDate, setSponsorStartDate] = useState<Date | undefined>(new Date());
  const [sponsorEndDate, setSponsorEndDate] = useState<Date | undefined>(undefined);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'moderator'>('moderator');
  
  // Push notification states
  const [selectedNotificationTemplate, setSelectedNotificationTemplate] = useState('verify_email');
  const [customNotificationTitle, setCustomNotificationTitle] = useState('');
  const [customNotificationBody, setCustomNotificationBody] = useState('');
  const [notificationTargetType, setNotificationTargetType] = useState<'all' | 'single'>('all');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);

  // Global stats state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalImmobilier: 0,
    totalResidence: 0,
    pendingReservations: 0,
    pendingPropertyReports: 0,
    pendingUserReports: 0,
    activeSponsored: 0,
    bannedUsers: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Drag and drop sensors for banner reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle banner drag end
  const handleBannerDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = banners.findIndex(b => b.id === active.id);
    const newIndex = banners.findIndex(b => b.id === over.id);
    
    // Optimistically update UI
    const reorderedBanners = arrayMove(banners, oldIndex, newIndex);
    setBanners(reorderedBanners);

    // Update display_order in database
    try {
      const updates = reorderedBanners.map((banner, index) => ({
        id: banner.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('ad_banners')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
      
      toast({ title: 'Ordre mis à jour' });
    } catch (error) {
      console.error('Error updating banner order:', error);
      toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
      // Revert on error
      fetchBanners();
    }
  };

  const fetchBanners = async () => {
    const { data, error } = await supabase
      .from('ad_banners')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    setBanners(data || []);
  };

  // Fetch global stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [
        usersResult,
        immobilierResult,
        residenceResult,
        reservationsResult,
        propertyReportsResult,
        userReportsResult,
        sponsoredResult,
        bannedResult,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('listing_type', 'long_term'),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('listing_type', 'short_term'),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('property_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('is_sponsored', true),
        supabase.from('user_bans').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        totalImmobilier: immobilierResult.count || 0,
        totalResidence: residenceResult.count || 0,
        pendingReservations: reservationsResult.count || 0,
        pendingPropertyReports: propertyReportsResult.count || 0,
        pendingUserReports: userReportsResult.count || 0,
        activeSponsored: sponsoredResult.count || 0,
        bannedUsers: bannedResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!loadingRoles && !isAdmin && !isModerator) {
      navigate('/profile');
    }
  }, [loadingRoles, isAdmin, isModerator, navigate]);

  useEffect(() => {
    if (isAdmin || isModerator) {
      fetchStats();
      fetchData();
    }
  }, [activeTab, isAdmin, isModerator]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'users':
          await fetchUsers();
          break;
        case 'properties':
          await fetchProperties('long_term');
          break;
        case 'properties-residence':
          await fetchProperties('short_term');
          break;
        case 'reports':
          await fetchReports();
          break;
        case 'admins':
          await fetchAdmins();
          break;
        case 'sponsored':
          await fetchSponsoredProperties();
          break;
        case 'notifications':
          await fetchUsers();
          break;
        case 'banners':
          await fetchBanners();
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    // Get all user IDs
    const userIds = (profiles || []).map(p => p.user_id);

    // Fetch additional data in parallel
    const [bansResult, warningsResult, propertiesResult, reviewsResult] = await Promise.all([
      supabase.from('user_bans').select('user_id').eq('is_active', true).in('user_id', userIds),
      supabase.from('user_warnings').select('user_id').in('user_id', userIds),
      supabase.from('properties').select('user_id').in('user_id', userIds),
      supabase.from('user_reviews').select('reviewed_user_id, rating').in('reviewed_user_id', userIds),
    ]);

    // Create maps for quick lookup
    const bannedUsers = new Set((bansResult.data || []).map(b => b.user_id));
    
    const warningsCountMap = new Map<string, number>();
    (warningsResult.data || []).forEach(w => {
      warningsCountMap.set(w.user_id, (warningsCountMap.get(w.user_id) || 0) + 1);
    });

    const propertiesCountMap = new Map<string, number>();
    (propertiesResult.data || []).forEach(p => {
      propertiesCountMap.set(p.user_id, (propertiesCountMap.get(p.user_id) || 0) + 1);
    });

    const reviewsMap = new Map<string, { total: number; count: number }>();
    (reviewsResult.data || []).forEach(r => {
      const existing = reviewsMap.get(r.reviewed_user_id) || { total: 0, count: 0 };
      reviewsMap.set(r.reviewed_user_id, { total: existing.total + r.rating, count: existing.count + 1 });
    });

    const usersWithData: UserData[] = (profiles || []).map((profile) => {
      const reviewData = reviewsMap.get(profile.user_id);
      const avgRating = reviewData ? Math.round((reviewData.total / reviewData.count) * 10) / 10 : 0;
      
      return {
        ...profile,
        email: '',
        is_banned: bannedUsers.has(profile.user_id),
        warnings_count: warningsCountMap.get(profile.user_id) || 0,
        properties_count: propertiesCountMap.get(profile.user_id) || 0,
        average_rating: avgRating,
        reviews_count: reviewData?.count || 0,
      };
    });

    setUsers(usersWithData);
  };

  const fetchProperties = async (listingType: 'long_term' | 'short_term') => {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, price, city, country, is_active, is_sponsored, sponsored_until, created_at, user_id, listing_type')
      .eq('listing_type', listingType)
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    // Fetch owner names and images separately
    const userIds = [...new Set((data || []).map(p => p.user_id))];
    const propertyIds = (data || []).map(p => p.id);
    
    const [{ data: profiles }, { data: images }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
      supabase.from('property_images').select('property_id, url').in('property_id', propertyIds).order('display_order', { ascending: true })
    ]);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
    const imageMap = new Map<string, string>();
    (images || []).forEach(img => {
      if (!imageMap.has(img.property_id)) {
        imageMap.set(img.property_id, img.url);
      }
    });

    const propertiesWithOwner = (data || []).map((p: any) => ({
      ...p,
      owner_name: profileMap.get(p.user_id) || 'Inconnu',
      image_url: imageMap.get(p.id) || null,
    }));

    if (listingType === 'long_term') {
      setProperties(propertiesWithOwner);
    } else {
      setResidenceProperties(propertiesWithOwner);
    }
  };

  const fetchReports = async () => {
    // Fetch property reports
    const { data, error } = await supabase
      .from('property_reports')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    // Fetch property titles and reporter names separately
    const propertyIds = [...new Set((data || []).map(r => r.property_id))];
    const reporterIds = [...new Set((data || []).map(r => r.reporter_id))];

    const [{ data: properties }, { data: profiles }] = await Promise.all([
      supabase.from('properties').select('id, title').in('id', propertyIds),
      supabase.from('profiles').select('user_id, full_name').in('user_id', reporterIds)
    ]);

    const propertyMap = new Map((properties || []).map(p => [p.id, p.title]));
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

    const reportsWithDetails = (data || []).map((r: any) => ({
      ...r,
      property_title: propertyMap.get(r.property_id) || 'Annonce supprimée',
      reporter_name: profileMap.get(r.reporter_id) || 'Anonyme',
    }));

    setReports(reportsWithDetails);

    // Fetch user reports
    const { data: userReportsData, error: userReportsError } = await supabase
      .from('user_reports')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (userReportsError) throw userReportsError;

    // Fetch reporter and reported user names
    const allUserIds = [
      ...new Set([
        ...(userReportsData || []).map(r => r.reporter_id),
        ...(userReportsData || []).map(r => r.reported_user_id)
      ])
    ];

    const { data: userProfiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', allUserIds);

    const userProfileMap = new Map((userProfiles || []).map(p => [p.user_id, p.full_name]));

    const userReportsWithDetails = (userReportsData || []).map((r: any) => ({
      ...r,
      reported_user_name: userProfileMap.get(r.reported_user_id) || 'Inconnu',
      reporter_name: userProfileMap.get(r.reporter_id) || 'Anonyme',
    }));

    setUserReports(userReportsWithDetails);
  };

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    // Fetch profile names separately
    const userIds = [...new Set((data || []).map(a => a.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

    const adminsWithDetails = (data || []).map((a: any) => ({
      ...a,
      full_name: profileMap.get(a.user_id) || 'Inconnu',
      email: '',
    }));

    setAdmins(adminsWithDetails);
  };

  const fetchSponsoredProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, price, city, country, is_active, is_sponsored, sponsored_until, created_at, user_id')
      .eq('is_sponsored', true)
      .order('sponsored_until', { ascending: false });
    
    if (error) throw error;

    // Fetch owner names and images separately
    const userIds = [...new Set((data || []).map(p => p.user_id))];
    const propertyIds = (data || []).map(p => p.id);
    
    const [{ data: profiles }, { data: images }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
      supabase.from('property_images').select('property_id, url').in('property_id', propertyIds).order('display_order', { ascending: true })
    ]);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
    const imageMap = new Map<string, string>();
    (images || []).forEach(img => {
      if (!imageMap.has(img.property_id)) {
        imageMap.set(img.property_id, img.url);
      }
    });

    const propertiesWithOwner = (data || []).map((p: any) => ({
      ...p,
      owner_name: profileMap.get(p.user_id) || 'Inconnu',
      image_url: imageMap.get(p.id) || null,
    }));

    setProperties(propertiesWithOwner);
  };


  // Actions
  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      setProperties(prev => prev.filter(p => p.id !== propertyId));
      toast({ title: 'Annonce supprimée' });
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleSendWarning = async () => {
    if (!warningReason.trim()) return;

    try {
      const { error } = await supabase
        .from('user_warnings')
        .insert({
          user_id: warningDialog.userId,
          admin_id: user?.id,
          reason: warningReason,
        });

      if (error) throw error;

      toast({ title: 'Avertissement envoyé' });
      setWarningDialog({ open: false, userId: '', userName: '' });
      setWarningReason('');
      fetchUsers();
    } catch (error) {
      console.error('Error sending warning:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleBanUser = async () => {
    if (!banReason.trim()) return;

    try {
      const expiresAt = banPermanent 
        ? null 
        : new Date(Date.now() + parseInt(banDays) * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('user_bans')
        .insert({
          user_id: banDialog.userId,
          admin_id: user?.id,
          reason: banReason,
          is_permanent: banPermanent,
          expires_at: expiresAt,
        });

      if (error) throw error;

      toast({ title: 'Utilisateur banni' });
      setBanDialog({ open: false, userId: '', userName: '' });
      setBanReason('');
      setBanPermanent(false);
      fetchUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_bans')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      toast({ title: 'Bannissement levé' });
      fetchUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim()) return;

    try {
      if (messageDialog.type === 'app') {
        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: user?.id,
            receiver_id: messageDialog.userId,
            content: messageContent,
            listing_type: appMode === 'residence' ? 'short_term' : 'long_term',
          });

        if (error) throw error;
      } else {
        // Send email via edge function
        const { error } = await supabase.functions.invoke('send-admin-message', {
          body: {
            userId: messageDialog.userId,
            message: messageContent,
          },
        });

        if (error) throw error;
      }

      toast({ title: 'Message envoyé' });
      setMessageDialog({ open: false, userId: '', userName: '', type: 'app' });
      setMessageContent('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleSponsorProperty = async () => {
    if (!sponsorDialog.property) return;
    
    try {
      let sponsoredUntil: string;
      
      if (sponsorMode === 'days') {
        sponsoredUntil = new Date(Date.now() + parseInt(sponsorDays) * 24 * 60 * 60 * 1000).toISOString();
      } else {
        if (!sponsorEndDate) {
          toast({ title: 'Veuillez sélectionner une date de fin', variant: 'destructive' });
          return;
        }
        sponsoredUntil = sponsorEndDate.toISOString();
      }

      const { error } = await supabase
        .from('properties')
        .update({
          is_sponsored: true,
          sponsored_until: sponsoredUntil,
          sponsored_by: user?.id,
        })
        .eq('id', sponsorDialog.property.id);

      if (error) throw error;

      toast({ title: 'Annonce sponsorisée' });
      setSponsorDialog({ open: false, property: null });
      setSponsorMode('days');
      setSponsorDays('30');
      setSponsorStartDate(new Date());
      setSponsorEndDate(undefined);
      // Refresh both property lists
      fetchProperties('long_term');
      fetchProperties('short_term');
    } catch (error) {
      console.error('Error sponsoring property:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleRemoveSponsor = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          is_sponsored: false,
          sponsored_until: null,
          sponsored_by: null,
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({ title: 'Sponsoring retiré' });
      if (activeTab === 'sponsored') {
        fetchSponsoredProperties();
      } else {
        fetchProperties('long_term');
        fetchProperties('short_term');
      }
    } catch (error) {
      console.error('Error removing sponsor:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;

    try {
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .limit(100);

      if (profileError) throw profileError;

      // We need to find the user by their auth email - this is tricky
      // For now, we'll need to have the admin enter the user_id directly or use another method
      toast({ 
        title: 'Fonctionnalité limitée', 
        description: 'Veuillez contacter le support pour ajouter un administrateur.',
      });
      
      setAddAdminDialog(false);
      setNewAdminEmail('');
    } catch (error) {
      console.error('Error adding admin:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleRemoveAdmin = async (roleId: string, userId: string) => {
    if (userId === user?.id) {
      toast({ title: 'Vous ne pouvez pas vous retirer vous-même', variant: 'destructive' });
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir retirer ce rôle ?')) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({ title: 'Rôle retiré' });
      fetchAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleReportAction = async (reportId: string, action: 'resolved' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('property_reports')
        .update({
          status: action,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({ title: action === 'resolved' ? 'Signalement résolu' : 'Signalement rejeté' });
      fetchReports();
    } catch (error) {
      console.error('Error updating report:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleUserReportAction = async (reportId: string, action: 'resolved' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('user_reports')
        .update({
          status: action,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({ title: action === 'resolved' ? 'Signalement résolu' : 'Signalement rejeté' });
      fetchReports();
    } catch (error) {
      console.error('Error updating user report:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    toast({ 
      title: 'Action non disponible', 
      description: 'La suppression d\'utilisateur nécessite une action côté serveur.',
      variant: 'destructive' 
    });
  };

  // Banner handlers
  const handleOpenBannerDialog = (banner?: BannerData) => {
    if (banner) {
      setBannerTitle(banner.title);
      setBannerLinkUrl(banner.link_url || '');
      setBannerLinkUrlError('');
      setBannerIsActive(banner.is_active);
      setBannerImagePreview(banner.image_url);
      setBannerDialog({ open: true, banner });
    } else {
      setBannerTitle('');
      setBannerLinkUrl('');
      setBannerLinkUrlError('');
      setBannerIsActive(true);
      setBannerImagePreview(null);
      setBannerImageFile(null);
      setBannerDialog({ open: true, banner: null });
    }
  };

  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBanner = async () => {
    if (!bannerTitle.trim()) {
      toast({ title: 'Veuillez entrer un titre', variant: 'destructive' });
      return;
    }

    if (bannerLinkUrl && !isValidUrl(bannerLinkUrl)) {
      toast({ title: 'URL invalide', variant: 'destructive' });
      return;
    }

    if (!bannerDialog.banner && !bannerImageFile) {
      toast({ title: 'Veuillez sélectionner une image', variant: 'destructive' });
      return;
    }

    setUploadingBanner(true);
    try {
      let imageUrl = bannerDialog.banner?.image_url || '';

      // Upload new image if provided
      if (bannerImageFile) {
        const fileExt = bannerImageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ad-banners')
          .upload(fileName, bannerImageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('ad-banners')
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }

      if (bannerDialog.banner) {
        // Update existing banner
        const { error } = await supabase
          .from('ad_banners')
          .update({
            title: bannerTitle,
            image_url: imageUrl,
            link_url: bannerLinkUrl || null,
            is_active: bannerIsActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bannerDialog.banner.id);

        if (error) throw error;
        toast({ title: 'Bannière mise à jour' });
      } else {
        // Create new banner
        const { error } = await supabase
          .from('ad_banners')
          .insert({
            title: bannerTitle,
            image_url: imageUrl,
            link_url: bannerLinkUrl || null,
            is_active: bannerIsActive,
            created_by: user?.id,
          });

        if (error) throw error;
        toast({ title: 'Bannière créée' });
      }

      setBannerDialog({ open: false, banner: null });
      setBannerImageFile(null);
      fetchBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      toast({ title: 'Erreur lors de la sauvegarde', variant: 'destructive' });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette bannière ?')) return;

    try {
      const { error } = await supabase
        .from('ad_banners')
        .delete()
        .eq('id', bannerId);

      if (error) throw error;

      setBanners(prev => prev.filter(b => b.id !== bannerId));
      toast({ title: 'Bannière supprimée' });
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleToggleBannerActive = async (bannerId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ad_banners')
        .update({ is_active: !isActive })
        .eq('id', bannerId);

      if (error) throw error;

      setBanners(prev => prev.map(b => 
        b.id === bannerId ? { ...b, is_active: !isActive } : b
      ));
      toast({ title: isActive ? 'Bannière désactivée' : 'Bannière activée' });
    } catch (error) {
      console.error('Error toggling banner:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const tabs = [
    { id: 'users' as TabType, label: 'Utilisateurs', icon: Users },
    { id: 'properties' as TabType, label: 'Immobilier', icon: Home },
    { id: 'properties-residence' as TabType, label: 'Résidence', icon: Home, color: 'text-emerald-500' },
    { id: 'reports' as TabType, label: 'Signalements', icon: Flag },
    { id: 'sponsored' as TabType, label: 'Sponsorisés', icon: Star },
    { id: 'banners' as TabType, label: 'Bannières', icon: Image },
    { id: 'notifications' as TabType, label: 'Notifs', icon: Bell },
    ...(isAdmin ? [
      { id: 'payments' as TabType, label: 'Paiements', icon: CreditCard },
      { id: 'limits' as TabType, label: 'Limites', icon: Wallet },
      { id: 'admins' as TabType, label: 'Admins', icon: Shield },
    ] : []),
  ];

  const handleSendPushNotification = async () => {
    const title = customNotificationTitle.trim();
    const body = customNotificationBody.trim();
    const notificationData: Record<string, string> = {
      type: 'promotion',
      listing_type: appMode === 'residence' ? 'short_term' : 'long_term',
    };

    if (!title || !body) {
      toast({ title: 'Veuillez remplir le titre et le message', variant: 'destructive' });
      return;
    }

    if (notificationTargetType === 'single' && !selectedUserId) {
      toast({ title: 'Veuillez sélectionner un utilisateur', variant: 'destructive' });
      return;
    }

    setSendingNotification(true);
    try {
      if (notificationTargetType === 'single') {
        // Send to single user
        const { error } = await supabase.functions.invoke('send-push-notification', {
          body: { userId: selectedUserId, title, body, data: notificationData },
        });
        if (error) throw error;
        toast({ title: 'Notification envoyée' });
      } else {
        // Send to all users with FCM tokens
        const { data: tokens, error: tokensError } = await supabase
          .from('fcm_tokens')
          .select('user_id')
          .limit(500);

        if (tokensError) throw tokensError;

        const uniqueUserIds = [...new Set((tokens || []).map(t => t.user_id))];
        let successCount = 0;
        
        for (const userId of uniqueUserIds) {
          try {
            await supabase.functions.invoke('send-push-notification', {
              body: { userId, title, body, data: notificationData },
            });
            successCount++;
          } catch (e) {
            console.error(`Failed to send to ${userId}:`, e);
          }
        }

        toast({ 
          title: 'Notifications envoyées', 
          description: `${successCount}/${uniqueUserIds.length} utilisateurs notifiés` 
        });
      }

      // Reset form after sending
      setCustomNotificationTitle('');
      setCustomNotificationBody('');
      setSelectedNotificationTemplate('');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({ title: 'Erreur lors de l\'envoi', variant: 'destructive' });
    } finally {
      setSendingNotification(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      spam: 'Spam',
      inappropriate_content: 'Contenu inapproprié',
      fraud: 'Fraude',
      false_info: 'Fausse information',
      other: 'Autre',
    };
    return labels[reason] || reason;
  };

  const getUserReportReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      harassment: 'Harcèlement',
      spam: 'Spam ou publicité',
      fraud: 'Fraude ou arnaque',
      inappropriate_content: 'Contenu inapproprié',
      other: 'Autre',
    };
    return labels[reason] || reason;
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery)
  );

  const filteredProperties = properties.filter(p => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = p.title.toLowerCase().includes(query) ||
      p.city.toLowerCase().includes(query) ||
      (p.owner_name?.toLowerCase().includes(query)) ||
      (p.country?.toLowerCase().includes(query)) ||
      (africanCountries.find(c => c.code === p.country)?.name.toLowerCase().includes(query));
    
    if (!matchesSearch) return false;
    
    switch (propertyStatusFilter) {
      case 'active':
        return p.is_active && !p.is_sponsored;
      case 'inactive':
        return !p.is_active;
      case 'sponsored':
        return p.is_sponsored;
      default:
        return true;
    }
  });

  const filteredResidenceProperties = residenceProperties.filter(p => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = p.title.toLowerCase().includes(query) ||
      p.city.toLowerCase().includes(query) ||
      (p.owner_name?.toLowerCase().includes(query)) ||
      (p.country?.toLowerCase().includes(query)) ||
      (africanCountries.find(c => c.code === p.country)?.name.toLowerCase().includes(query));
    
    if (!matchesSearch) return false;
    
    switch (propertyStatusFilter) {
      case 'active':
        return p.is_active && !p.is_sponsored;
      case 'inactive':
        return !p.is_active;
      case 'sponsored':
        return p.is_sponsored;
      default:
        return true;
    }
  });

  if (loadingRoles) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isModerator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/80 pt-12 pb-6 px-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Administration</h1>
            <p className="text-white/70 text-sm">Gestion de l'application</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-10 bg-white/90"
          />
        </div>
      </div>

      {/* Tabs - Two rows for mobile */}
      <div className="px-4 -mt-3">
        <div className="bg-card rounded-xl shadow-sm p-2 space-y-2">
          {/* First row - 4 tabs */}
          <div className="grid grid-cols-4 gap-1">
            {tabs.slice(0, 4).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  activeTab === tab.id
                    ? tab.id === 'properties-residence' 
                      ? 'bg-emerald-500 text-white'
                      : 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <tab.icon className={`w-4 h-4 flex-shrink-0 ${tab.id === 'properties-residence' && activeTab !== tab.id ? 'text-emerald-500' : ''}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
          {/* Second row - remaining tabs */}
          <div className="grid grid-cols-4 gap-1">
            {tabs.slice(4).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Global Stats */}
      <div className="px-4 mt-4">
        {loadingStats ? (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border animate-pulse">
            <div className="h-6 w-32 bg-muted rounded mb-3" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-16 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Statistiques globales
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {/* Total Users */}
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{stats.totalUsers}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-500">Utilisateurs</p>
                  </div>
                </div>
              </div>
              
              {/* Immobilier */}
              <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary">{stats.totalImmobilier}</p>
                    <p className="text-xs text-primary/70">Immobilier</p>
                  </div>
                </div>
              </div>
              
              {/* Résidence */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-900">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{stats.totalResidence}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500">Résidence</p>
                  </div>
                </div>
              </div>
              
              {/* Pending Reservations */}
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{stats.pendingReservations}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500">Réservations</p>
                  </div>
                </div>
              </div>
              
              {/* Property Reports */}
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border border-red-200 dark:border-red-900">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                    <Flag className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">{stats.pendingPropertyReports}</p>
                    <p className="text-xs text-red-600 dark:text-red-500">Signalements</p>
                  </div>
                </div>
              </div>
              
              {/* User Reports */}
              <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 border border-orange-200 dark:border-orange-900">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{stats.pendingUserReports}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-500">Sig. users</p>
                  </div>
                </div>
              </div>
              
              {/* Sponsored */}
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-900">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{stats.activeSponsored}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-500">Sponsorisés</p>
                  </div>
                </div>
              </div>
              
              {/* Banned Users */}
              <div className="bg-gray-50 dark:bg-gray-950/30 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                    <Ban className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-700 dark:text-gray-400">{stats.bannedUsers}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-500">Bannis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 mt-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-3">
                {filteredUsers.map((userData) => (
                  <div key={userData.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
                    <div className="flex gap-4">
                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground">{userData.full_name || 'Sans nom'}</h3>
                          {userData.is_banned && (
                            <Badge variant="destructive" className="text-xs">Banni</Badge>
                          )}
                          {(userData.warnings_count || 0) > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {userData.warnings_count} avert.
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {userData.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{userData.phone}</span>
                            </div>
                          )}
                          {userData.country && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {africanCountries.find(c => c.code === userData.country)?.name || userData.country}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            <span>Inscrit: {format(new Date(userData.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4" />
                            <span>Annonces: {userData.properties_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            <span>Note: {userData.average_rating || 0}/5 ({userData.reviews_count || 0} avis)</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/user/${userData.user_id}`)}
                          className="justify-start gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMessageDialog({ open: true, userId: userData.user_id, userName: userData.full_name || '', type: 'app' })}
                          className="justify-start gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Message
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMessageDialog({ open: true, userId: userData.user_id, userName: userData.full_name || '', type: 'email' })}
                          className="justify-start gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          Email
                        </Button>
                        {userData.is_banned ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnbanUser(userData.user_id)}
                            className="justify-start gap-2 text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <Check className="w-4 h-4" />
                            Débannir
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBanDialog({ open: true, userId: userData.user_id, userName: userData.full_name || '' })}
                            className="justify-start gap-2 text-destructive border-destructive hover:bg-destructive/10"
                          >
                            <Ban className="w-4 h-4" />
                            Bannir
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé</p>
                )}
              </div>
            )}

            {/* Properties Tab */}
            {activeTab === 'properties' && (
              <div className="space-y-3">
                {/* Status Filter Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    { value: 'all', label: 'Toutes', count: properties.length },
                    { value: 'active', label: 'Actives', count: properties.filter(p => p.is_active && !p.is_sponsored).length },
                    { value: 'inactive', label: 'Inactives', count: properties.filter(p => !p.is_active).length },
                    { value: 'sponsored', label: 'Sponsorisées', count: properties.filter(p => p.is_sponsored).length },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setPropertyStatusFilter(filter.value as typeof propertyStatusFilter)}
                      className={cn(
                        "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5",
                        propertyStatusFilter === filter.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {filter.label}
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        propertyStatusFilter === filter.value
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-background text-foreground"
                      )}>
                        {filter.count}
                      </span>
                    </button>
                  ))}
                </div>

                {filteredProperties.map((property) => (
                  <div key={property.id} className="bg-card rounded-xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                        {property.image_url ? (
                          <img 
                            src={property.image_url} 
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{property.title}</h3>
                          {property.is_sponsored && (
                            <Badge className="text-xs bg-amber-500">Sponsorisé</Badge>
                          )}
                          {!property.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactif</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{property.city} • {property.owner_name}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(`/property/${property.id}`)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {property.is_sponsored ? (
                          <button
                            onClick={() => handleRemoveSponsor(property.id)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="Retirer sponsoring"
                          >
                            <X className="w-4 h-4 text-amber-500" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setSponsorDialog({ open: true, property })}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="Sponsoriser"
                          >
                            <Star className="w-4 h-4 text-amber-500" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteProperty(property.id)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredProperties.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Aucune annonce trouvée</p>
                )}
              </div>
            )}

            {/* Residence Properties Tab */}
            {activeTab === 'properties-residence' && (
              <div className="space-y-3">
                {/* Status Filter Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    { value: 'all', label: 'Toutes', count: residenceProperties.length },
                    { value: 'active', label: 'Actives', count: residenceProperties.filter(p => p.is_active && !p.is_sponsored).length },
                    { value: 'inactive', label: 'Inactives', count: residenceProperties.filter(p => !p.is_active).length },
                    { value: 'sponsored', label: 'Sponsorisées', count: residenceProperties.filter(p => p.is_sponsored).length },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setPropertyStatusFilter(filter.value as typeof propertyStatusFilter)}
                      className={cn(
                        "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5",
                        propertyStatusFilter === filter.value
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {filter.label}
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        propertyStatusFilter === filter.value
                          ? "bg-white/20 text-white"
                          : "bg-background text-foreground"
                      )}>
                        {filter.count}
                      </span>
                    </button>
                  ))}
                </div>

                {filteredResidenceProperties.map((property) => (
                  <div key={property.id} className="bg-card rounded-xl p-4 shadow-sm border-l-4 border-l-emerald-500">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                        {property.image_url ? (
                          <img 
                            src={property.image_url} 
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{property.title}</h3>
                          {property.is_sponsored && (
                            <Badge className="text-xs bg-amber-500">Sponsorisé</Badge>
                          )}
                          {!property.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactif</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{property.city} • {property.owner_name}</p>
                        <Badge className="mt-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Résidence</Badge>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(`/property/${property.id}`)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {property.is_sponsored ? (
                          <button
                            onClick={() => handleRemoveSponsor(property.id)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="Retirer sponsoring"
                          >
                            <X className="w-4 h-4 text-amber-500" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setSponsorDialog({ open: true, property })}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="Sponsoriser"
                          >
                            <Star className="w-4 h-4 text-amber-500" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteProperty(property.id)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredResidenceProperties.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Aucune annonce Résidence trouvée</p>
                )}
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                {/* Property Reports Section */}
                <div>
                  <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Signalements d'annonces
                  </h2>
                  {reports.filter(r => r.status === 'pending').length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">En attente</h3>
                      {reports.filter(r => r.status === 'pending').map((report) => (
                        <div key={report.id} className="bg-card rounded-xl p-4 shadow-sm mb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{report.property_title}</h3>
                              <Badge variant="outline" className="mt-1">{getReasonLabel(report.reason)}</Badge>
                              {report.description && (
                                <p className="text-sm text-muted-foreground mt-2">{report.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">Par {report.reporter_name}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => navigate(`/property/${report.property_id}`)}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                                title="Voir l'annonce"
                              >
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => handleReportAction(report.id, 'resolved')}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                                title="Résoudre"
                              >
                                <Check className="w-4 h-4 text-green-500" />
                              </button>
                              <button
                                onClick={() => handleReportAction(report.id, 'dismissed')}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                                title="Rejeter"
                              >
                                <X className="w-4 h-4 text-destructive" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {reports.filter(r => r.status !== 'pending').length > 0 && (
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">Traités</h3>
                      {reports.filter(r => r.status !== 'pending').map((report) => (
                        <div key={report.id} className="bg-card rounded-xl p-4 shadow-sm mb-3 opacity-60">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{report.property_title}</h3>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline">{getReasonLabel(report.reason)}</Badge>
                                <Badge variant={report.status === 'resolved' ? 'default' : 'secondary'}>
                                  {report.status === 'resolved' ? 'Résolu' : 'Rejeté'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {reports.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">Aucun signalement d'annonce</p>
                  )}
                </div>

                {/* User Reports Section */}
                <div>
                  <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Signalements d'utilisateurs
                  </h2>
                  {userReports.filter(r => r.status === 'pending').length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">En attente</h3>
                      {userReports.filter(r => r.status === 'pending').map((report) => (
                        <div key={report.id} className="bg-card rounded-xl p-4 shadow-sm mb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{report.reported_user_name}</h3>
                              <Badge variant="outline" className="mt-1">{getUserReportReasonLabel(report.reason)}</Badge>
                              {report.description && (
                                <p className="text-sm text-muted-foreground mt-2">{report.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">Par {report.reporter_name}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => navigate(`/user/${report.reported_user_id}`)}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                                title="Voir le profil"
                              >
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => handleUserReportAction(report.id, 'resolved')}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                                title="Résoudre"
                              >
                                <Check className="w-4 h-4 text-green-500" />
                              </button>
                              <button
                                onClick={() => handleUserReportAction(report.id, 'dismissed')}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                                title="Rejeter"
                              >
                                <X className="w-4 h-4 text-destructive" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {userReports.filter(r => r.status !== 'pending').length > 0 && (
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">Traités</h3>
                      {userReports.filter(r => r.status !== 'pending').map((report) => (
                        <div key={report.id} className="bg-card rounded-xl p-4 shadow-sm mb-3 opacity-60">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{report.reported_user_name}</h3>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline">{getUserReportReasonLabel(report.reason)}</Badge>
                                <Badge variant={report.status === 'resolved' ? 'default' : 'secondary'}>
                                  {report.status === 'resolved' ? 'Résolu' : 'Rejeté'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {userReports.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">Aucun signalement d'utilisateur</p>
                  )}
                </div>
              </div>
            )}

            {/* Sponsored Tab */}
            {activeTab === 'sponsored' && (
              <div className="space-y-3">
                {properties.map((property) => (
                  <div key={property.id} className="bg-card rounded-xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                        {property.image_url ? (
                          <img 
                            src={property.image_url} 
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{property.title}</h3>
                        <p className="text-sm text-muted-foreground">{property.city} • {property.owner_name}</p>
                        {property.sponsored_until && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Jusqu'au {new Date(property.sponsored_until).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveSponsor(property.id)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Retirer sponsoring"
                      >
                        <X className="w-4 h-4 text-amber-500" />
                      </button>
                    </div>
                  </div>
                ))}
                {properties.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Aucune annonce sponsorisée</p>
                )}
              </div>
            )}

            {/* Admins Tab */}
            {activeTab === 'admins' && isAdmin && (
              <div className="space-y-3">
                <Button
                  onClick={() => setAddAdminDialog(true)}
                  className="w-full"
                  variant="outline"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter un administrateur
                </Button>
                
                {admins.map((admin) => (
                  <div key={admin.id} className="bg-card rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{admin.full_name}</h3>
                          <Badge variant={admin.role === 'admin' ? 'default' : 'secondary'}>
                            {admin.role === 'admin' ? 'Admin' : 'Modérateur'}
                          </Badge>
                        </div>
                      </div>
                      {admin.user_id !== user?.id && (
                        <button
                          onClick={() => handleRemoveAdmin(admin.id, admin.user_id)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Retirer"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                {/* Test Push Notifications Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/settings/push-test')}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Tester les notifications push
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>

                <div className="bg-card rounded-xl p-4 shadow-sm">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Envoyer une notification push
                  </h3>
                  
                  {/* Target Selection */}
                  <div className="mb-4">
                    <Label className="text-sm">Destinataire</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant={notificationTargetType === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNotificationTargetType('all')}
                        className="flex-1"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Tous les utilisateurs
                      </Button>
                      <Button
                        variant={notificationTargetType === 'single' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNotificationTargetType('single')}
                        className="flex-1"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Un utilisateur
                      </Button>
                    </div>
                  </div>

                  {/* Single User Selection */}
                  {notificationTargetType === 'single' && (
                    <div className="mb-4">
                      <Label className="text-sm">Sélectionner un utilisateur</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Choisir un utilisateur..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.user_id} value={u.user_id}>
                              {u.full_name || u.phone || 'Utilisateur sans nom'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Template Selection */}
                  <div className="mb-4">
                    <Label className="text-sm">Modèle de notification</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {notificationTemplates.filter(t => t.id !== 'custom').map((template) => (
                        <button
                          key={template.id}
                          onClick={() => {
                            setSelectedNotificationTemplate(template.id);
                            setCustomNotificationTitle(template.title);
                            setCustomNotificationBody(template.body);
                          }}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-colors",
                            selectedNotificationTemplate === template.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-muted"
                          )}
                        >
                          <span className="text-sm font-medium">{template.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Editable Title & Message */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <Label className="text-sm">Titre</Label>
                      <Input
                        value={customNotificationTitle}
                        onChange={(e) => setCustomNotificationTitle(e.target.value)}
                        placeholder="Titre de la notification..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Message</Label>
                      <Textarea
                        value={customNotificationBody}
                        onChange={(e) => setCustomNotificationBody(e.target.value)}
                        placeholder="Corps du message..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Send Button */}
                  <Button 
                    onClick={handleSendPushNotification} 
                    className="w-full"
                    disabled={sendingNotification}
                  >
                    {sendingNotification ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {notificationTargetType === 'all' ? 'Envoyer à tous' : 'Envoyer'}
                  </Button>
                </div>

                {/* Info Card */}
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Information
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Les notifications push ne seront envoyées qu'aux utilisateurs ayant installé l'application mobile et accepté les notifications.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Banners Tab */}
            {activeTab === 'banners' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    onClick={() => handleOpenBannerDialog()}
                    className="flex-1"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une bannière
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Glissez-déposez pour réorganiser l'ordre d'affichage
                </p>
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleBannerDragEnd}
                >
                  <SortableContext
                    items={banners.map(b => b.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {banners.map((banner) => (
                        <SortableBannerItem
                          key={banner.id}
                          banner={banner}
                          onToggleActive={handleToggleBannerActive}
                          onEdit={handleOpenBannerDialog}
                          onDelete={handleDeleteBanner}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                {banners.length === 0 && (
                  <div className="text-center py-8">
                    <Image className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Aucune bannière publicitaire</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ajoutez des bannières pour les afficher entre les annonces
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Limits Tab */}
            {activeTab === 'limits' && isAdmin && (
              <ListingLimitsTab />
            )}

            {/* Payments Validation Tab */}
            {activeTab === 'payments' && isAdmin && (
              <PaymentValidationTab />
            )}
          </>
        )}
      </div>

      {/* Warning Dialog */}
      <Dialog open={warningDialog.open} onOpenChange={(open) => setWarningDialog({ ...warningDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer un avertissement</DialogTitle>
            <DialogDescription>
              Avertissement pour {warningDialog.userName}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={warningReason}
            onChange={(e) => setWarningReason(e.target.value)}
            placeholder="Raison de l'avertissement..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningDialog({ open: false, userId: '', userName: '' })}>
              Annuler
            </Button>
            <Button onClick={handleSendWarning} disabled={!warningReason.trim()}>
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialog.open} onOpenChange={(open) => setBanDialog({ ...banDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bannir l'utilisateur</DialogTitle>
            <DialogDescription>
              Bannir {banDialog.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Raison du bannissement..."
              rows={3}
            />
            <div className="flex items-center justify-between">
              <Label htmlFor="permanent">Bannissement permanent</Label>
              <Switch
                id="permanent"
                checked={banPermanent}
                onCheckedChange={setBanPermanent}
              />
            </div>
            {!banPermanent && (
              <div>
                <Label>Durée (jours)</Label>
                <Select value={banDays} onValueChange={setBanDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 jour</SelectItem>
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialog({ open: false, userId: '', userName: '' })}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleBanUser} disabled={!banReason.trim()}>
              Bannir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialog.open} onOpenChange={(open) => setMessageDialog({ ...messageDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer un message</DialogTitle>
            <DialogDescription>
              Message pour {messageDialog.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={messageDialog.type === 'app' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageDialog({ ...messageDialog, type: 'app' })}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                App
              </Button>
              <Button
                variant={messageDialog.type === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageDialog({ ...messageDialog, type: 'email' })}
              >
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Button>
            </div>
            <Textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Votre message..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialog({ open: false, userId: '', userName: '', type: 'app' })}>
              Annuler
            </Button>
            <Button onClick={handleSendMessage} disabled={!messageContent.trim()}>
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sponsor Dialog */}
      <Dialog open={sponsorDialog.open} onOpenChange={(open) => {
        if (!open) {
          setSponsorDialog({ open: false, property: null });
          setSponsorMode('days');
          setSponsorDays('30');
          setSponsorStartDate(new Date());
          setSponsorEndDate(undefined);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sponsoriser l'annonce</DialogTitle>
          </DialogHeader>
          
          {/* Property Preview */}
          {sponsorDialog.property && (
            <div className="flex gap-4 p-4 bg-muted/50 rounded-xl">
              {sponsorDialog.property.image_url ? (
                <img 
                  src={sponsorDialog.property.image_url} 
                  alt={sponsorDialog.property.title}
                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <Home className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{sponsorDialog.property.title}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{sponsorDialog.property.city}</span>
                  {sponsorDialog.property.country && (
                    <>
                      <span>•</span>
                      <img 
                        src={`https://flagcdn.com/w40/${sponsorDialog.property.country.toLowerCase()}.png`}
                        alt=""
                        className="w-4 h-3 object-cover rounded-sm"
                      />
                      <span>{africanCountries.find(c => c.code === sponsorDialog.property?.country)?.name || sponsorDialog.property.country}</span>
                    </>
                  )}
                </div>
                <p className="font-bold text-primary mt-2">
                  {sponsorDialog.property.price.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Mode Selection */}
            <div className="flex gap-2">
              <Button
                variant={sponsorMode === 'days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSponsorMode('days')}
                className="flex-1"
              >
                <Clock className="w-4 h-4 mr-1" />
                Nombre de jours
              </Button>
              <Button
                variant={sponsorMode === 'dates' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSponsorMode('dates')}
                className="flex-1"
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                Dates personnalisées
              </Button>
            </div>

            {sponsorMode === 'days' ? (
              <div>
                <Label>Durée du sponsoring</Label>
                <Select value={sponsorDays} onValueChange={setSponsorDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="14">14 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="60">60 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                    <SelectItem value="180">180 jours</SelectItem>
                    <SelectItem value="365">1 an</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Fin prévue: {format(new Date(Date.now() + parseInt(sponsorDays) * 24 * 60 * 60 * 1000), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Date de début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !sponsorStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {sponsorStartDate ? format(sponsorStartDate, 'dd MMMM yyyy', { locale: fr }) : "Sélectionner"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={sponsorStartDate}
                        onSelect={setSponsorStartDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !sponsorEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {sponsorEndDate ? format(sponsorEndDate, 'dd MMMM yyyy', { locale: fr }) : "Sélectionner"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={sponsorEndDate}
                        onSelect={setSponsorEndDate}
                        disabled={(date) => date < (sponsorStartDate || new Date())}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {sponsorStartDate && sponsorEndDate && (
                  <p className="text-xs text-muted-foreground">
                    Durée: {Math.ceil((sponsorEndDate.getTime() - sponsorStartDate.getTime()) / (1000 * 60 * 60 * 24))} jours
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSponsorDialog({ open: false, property: null })}>
              Annuler
            </Button>
            <Button 
              onClick={handleSponsorProperty}
              disabled={sponsorMode === 'dates' && !sponsorEndDate}
            >
              <Star className="w-4 h-4 mr-1" />
              Sponsoriser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={addAdminDialog} onOpenChange={setAddAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un administrateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email de l'utilisateur</Label>
              <Input
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
              />
            </div>
            <div>
              <Label>Rôle</Label>
              <Select value={newAdminRole} onValueChange={(v) => setNewAdminRole(v as 'admin' | 'moderator')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderator">Modérateur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAdminDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddAdmin} disabled={!newAdminEmail.trim()}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Banner Dialog */}
      <Dialog open={bannerDialog.open} onOpenChange={(open) => {
        if (!open) {
          setBannerDialog({ open: false, banner: null });
          setBannerImageFile(null);
          setBannerImagePreview(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bannerDialog.banner ? 'Modifier la bannière' : 'Nouvelle bannière'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre</Label>
              <Input
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                placeholder="Titre de la bannière"
              />
            </div>
            
            <div>
              <Label>Image (ratio 3:1 recommandé)</Label>
              <input
                type="file"
                ref={bannerFileInputRef}
                onChange={handleBannerImageChange}
                accept="image/*"
                className="hidden"
              />
              {bannerImagePreview ? (
                <div className="mt-2 relative">
                  <img 
                    src={bannerImagePreview} 
                    alt="Preview" 
                    className="w-full aspect-[3/1] object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => bannerFileInputRef.current?.click()}
                  >
                    Changer
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2 h-24"
                  onClick={() => bannerFileInputRef.current?.click()}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Sélectionner une image
                </Button>
              )}
            </div>
            
            <div>
              <Label>Lien (optionnel)</Label>
              <Input
                value={bannerLinkUrl}
                onChange={(e) => {
                  setBannerLinkUrl(e.target.value);
                  if (e.target.value && !isValidUrl(e.target.value)) {
                    setBannerLinkUrlError('URL invalide. Exemple: https://example.com');
                  } else {
                    setBannerLinkUrlError('');
                  }
                }}
                placeholder="https://..."
                className={bannerLinkUrlError ? 'border-destructive' : ''}
              />
              {bannerLinkUrlError && (
                <p className="text-xs text-destructive mt-1">{bannerLinkUrlError}</p>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Activer la bannière</Label>
              <Switch
                checked={bannerIsActive}
                onCheckedChange={setBannerIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBannerDialog({ open: false, banner: null })}>
              Annuler
            </Button>
            <Button onClick={handleSaveBanner} disabled={uploadingBanner || !!bannerLinkUrlError}>
              {uploadingBanner && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {bannerDialog.banner ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
