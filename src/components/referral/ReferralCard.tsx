import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Share2, Users, Gift, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useReferrals } from '@/hooks/useReferrals';
import { useShare } from '@/hooks/useNativePlugins';
import { toast } from 'sonner';

export const ReferralCard = () => {
  const { referralCode, referralLink, stats } = useReferrals();
  const { share } = useShare();
  const [copied, setCopied] = useState(false);

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
    <Card className="p-4 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/20">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Parrainez vos amis</h3>
          <p className="text-xs text-muted-foreground">
            Vous et votre filleul gagnez 1 crédit gratuit
          </p>
        </div>
      </div>

      {/* Referral Code Display */}
      <div className="bg-background/80 rounded-xl p-3 mb-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          Votre code de parrainage
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold tracking-widest flex-1">
            {referralCode}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCode}
            className="h-8 w-8 p-0"
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
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-background/60 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-lg font-bold">
            <Users className="w-4 h-4 text-primary" />
            {stats.totalReferrals}
          </div>
          <p className="text-[10px] text-muted-foreground">Filleuls</p>
        </div>
        <div className="bg-background/60 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-lg font-bold text-emerald-600">
            <Gift className="w-4 h-4" />
            +{stats.bonusCreditsEarned}
          </div>
          <p className="text-[10px] text-muted-foreground">Crédits gagnés</p>
        </div>
      </div>

      {/* Share Button */}
      <Button
        onClick={handleShare}
        className="w-full gap-2"
        size="sm"
      >
        <Share2 className="w-4 h-4" />
        Inviter un ami
      </Button>

      {/* How it works */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground mb-2">Comment ça marche ?</p>
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 text-[11px]">
            <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
            <span className="text-muted-foreground">Partagez votre code avec un ami</span>
          </div>
          <div className="flex items-start gap-2 text-[11px]">
            <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
            <span className="text-muted-foreground">Il s'inscrit et publie sa 1ère annonce</span>
          </div>
          <div className="flex items-start gap-2 text-[11px]">
            <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
            <span className="text-muted-foreground">Vous recevez tous les deux 1 crédit !</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
