import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RegisterPage } from "./pages/RegisterPage";
import { LoginPage } from "./pages/LoginPage";
import { RequestsPage } from "./pages/RequestsPage";
import { RequestDetailsPage } from "./pages/RequestDetailsPage";
import { RequestEditPage } from "./pages/RequestEditPage";
import { CreateRequestPage } from "./pages/CreateRequestPage";
import { ProfilePage } from "./pages/ProfilePage";
import { EditProfilePage } from "./pages/EditProfilePage";
import { MyBadgesPage } from "./pages/MyBadgesPage";
import { BadgeLeaderboardPage } from "./pages/BadgeLeaderboardPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { BadgeNotification } from "./components/badges/BadgeNotification";
import { initializeTokenRefresh } from "./services/api";
import { useBadgeNotifications } from "./hooks/useBadgeNotifications";

function App() {
  const { newBadges, dismissBadge } = useBadgeNotifications();

  useEffect(() => {
    // Initialize proactive token refresh on app mount
    initializeTokenRefresh();
  }, []);

  return (
    <>
      {newBadges.map((badge, index) => (
        <BadgeNotification
          key={badge.id}
          badge={badge}
          onClose={() => dismissBadge(badge.id)}
        />
      ))}
      <Routes>
      {/* Public routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        {/* Main requests */}
        <Route path="/requests" element={<RequestsPage />} />

        {/* Request management routes */}
        <Route path="/requests/new" element={<CreateRequestPage />} />
        <Route path="/requests/:id" element={<RequestDetailsPage />} />
        <Route path="/requests/:id/edit" element={<RequestEditPage />} />

        {/* Profile routes */}
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/profile/:id/edit" element={<EditProfilePage />} />

        {/* Badge routes */}
        <Route path="/badges" element={<MyBadgesPage />} />
        <Route path="/leaderboard" element={<BadgeLeaderboardPage />} />
      </Route>

      {/* Fallback for unknown routes */}
      <Route path="*" element={<Navigate to="/requests" replace />} />
    </Routes>
    </>
  );
}

export default App;
