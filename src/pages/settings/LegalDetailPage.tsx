import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface LegalContent {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  updated_by: string | null;
}

const defaultContent: Record<string, { title: string; content: string }> = {
  terms: {
    title: "Conditions d'utilisation",
    content: "Contenu par défaut des conditions d'utilisation..."
  },
  privacy: {
    title: "Politique de confidentialité",
    content: "Contenu par défaut de la politique de confidentialité..."
  },
  community: {
    title: "Règles de la communauté",
    content: "Contenu par défaut des règles de la communauté..."
  },
  'child-safety': {
    title: "Sécurité et protection des mineurs",
    content: "Contenu par défaut de la politique de protection des mineurs..."
  }
};

const LegalDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAdmin();
  
  const [content, setContent] = useState<LegalContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchContent();
    }
  }, [id]);

  const fetchContent = async () => {
    if (!id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('legal_content')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      // Use default content if not found in database
      const fallback = defaultContent[id];
      if (fallback) {
        setContent({
          id,
          title: fallback.title,
          content: fallback.content,
          updated_at: new Date().toISOString(),
          updated_by: null
        });
      }
    } else {
      setContent(data);
    }
    setLoading(false);
  };

  const handleEdit = () => {
    if (content) {
      setEditTitle(content.title);
      setEditContent(content.content);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!id || !content) return;
    
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('legal_content')
      .upsert({
        id,
        title: editTitle,
        content: editContent,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      });

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
    } else {
      toast.success('Contenu sauvegardé avec succès');
      setContent({
        ...content,
        title: editTitle,
        content: editContent,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null
      });
      setIsEditing(false);
    }
    
    setSaving(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Page non trouvée</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground pt-[var(--app-sat)]">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">{isEditing ? 'Modifier' : content.title}</h1>
          </div>
          
          {isAdmin && !isEditing && (
            <Button
              onClick={handleEdit}
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Modifier
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="bg-card rounded-2xl p-4">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Titre</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Titre de la page"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Contenu (Markdown)</label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Contenu en format Markdown..."
                  className="min-h-[500px] font-mono text-sm"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Sauvegarder
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={saving}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {content.content.split('\n').map((line, index) => {
                // Handle ### headings
                if (line.startsWith('### ')) {
                  return <h3 key={index} className="text-base font-semibold mt-3 mb-1">{line.replace('### ', '')}</h3>;
                }
                if (line.startsWith('# ')) {
                  return <h1 key={index} className="text-xl font-bold mt-4 mb-2">{line.replace('# ', '')}</h1>;
                }
                if (line.startsWith('## ')) {
                  return <h2 key={index} className="text-lg font-semibold mt-4 mb-2">{line.replace('## ', '')}</h2>;
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={index} className="font-semibold">{line.replace(/\*\*/g, '')}</p>;
                }
                if (line.startsWith('- ')) {
                  return <li key={index} className="ml-4">{line.replace('- ', '')}</li>;
                }
                if (line.startsWith('✅') || line.startsWith('❌')) {
                  return <p key={index} className="font-medium">{line}</p>;
                }
                if (line.trim() === '') {
                  return <br key={index} />;
                }
                // Handle bold text inline
                if (line.includes('**')) {
                  const parts = line.split(/\*\*(.*?)\*\*/g);
                  return (
                    <p key={index} className="text-muted-foreground">
                      {parts.map((part, i) => 
                        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                      )}
                    </p>
                  );
                }
                return <p key={index} className="text-muted-foreground">{line}</p>;
              })}
            </div>
          )}
        </div>
        
        {content.updated_at && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Dernière mise à jour : {new Date(content.updated_at).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  );
};

export default LegalDetailPage;
