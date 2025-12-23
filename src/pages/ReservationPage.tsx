import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format, differenceInDays, addDays, eachDayOfInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Calendar, 
  Check, 
  ChevronRight, 
  Home, 
  Loader2, 
  Moon, 
  Phone, 
  Send, 
  Users,
  MapPin,
  Star,
  Shield,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatPriceWithCurrency } from '@/data/currencies';
import { DateRange } from 'react-day-picker';

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  country: string | null;
  price_per_night: number | null;
  price: number;
  minimum_stay: number | null;
  discount_3_nights: number | null;
  discount_5_nights: number | null;
  discount_7_nights: number | null;
  discount_14_nights: number | null;
  discount_30_nights: number | null;
  user_id: string;
  images: { url: string }[];
}

interface BookedPeriod {
  checkIn: Date;
  checkOut: Date;
}

type Step = 'dates' | 'guests' | 'contact' | 'confirmation';

const ReservationPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('dates');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState('');
  const [sharePhone, setSharePhone] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [bookedPeriods, setBookedPeriods] = useState<BookedPeriod[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth', { state: { from: `/reservation/${id}` } });
    }
  }, [user, loading, navigate, id]);

  // Fetch property data
  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('properties')
          .select(`
            id,
            title,
            address,
            city,
            country,
            price_per_night,
            price,
            minimum_stay,
            discount_3_nights,
            discount_5_nights,
            discount_7_nights,
            discount_14_nights,
            discount_30_nights,
            user_id,
            property_images (url)
          `)
          .eq('id', id)
          .eq('listing_type', 'short_term')
          .single();

        if (error) throw error;

        setProperty({
          ...data,
          images: data.property_images || []
        });
      } catch (error) {
        console.error('Error fetching property:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les détails du logement.',
          variant: 'destructive',
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, navigate]);

  // Fetch unavailable dates
  useEffect(() => {
    const fetchUnavailableDates = async () => {
      if (!id) return;
      setLoadingDates(true);
      
      try {
        // Fetch booked reservations
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('appointments')
          .select('check_in_date, check_out_date')
          .eq('property_id', id)
          .eq('status', 'approved')
          .eq('reservation_type', 'reservation')
          .not('check_in_date', 'is', null)
          .not('check_out_date', 'is', null);

        if (bookingsError) throw bookingsError;

        const periods: BookedPeriod[] = (bookingsData || []).map(booking => ({
          checkIn: parseISO(booking.check_in_date!),
          checkOut: parseISO(booking.check_out_date!)
        }));

        setBookedPeriods(periods);

        // Fetch manually blocked dates
        const { data: blockedData, error: blockedError } = await supabase
          .from('property_blocked_dates')
          .select('blocked_date')
          .eq('property_id', id);

        if (blockedError) throw blockedError;

        const blocked = (blockedData || []).map(d => parseISO(d.blocked_date));
        setBlockedDates(blocked);
      } catch (error) {
        console.error('Error fetching unavailable dates:', error);
      } finally {
        setLoadingDates(false);
      }
    };

    fetchUnavailableDates();
  }, [id]);

  // Fetch user phone
  useEffect(() => {
    const fetchUserPhone = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('phone')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.phone) {
        setUserPhone(data.phone);
        setContactPhone(data.phone);
      }
    };
    fetchUserPhone();
  }, [user]);

  // Price calculations
  const pricePerNight = property?.price_per_night || Math.round((property?.price || 0) / 30);
  const minimumStay = property?.minimum_stay || 1;

  const getApplicableDiscount = (numNights: number): { percentage: number; tier: string } | null => {
    if (!property) return null;
    
    if (numNights >= 30 && property.discount_30_nights) {
      return { percentage: property.discount_30_nights, tier: '30+ nuits' };
    }
    if (numNights >= 14 && property.discount_14_nights) {
      return { percentage: property.discount_14_nights, tier: '14+ nuits' };
    }
    if (numNights >= 7 && property.discount_7_nights) {
      return { percentage: property.discount_7_nights, tier: '7+ nuits' };
    }
    if (numNights >= 5 && property.discount_5_nights) {
      return { percentage: property.discount_5_nights, tier: '5+ nuits' };
    }
    if (numNights >= 3 && property.discount_3_nights) {
      return { percentage: property.discount_3_nights, tier: '3+ nuits' };
    }
    return null;
  };

  const nights = dateRange?.from && dateRange?.to 
    ? differenceInDays(dateRange.to, dateRange.from)
    : 0;
  
  const applicableDiscount = getApplicableDiscount(nights);
  const discountedPricePerNight = applicableDiscount 
    ? pricePerNight * (1 - applicableDiscount.percentage / 100)
    : pricePerNight;
  const totalPriceBeforeDiscount = nights * pricePerNight;
  const totalPrice = nights * discountedPricePerNight;
  const savings = totalPriceBeforeDiscount - totalPrice;

  // Disabled dates calculation
  const disabledDates = useMemo(() => {
    const disabled: Date[] = [...blockedDates];
    
    bookedPeriods.forEach(period => {
      const days = eachDayOfInterval({ 
        start: period.checkIn, 
        end: addDays(period.checkOut, -1)
      });
      disabled.push(...days);
    });

    return disabled;
  }, [bookedPeriods, blockedDates]);

  const isDateDisabled = (date: Date): boolean => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
      return true;
    }
    return disabledDates.some(disabledDate => 
      disabledDate.toDateString() === date.toDateString()
    );
  };

  const formatPrice = (price: number) => {
    return formatPriceWithCurrency(price, property?.country);
  };

  // Navigation between steps
  const steps: Step[] = ['dates', 'guests', 'contact', 'confirmation'];
  const currentStepIndex = steps.indexOf(step);

  const canProceed = () => {
    switch (step) {
      case 'dates':
        return dateRange?.from && dateRange?.to && nights >= minimumStay;
      case 'guests':
        return guests >= 1;
      case 'contact':
        return !sharePhone || contactPhone.trim().length > 0;
      case 'confirmation':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    } else {
      navigate(`/property/${id}`);
    }
  };

  // Submit reservation
  const handleSubmit = async () => {
    if (!user || !property || !dateRange?.from || !dateRange?.to) return;

    if (user.id === property.user_id) {
      toast({
        title: 'Action impossible',
        description: 'Vous ne pouvez pas réserver votre propre logement.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: insertedReservation, error } = await supabase
        .from('appointments')
        .insert({
          property_id: property.id,
          requester_id: user.id,
          owner_id: property.user_id,
          requested_date: format(dateRange.from, 'yyyy-MM-dd'),
          requested_time: '12:00',
          check_in_date: format(dateRange.from, 'yyyy-MM-dd'),
          check_out_date: format(dateRange.to, 'yyyy-MM-dd'),
          total_nights: nights,
          total_price: Math.round(totalPrice),
          price_per_night: Math.round(discountedPricePerNight),
          reservation_type: 'reservation',
          message: message.trim() || null,
          share_phone: sharePhone,
          contact_phone: sharePhone ? contactPhone.trim() : null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Create in-app notification for the owner (mode résidence)
      if (insertedReservation?.id) {
        // Insert notification in database (will trigger push via database trigger)
        await supabase.from('notifications').insert({
          user_id: property.user_id,
          actor_id: user!.id,
          type: 'reservation_request',
          entity_id: insertedReservation.id,
        });

        // Also send email notification
        supabase.functions.invoke('notify-owner-reservation', {
          body: { reservationId: insertedReservation.id }
        }).catch(emailError => {
          console.error('Error sending owner notification email:', emailError);
        });
      }

      toast({
        title: '🎉 Demande envoyée !',
        description: 'Le propriétaire examinera votre demande et vous répondra bientôt.',
      });

      navigate(`/property/${id}`, { state: { reservationSuccess: true } });
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer la demande. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Logement non trouvé</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={prevStep}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-semibold text-lg">Réservation</h1>
              <p className="text-xs text-muted-foreground">
                Étape {currentStepIndex + 1} sur {steps.length}
              </p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="flex gap-1 mt-3">
            {steps.map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= currentStepIndex ? "bg-emerald-500" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Property Summary */}
      <div className="container max-w-2xl mx-auto px-4 py-4">
        <div className="flex gap-3 p-3 bg-muted/50 rounded-xl">
          {property.images[0] && (
            <img
              src={property.images[0].url}
              alt={property.title}
              className="w-20 h-20 object-cover rounded-lg"
            />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{property.title}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {property.city}
            </p>
            <p className="text-emerald-600 font-bold mt-1">
              {formatPrice(pricePerNight)}/nuit
            </p>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="container max-w-2xl mx-auto px-4">
        <AnimatePresence mode="wait">
          {/* Step 1: Dates */}
          {step === 'dates' && (
            <motion.div
              key="dates"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-semibold">Choisissez vos dates</h3>
              </div>

              {loadingDates ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <span className="ml-2 text-sm text-muted-foreground">Chargement des disponibilités...</span>
                </div>
              ) : (
                <>
                  <CalendarComponent
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    disabled={isDateDisabled}
                    locale={fr}
                    numberOfMonths={1}
                    className={cn("rounded-xl border p-4 pointer-events-auto")}
                    modifiers={{
                      booked: disabledDates
                    }}
                    modifiersStyles={{
                      booked: { 
                        textDecoration: 'line-through',
                        opacity: 0.5
                      }
                    }}
                  />
                  
                  {bookedPeriods.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-muted inline-block"></span>
                      Les dates barrées sont déjà réservées
                    </p>
                  )}

                  {minimumStay > 1 && (
                    <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                      ⚠️ Séjour minimum : {minimumStay} nuits
                    </p>
                  )}
                </>
              )}

              {/* Available discounts */}
              {(property.discount_3_nights || property.discount_5_nights || property.discount_7_nights || property.discount_14_nights || property.discount_30_nights) && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">🏷️ Forfaits disponibles</p>
                  <div className="flex flex-wrap gap-2">
                    {property.discount_3_nights && (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full">3+ nuits : -{property.discount_3_nights}%</span>
                    )}
                    {property.discount_5_nights && (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full">5+ nuits : -{property.discount_5_nights}%</span>
                    )}
                    {property.discount_7_nights && (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full">7+ nuits : -{property.discount_7_nights}%</span>
                    )}
                    {property.discount_14_nights && (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full">14+ nuits : -{property.discount_14_nights}%</span>
                    )}
                    {property.discount_30_nights && (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full">30+ nuits : -{property.discount_30_nights}%</span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Guests */}
          {step === 'guests' && (
            <motion.div
              key="guests"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-semibold">Nombre de voyageurs</h3>
              </div>

              <div className="p-6 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-center gap-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    disabled={guests <= 1}
                    className="h-14 w-14 rounded-full text-xl"
                  >
                    -
                  </Button>
                  <div className="text-center">
                    <span className="text-4xl font-bold">{guests}</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      voyageur{guests > 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setGuests(guests + 1)}
                    className="h-14 w-14 rounded-full text-xl"
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  💡 Indiquez le nombre total de personnes qui séjourneront dans le logement.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 3: Contact */}
          {step === 'contact' && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-semibold">Coordonnées & Message</h3>
              </div>

              {/* Phone sharing */}
              <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="sharePhone"
                    checked={sharePhone}
                    onCheckedChange={(checked) => setSharePhone(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor="sharePhone" className="text-sm font-medium cursor-pointer block">
                      Partager mon numéro de téléphone
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permet au propriétaire de vous contacter directement
                    </p>
                  </div>
                </div>

                {sharePhone && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <Input
                      type="tel"
                      placeholder="Votre numéro de téléphone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="mt-2"
                    />
                    {userPhone && userPhone !== contactPhone && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setContactPhone(userPhone)}
                        className="mt-1 text-xs"
                      >
                        Utiliser mon numéro de profil
                      </Button>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-sm font-medium block">
                  Message au propriétaire (optionnel)
                </label>
                <Textarea
                  placeholder="Présentez-vous et expliquez le but de votre séjour..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </motion.div>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirmation' && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-semibold">Récapitulatif</h3>
              </div>

              {/* Summary card */}
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl space-y-4">
                {/* Dates */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Arrivée</p>
                    <p className="font-semibold">
                      {dateRange?.from && format(dateRange.from, 'EEE d MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Départ</p>
                    <p className="font-semibold">
                      {dateRange?.to && format(dateRange.to, 'EEE d MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Nights and guests */}
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    {nights} nuit{nights > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {guests} voyageur{guests > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="h-px bg-border" />

                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{formatPrice(pricePerNight)} × {nights} nuits</span>
                    <span>{formatPrice(totalPriceBeforeDiscount)}</span>
                  </div>

                  {applicableDiscount && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>🏷️ Forfait {applicableDiscount.tier} (-{applicableDiscount.percentage}%)</span>
                      <span>-{formatPrice(savings)}</span>
                    </div>
                  )}

                  <div className="h-px bg-border" />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-emerald-600">{formatPrice(Math.round(totalPrice))}</span>
                  </div>
                </div>
              </div>

              {/* Security info */}
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Réservation sécurisée</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Votre demande sera envoyée au propriétaire qui devra l'approuver. 
                      Aucun paiement n'est effectué sur l'application.
                    </p>
                  </div>
                </div>
              </div>

              {/* Message preview */}
              {message && (
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Votre message</p>
                  <p className="text-sm">{message}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Price Summary & Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4 pb-safe">
        <div className="container max-w-2xl mx-auto">
          {nights > 0 && step !== 'confirmation' && (
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-sm text-muted-foreground">{nights} nuit{nights > 1 ? 's' : ''}</p>
                {applicableDiscount && (
                  <p className="text-xs text-emerald-600">Forfait {applicableDiscount.tier} appliqué</p>
                )}
              </div>
              <p className="text-lg font-bold text-emerald-600">{formatPrice(Math.round(totalPrice))}</p>
            </div>
          )}

          {step === 'confirmation' ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Confirmer la demande
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Continuer
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationPage;
