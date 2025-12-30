import { useState } from 'react';
import { Copy, Share2, Users, Gift, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useReferrals } from '@/hooks/useReferrals';
import { useShare } from '@/hooks/useNativePlugins';
import { toast } from 'sonner';

interface ReferralSheetProps {
  trigger: React.ReactNode;
}

export const ReferralSheet = ({ trigger }: ReferralSheetProps) => {
  const { referralCode, referralLink, stats, loading } = useReferrals();
  const { share, loading: shareLoading } = useShare();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success('Code copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const handleShare = async () => {
    await share({
      title: 'Rejoins LaZone !',
      text: `Utilise mon code ${referralCode} pour t'inscrire sur LaZone et reçois 1 crédit gratuit pour publier ton annonce !`,
      url: referralLink,
      dialogTitle: 'Inviter un ami',
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Programme de parrainage
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Description */}
          <p className="text-sm text-muted-foreground">
            Invitez vos amis sur LaZone ! Vous et votre filleul recevez chacun <span className="font-semibold text-primary">1 crédit gratuit</span> quand il publie sa première annonce.
          </p>

          {/* Referral Code Display */}
          <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 rounded-2xl p-4 border border-primary/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Votre code de parrainage
            </p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-[0.3em] flex-1">
                {loading ? '...' : referralCode || 'N/A'}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
                disabled={!referralCode}
                className="h-10 w-10"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                <Users className="w-5 h-5 text-primary" />
                {stats.totalReferrals}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Filleuls invités</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-emerald-600">
                <Gift className="w-5 h-5" />
                +{stats.bonusCreditsEarned}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Crédits gagnés</p>
            </div>
          </div>

          {/* Share Button */}
          <Button
            onClick={handleShare}
            disabled={!referralCode || shareLoading}
            className="w-full gap-2 h-12"
            size="lg"
          >
            {shareLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}
            Partager mon lien d'invitation
          </Button>

          {/* How it works */}
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Comment ça marche ?
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span className="text-sm">Partagez votre code ou lien avec un ami</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span className="text-sm">Votre ami s'inscrit et publie sa première annonce</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span className="text-sm">Vous recevez tous les deux <span className="font-semibold text-primary">1 crédit gratuit</span> !</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
