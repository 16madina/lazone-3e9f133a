import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, User, Mail, Phone, MapPin, Image } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { africanCountries } from '@/data/africanCountries';
import { useCamera, isNativePlatform } from '@/hooks/useNativePlugins';
import { SEOHead } from '@/components/SEOHead';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile, refreshVerificationStatus } = useAuth();
  const { takePicture, pickFromGallery, loading: cameraLoading } = useCamera();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    phone: user?.user_metadata?.phone || '',
    country: user?.user_metadata?.country || '',
    city: user?.user_metadata?.city || '',
  });

  const uploadAvatarFromFile = async (file: File) => {
    if (!user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await refreshVerificationStatus();
      toast({ title: 'Photo mise à jour avec succès' });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadAvatarFromFile(file);
    }
  };

  const handleTakePhoto = async () => {
    const photo = await takePicture();
    if (photo?.webPath) {
      // Fetch the image and convert to blob
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await uploadAvatarFromFile(file);
    }
  };

  const handlePickFromGallery = async () => {
    const photo = await pickFromGallery();
    if (photo?.webPath) {
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await uploadAvatarFromFile(file);
    }
  };

  const handleAvatarClick = () => {
    if (isNativePlatform()) {
      // On native, the dropdown menu handles the actions
      return;
    }
    // On web, trigger file input
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          phone: formData.phone,
          country: formData.country,
          city: formData.city,
        }
      });

      if (authError) throw authError;

      // Update profile table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: formData.fullName, phone: formData.phone })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      await refreshVerificationStatus();
      toast({ title: 'Profil mis à jour avec succès' });
      navigate('/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const selectedCountry = africanCountries.find(c => c.name === formData.country);
  const cities = selectedCountry?.cities || [];

  return (
    <>
      <SEOHead 
        title="Modifier le profil"
        description="Modifiez vos informations de profil sur LaZone."
        canonical="/settings/edit-profile"
        noindex
      />
      <div className="min-h-screen bg-muted/30 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-4 px-4 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Modifier le profil</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Avatar */}
        <div className="flex justify-center mb-6">
          {isNativePlatform() ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative cursor-pointer">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-card shadow-lg">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <User className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground">
                    {uploadingAvatar || cameraLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={handleTakePhoto} className="gap-2">
                  <Camera className="w-4 h-4" />
                  Prendre une photo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePickFromGallery} className="gap-2">
                  <Image className="w-4 h-4" />
                  Choisir de la galerie
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <label className="relative cursor-pointer">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-card shadow-lg">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <User className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground">
                {uploadingAvatar ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploadingAvatar}
              />
            </label>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-card rounded-2xl p-4 space-y-4">
            <div>
              <Label htmlFor="fullName" className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4" />
                Nom complet
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Votre nom complet"
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                L'email ne peut pas être modifié
              </p>
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4" />
                Téléphone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+221 77 123 45 67"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" />
                Pays
              </Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value, city: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un pays" />
                </SelectTrigger>
                <SelectContent>
                  {africanCountries.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.flag} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {cities.length > 0 && (
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4" />
                  Ville
                </Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => setFormData({ ...formData, city: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une ville" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Enregistrer les modifications
          </Button>
        </form>
      </div>
      </div>
    </>
  );
};

export default EditProfilePage;
