import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Fingerprint, Eye, EyeOff, UserX, Smartphone, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const SecuritySettingsPage = () => {
  const navigate = useNavigate();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [profilePublic, setProfilePublic] = useState(true);

  return (
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
          <h1 className="text-xl font-bold">Sécurité & Confidentialité</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Two-Factor Authentication */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Authentification à deux facteurs
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Activer la 2FA</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recevez un code par SMS lors de la connexion
                </p>
              </div>
              <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
            </div>
            {twoFactorEnabled && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-sm text-green-700 dark:text-green-400">
                  ✓ La 2FA est activée sur votre compte
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Biometric */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              Authentification biométrique
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Face ID / Touch ID</p>
                  <p className="text-xs text-muted-foreground">
                    Déverrouiller avec la biométrie
                  </p>
                </div>
              </div>
              <Switch checked={biometricEnabled} onCheckedChange={setBiometricEnabled} />
            </div>
          </div>
        </div>

        {/* Profile Visibility */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              {profilePublic ? <Eye className="w-5 h-5 text-primary" /> : <EyeOff className="w-5 h-5 text-primary" />}
              Visibilité du profil
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Profil public</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Les autres utilisateurs peuvent voir votre profil
                </p>
              </div>
              <Switch checked={profilePublic} onCheckedChange={setProfilePublic} />
            </div>
          </div>
        </div>

        {/* Blocked Users */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <UserX className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium text-sm">Utilisateurs bloqués</p>
                <p className="text-xs text-muted-foreground">
                  Gérer la liste des utilisateurs bloqués
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">0</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </button>
        </div>

        {/* Password */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <button 
            onClick={() => navigate('/settings/change-password')}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium text-sm">Changer le mot de passe</p>
                <p className="text-xs text-muted-foreground">
                  Mettre à jour votre mot de passe
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsPage;
