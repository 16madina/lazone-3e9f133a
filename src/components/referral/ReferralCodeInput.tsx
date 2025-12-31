import { useState } from 'react';
import { Gift, Loader2, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useReferrals } from '@/hooks/useReferrals';
import { toast } from 'sonner';

interface ReferralCodeInputProps {
  onSuccess?: () => void;
  defaultCode?: string;
}

export const ReferralCodeInput = ({ onSuccess, defaultCode = '' }: ReferralCodeInputProps) => {
  const { applyReferralCode } = useReferrals();
  const [code, setCode] = useState(defaultCode);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) {
      toast.error('Veuillez entrer un code');
      return;
    }

    setLoading(true);
    const result = await applyReferralCode(code.trim());
    setLoading(false);

    if (result.success) {
      setApplied(true);
      toast.success('Code de parrainage appliqué ! Vous recevrez 1 crédit gratuit après votre première annonce.');
      onSuccess?.();
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  if (applied) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
        <Check className="w-5 h-5 text-emerald-500" />
        <span className="text-sm text-emerald-600 font-medium">
          Code de parrainage appliqué !
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Gift className="w-4 h-4 text-primary" />
        Code de parrainage (optionnel)
      </label>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ex: ABC12345"
          className="font-mono uppercase tracking-wider"
          maxLength={8}
        />
        <Button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          size="default"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Appliquer'
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Entrez le code d'un ami pour recevoir 1 crédit gratuit après votre première annonce
      </p>
    </div>
  );
};
