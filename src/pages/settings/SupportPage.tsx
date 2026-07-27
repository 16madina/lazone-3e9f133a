import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { SEOHead } from '@/components/SEOHead';

const SupportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.category || !formData.message) {
      toast({ title: 'Veuillez remplir tous les champs', variant: 'destructive' });
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({ 
      title: 'Message envoyé', 
      description: 'Notre équipe vous répondra sous 24-48h.' 
    });
    setLoading(false);
    navigate('/profile');
  };

  return (
    <>
      <SEOHead 
        title="Contacter le support"
        description="Contactez l'équipe support LaZone pour toute question ou problème. Nous répondons sous 24-48h."
        canonical="/settings/support"
        noindex
      />
      <div className="min-h-screen bg-muted/30 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground pt-[var(--app-sat)]">
        <div className="flex items-center gap-4 px-4 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Contacter le support</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="bg-card rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Besoin d'aide ?</h2>
              <p className="text-sm text-muted-foreground">
                Notre équipe vous répond sous 24-48h
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-card rounded-2xl p-4 space-y-4">
            <div>
              <Label htmlFor="email" className="mb-2 block">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="category" className="mb-2 block">Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="account">Mon compte</SelectItem>
                  <SelectItem value="listing">Mes annonces</SelectItem>
                  <SelectItem value="payment">Paiements</SelectItem>
                  <SelectItem value="technical">Problème technique</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject" className="mb-2 block">Sujet</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Résumez votre demande"
              />
            </div>

            <div>
              <Label htmlFor="message" className="mb-2 block">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Décrivez votre problème en détail..."
                rows={5}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Envoyer le message
          </Button>
        </form>
      </div>
      </div>
    </>
  );
};

export default SupportPage;
