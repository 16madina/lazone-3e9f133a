import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Phone, Save, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { usePaymentNumbers, PaymentNumber, PaymentNumbersSettings } from '@/hooks/usePaymentNumbers';

const PaymentNumbersSettingsComponent = () => {
  const { settings, loading, updateSettings } = usePaymentNumbers();
  const [localSettings, setLocalSettings] = useState<PaymentNumbersSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleAddNumber = () => {
    if (!localSettings) return;

    const newNumber: PaymentNumber = {
      id: `custom_${Date.now()}`,
      label: 'Nouveau numéro',
      number: '',
      enabled: true,
    };

    setLocalSettings({
      ...localSettings,
      numbers: [...localSettings.numbers, newNumber],
    });
  };

  const handleRemoveNumber = (id: string) => {
    if (!localSettings) return;

    setLocalSettings({
      ...localSettings,
      numbers: localSettings.numbers.filter((n) => n.id !== id),
    });
  };

  const handleUpdateNumber = (id: string, field: keyof PaymentNumber, value: string | boolean) => {
    if (!localSettings) return;

    setLocalSettings({
      ...localSettings,
      numbers: localSettings.numbers.map((n) =>
        n.id === id ? { ...n, [field]: value } : n
      ),
    });
  };

  const handleSave = async () => {
    if (!localSettings) return;

    setSaving(true);
    const success = await updateSettings(localSettings);
    setSaving(false);

    if (success) {
      toast({
        title: 'Paramètres enregistrés',
        description: 'Les numéros de paiement ont été mis à jour',
      });
    } else {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres',
        variant: 'destructive',
      });
    }
  };

  if (loading || !localSettings) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Numéros de paiement
          </h3>
          <p className="text-sm text-muted-foreground">
            Configurez les numéros Mobile Money pour recevoir les paiements
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <Label>Instructions pour les utilisateurs</Label>
        <Textarea
          value={localSettings.instructions}
          onChange={(e) =>
            setLocalSettings({ ...localSettings, instructions: e.target.value })
          }
          placeholder="Instructions de paiement..."
          rows={2}
        />
      </div>

      {/* Numbers List */}
      <div className="space-y-3">
        <Label>Numéros de réception</Label>
        
        {localSettings.numbers.map((num, index) => (
          <div
            key={num.id}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
          >
            <div className="text-muted-foreground">
              <GripVertical className="w-4 h-4" />
            </div>
            
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={num.label}
                onChange={(e) => handleUpdateNumber(num.id, 'label', e.target.value)}
                placeholder="Nom (ex: MTN Money)"
                className="text-sm"
              />
              <Input
                value={num.number}
                onChange={(e) => handleUpdateNumber(num.id, 'number', e.target.value)}
                placeholder="+229 XX XX XX XX"
                className="font-mono text-sm"
              />
            </div>

            <Switch
              checked={num.enabled}
              onCheckedChange={(checked) => handleUpdateNumber(num.id, 'enabled', checked)}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveNumber(num.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={handleAddNumber}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un numéro
        </Button>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Enregistrement...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </>
        )}
      </Button>
    </div>
  );
};

export default PaymentNumbersSettingsComponent;
