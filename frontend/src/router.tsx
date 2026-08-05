import { createBrowserRouter } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AdminRoute from "./components/Routing/AdminRoutes";
import GuestProtectedRoute from "./components/Routing/GuestProtectedRoute";

// Pages
import Home from "./Pages/Home";
import Auth from "./Pages/Auth";
import ProfilePageWrapper from "./components/Profile/ProfilePageWrapper";
import ArticleOverlay from "./Pages/ArticleView";
import CreatePostPage from "./Pages/CreatePostPage";
import WishlistPage from "./Pages/WishlistPage";
import GameShowcase from "./Pages/GameShowcase";
import UploadGame from "./Pages/UploadGame";
// import DevLogs from "./Pages/DevLogs";
import DevLogsView from "./Pages/DevLogViewPage";
import DevLogCanvas from "./Pages/DevlogCanvas";
import DevlogViewer from "./Pages/DevlogViewer";
import AdminPocketDashboard from "./Pages/AdminPocketDashboard";
import PostModal from "./components/PostModal";
import PostDetailsPage from "./Pages/PostDetailsPage";
import PlayGame from "./components/Home/PlayGame";
// import Puck from "./Pages/Puck";
import StreamPage from "./Pages/StreamPage";
import ForgotPassword from "./Pages/ForgotPassword";
import VerifyEmail from "./Pages/VerifyEmail";
import ResetPassword from "./Pages/ResetPassword";
import NotificationsPage from "./Pages/NotificationsPage";
import PublisherForm from "./Pages/PublisherForm";
import Analytics from "./Pages/Analytics";
import CreditOperations from "./Pages/CreditOperations";
import SessionMonitoringDashboard from "./Pages/SessionMonitoringDashboard";
import FeedbackPage from "./Pages/admin/FeedbackPage";
import AdminIntelligenceCenter from "./Pages/AdminIntelligenceCenter";
import SponsoredGamesAdmin from "./Pages/admin/SponsoredGames";

//Error Handling
import PageNotFound from "./Pages/ErrorHandling/PageNotFound";
import RouteErrorBoundary from "./RouteErrorBoundary";

// Components as pages
import ModelViewer from "./components/ModelViewer";
import GamePost from "./components/Home/GamePost";
import Recommendations from "./components/Recommendations";
import RecommendationPosts from "./components/Home/RecommendationPost";
import AdsPage from "./Pages/ads/AdsPage";
import GameSessionFeedbackModal from "./components/Feedback/GameSessionFeedbackModal";
import LoginForm from "./components/Auth/LoginForm";

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: "/", element: <Home /> },
          { path: "/search", element: <GuestProtectedRoute> <Home /> </GuestProtectedRoute> },
          { path: "/post/:postId", element:  <PostDetailsPage /> },
          { path: "/profile/:username", element: <GuestProtectedRoute> <ProfilePageWrapper /> </GuestProtectedRoute> },
          { path: "/articles/:canvasId", element: <GuestProtectedRoute> <ArticleOverlay /> </GuestProtectedRoute> },
          { path: "/create", element: <GuestProtectedRoute> <PostModal /> </GuestProtectedRoute> },
          { path: "/wishlist", element: <GuestProtectedRoute> <WishlistPage /> </GuestProtectedRoute> },
          { path: "/notifications", element: <GuestProtectedRoute> <NotificationsPage /> </GuestProtectedRoute> },
        ],
      },

      { path: "/auth", element: <Auth /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/verify-email", element: <VerifyEmail /> },
      { path: "/login", element: <LoginForm /> },

      { path: "/stream/:sessionId", element: <GuestProtectedRoute> <StreamPage /> </GuestProtectedRoute> },
      { path: "/publisher", element: <GuestProtectedRoute> <PublisherForm /> </GuestProtectedRoute> },
      { path: "/createpost", element: <GuestProtectedRoute> <CreatePostPage /> </GuestProtectedRoute> },
      { path: "/playgame", element: <GuestProtectedRoute> <PlayGame sessionId="" /> </GuestProtectedRoute> },

      // { path: "/devlogs", element: <DevLogs /> },
      { path: "/devlogs/view/:id", element: <GuestProtectedRoute> <DevLogsView /> </GuestProtectedRoute> },
      { path: "/devlogCanvas", element: <GuestProtectedRoute> <DevLogCanvas /> </GuestProtectedRoute> },
      { path: "/devlogviewer/:devlogId", element: <GuestProtectedRoute> <DevlogViewer /> </GuestProtectedRoute> },


      { path: "/models", element: <GuestProtectedRoute> <ModelViewer /> </GuestProtectedRoute> },
      { path: "/gameshow", element: <GuestProtectedRoute> <GameShowcase /> </GuestProtectedRoute> },
      { path: "/gameupload", element: <GuestProtectedRoute> <UploadGame /> </GuestProtectedRoute> },
      { path: "/games", element: <GuestProtectedRoute> <GamePost /> </GuestProtectedRoute> },

      // { path: "/puck", element: <Puck /> },
      { path: "/recommendations", element: <GuestProtectedRoute> <Recommendations /> </GuestProtectedRoute> },
      { path: "/recommendationsposts", element: <GuestProtectedRoute> <RecommendationPosts /> </GuestProtectedRoute> },

      { path: "/analytics", element: <GuestProtectedRoute> <Analytics /> </GuestProtectedRoute> },

      { path: "/ads", element: <GuestProtectedRoute> <AdsPage /> </GuestProtectedRoute> },

      // ── Test Route ─────────────────────────────────────────────────────────────
      {
        path: "/test-feedback",
        element: (
          <GameSessionFeedbackModal
            open={true}
            onClose={() => console.log("Modal closed")}
            gameName="Cyberpunk 2077"
            steamUrl="https://store.steampowered.com/app/1091500/Cyberpunk_2077/"
            playTimeMs={3600000}
          />
        ),
      },

      // ── Admin routes ───────────────────────────────────────────────────────────
      // AdminRoute checks:  not logged in → /login?next=…  |  not admin → 403 page
      // Real security is enforced by isAdmin middleware on every /api/admin/* and
      // /api/pockets/pending|review|eligibility endpoint — never trust this alone.
      {
        path: "/admin/pockets",
        element: (
          <AdminRoute>
            <AdminPocketDashboard />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/feedback",
        element: (
          <AdminRoute>
            <FeedbackPage />
          </AdminRoute>
        ),
      },
      { path: "/admin/analytics/:creatorId", element: <Analytics /> },
      {
        path: "/admin/credits",
        element: (
          <AdminRoute>
            <CreditOperations />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/sessionsMonitoring",
        element: (
          <AdminRoute>
            <SessionMonitoringDashboard />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/intelligence",
        element: (
          <AdminRoute>
            <AdminIntelligenceCenter />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/sponsored-games",
        element: (
          <AdminRoute>
            <SponsoredGamesAdmin />
          </AdminRoute>
        ),
      },

      {
        path: "*",
        element: <PageNotFound />,
      },
    ],
  },
]);    