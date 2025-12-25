import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { TutorialProvider } from "@/hooks/useTutorial";
import { SplashScreen } from "@/components/SplashScreen";
import TutorialOverlay from "@/components/tutorial/TutorialOverlay";
import TutorialPrompt from "@/components/tutorial/TutorialPrompt";
import Index from "./pages/Index";
import MapPage from "./pages/MapPage";
import PublishPage from "./pages/PublishPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import PropertyDetail from "./pages/PropertyDetail";
import AuthPage from "./pages/AuthPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import MyListingsPage from "./pages/MyListingsPage";
import NotFound from "./pages/NotFound";
import EditProfilePage from "./pages/settings/EditProfilePage";
import ChangePasswordPage from "./pages/settings/ChangePasswordPage";
import SecuritySettingsPage from "./pages/settings/SecuritySettingsPage";
import NotificationSettingsPage from "./pages/settings/NotificationSettingsPage";
import RegionalSettingsPage from "./pages/settings/RegionalSettingsPage";
import HelpCenterPage from "./pages/settings/HelpCenterPage";
import SupportPage from "./pages/settings/SupportPage";
import LegalPage from "./pages/settings/LegalPage";
import LegalDetailPage from "./pages/settings/LegalDetailPage";
import AccountManagementPage from "./pages/settings/AccountManagementPage";
import AboutPage from "./pages/settings/AboutPage";
import FaqPage from "./pages/settings/FaqPage";
import VendorBadgesPage from "./pages/settings/VendorBadgesPage";
import PushNotificationTestPage from "./pages/settings/PushNotificationTestPage";
import AdminPage from "./pages/admin/AdminPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import FollowersPage from "./pages/FollowersPage";
import InstallPage from "./pages/InstallPage";
import DashboardPage from "./pages/DashboardPage";
import EditPropertyPage from "./pages/EditPropertyPage";
import NetworkStatusPage from "./pages/settings/NetworkStatusPage";
import ReservationPage from "./pages/ReservationPage";
import CreditsPage from "./pages/CreditsPage";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";
import { NotificationDeepLinkHandler } from "@/components/NotificationDeepLinkHandler";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TutorialProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <OfflineIndicator />
              {showSplash ? (
                <SplashScreen onComplete={handleSplashComplete} />
              ) : (
                <BrowserRouter>
                  <NotificationDeepLinkHandler />
                  <PushNotificationBanner />
                  <div className="min-h-screen bg-background">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<AuthPage />} />
                      <Route path="/verify-email" element={<VerifyEmailPage />} />
                      <Route path="/map" element={<MapPage />} />
                      <Route path="/publish" element={<PublishPage />} />
                      <Route path="/messages" element={<MessagesPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/my-listings" element={<MyListingsPage />} />
                      <Route path="/property/:id" element={<PropertyDetail />} />
                      <Route path="/property/:id/edit" element={<EditPropertyPage />} />
                      <Route path="/user/:userId" element={<PublicProfilePage />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/followers" element={<FollowersPage />} />
                      <Route path="/followers/:userId" element={<FollowersPage />} />
                      <Route path="/install" element={<InstallPage />} />
                      <Route path="/reservation/:id" element={<ReservationPage />} />
                      <Route path="/credits" element={<CreditsPage />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/admin" element={<AdminPage />} />
                      <Route path="/settings/edit-profile" element={<EditProfilePage />} />
                      <Route path="/settings/change-password" element={<ChangePasswordPage />} />
                      <Route path="/settings/security" element={<SecuritySettingsPage />} />
                      <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
                      <Route path="/settings/regional" element={<RegionalSettingsPage />} />
                      <Route path="/settings/help" element={<HelpCenterPage />} />
                      <Route path="/settings/support" element={<SupportPage />} />
                      <Route path="/settings/legal" element={<LegalPage />} />
                      <Route path="/settings/legal/:id" element={<LegalDetailPage />} />
                      <Route path="/settings/account" element={<AccountManagementPage />} />
                      <Route path="/settings/about" element={<AboutPage />} />
                      <Route path="/settings/faq" element={<FaqPage />} />
                      <Route path="/settings/badges" element={<VendorBadgesPage />} />
                      <Route path="/settings/push-test" element={<PushNotificationTestPage />} />
                      <Route path="/settings/network" element={<NetworkStatusPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <GlobalHeader />
                    <BottomNavigation />
                    <TutorialOverlay />
                    <TutorialPrompt />
                  </div>
                </BrowserRouter>
              )}
            </TooltipProvider>
          </TutorialProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
