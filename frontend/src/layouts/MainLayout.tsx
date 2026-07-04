import { Outlet, useNavigate, useLocation, useParams } from "react-router-dom";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Header } from "../components/Header";
import Billboard from "../components/Home/Billboard";
import UploadBox from "../components/Home/Upload";
import { useUser } from "../context/user";
import AccountSwitcherOverlay from "../components/Home/AccountSwitchOverlay";
import { useAccountSwitcherContext } from "../context/AccountSwitcherContext";
import { useGuestSession } from "../hooks/useGuestSession";
import FeedbackModal from "../components/Home/Feedback";
import { useAuthGate } from "../context/AuthGate";
import SidebarNavigation from "../components/Home/SidebarNavigation";
import MessagingComponent from "../components/Home/Message";
import ArticleRecommendations from "../components/Articles/ArticleRecommendations";
import { ScrollRestoration } from "react-router-dom";
import AmbientBackground from "../components/AmbientBackground";
import OrbBackground from "../components/OrbBacground";
import AuthGateModal from "../components/Auth/AuthGateModal";
import GuestSessionExpired from "../components/Auth/GuestSessionExpired";
import LegalModal from "../Pages/LegalModal";
import SettingsModal from "../components/SettingsModal";

const ProfileCover = lazy(() => import("../components/Home/Profile"));

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { canvasId } = useParams();
  const { user } = useUser();
  const { openGate } = useAuthGate();
  const { minutes } = useGuestSession();
  const {
    isOpen,
    anchorRect,
    closeAccountSwitcher,
  } = useAccountSwitcherContext();
  const [bannerShown, setBannerShown] = useState(false);
  const [feedLocked, setFeedLocked] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'paid' | null>(null);

  // Track both the open state AND which view to show
  const [settingsConfig, setSettingsConfig] = useState<{ isOpen: boolean, view: 'password' | 'delete'}>({
    isOpen: false,
    view: 'password'
  });

  const sidebarRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  const isProfilePage = location.pathname.startsWith("/profile");
  const isArticlePage = location.pathname.startsWith("/articles/");
  const isCreatePage = location.pathname === "/create";
  const isPostDetailsPage = location.pathname.startsWith("/post/");

  const isModelPost =
    isPostDetailsPage && location.state?.post?.type === "model_post";

  const handleUploadClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate("/create");
  };

  const handleWishlist = () => {
    navigate("/wishlist");
  };

  const hideBillboard =
    isModelPost || isCreatePage || isArticlePage;

  useEffect(() => {
    if (user) return;

    if (minutes >= 2 && !bannerShown) {
      setBannerShown(true);
      openGate(
        "Embed 3D models, play cloud game demos instantly (no downloads), code in your pocket, follow creators, and build your audience."
      );
    }
  }, [minutes, bannerShown, user, openGate]);

  useEffect(() => {
    if (user) return;

    if (minutes >= 5) {
      setFeedLocked(true);
    }
  }, [minutes, user]);

  if (feedLocked && !user) {
    return <GuestSessionExpired />;
  }

  return (
    <>
      <AmbientBackground />
      <OrbBackground />
      <AuthGateModal />
      <div className="min-h-screen bg-gray-100 dark:bg-transparent">
        <ScrollRestoration
          getKey={(location) => {
            if (location.pathname.startsWith("/profile")) {
              return "profile";
            }
            return location.pathname;
          }}
        />
        <Header />

        <main className="w-full px-0 sm:px-4 lg:px-8 2xl:px-16 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 2xl:grid-cols-16 2xl:gap-x-12">

            <div
              ref={sidebarRef}
              className="lg:col-span-2 2xl:col-span-3 hidden lg:block"
            >
              <div className="sticky top-20 space-y-3">
                <Suspense fallback={null}>
                  <ProfileCover onOpenWishlist={handleWishlist} />
                </Suspense>

                <SidebarNavigation
                  onOpenWishlist={handleWishlist}
                  onOpenSettings={(view) => setSettingsConfig({ isOpen: true, view })}
                />

                <UploadBox
                  onUploadClick={handleUploadClick}
                />

                <div className="px-2 pt-2 pb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <button
                    onClick={() => setActiveModal('terms')}
                    className="hover:text-gray-900 dark:hover:text-gray-200 hover:underline transition-colors"
                  >
                    Terms of Service
                  </button>
                  <span>|</span>
                  <button
                    onClick={() => setActiveModal('privacy')}
                    className="hover:text-gray-900 dark:hover:text-gray-200 hover:underline transition-colors"
                  >
                    Privacy Policy
                  </button>
                  <span>|</span>
                  <button
                    onClick={() => setActiveModal('paid')}
                    className="hover:text-gray-900 dark:hover:text-gray-200 hover:underline transition-colors"
                  >
                    Paid Services Policy
                  </button>
                  <span>|</span>
                  <button
                    onClick={() => setIsFeedbackOpen(true)}
                    className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline transition-colors font-medium"
                  >
                    Feedback
                  </button>
                  <span className="w-full mt-1">© {new Date().getFullYear()} Rigzer</span>
                </div>
              </div>
            </div>

            {isArticlePage ? (
              <>
                <div className="lg:col-span-7 2xl:col-span-9 flex flex-col items-stretch min-h-[80vh] w-full py-4">
                  <Outlet />
                </div>

                <div className="lg:col-span-3 2xl:col-span-4 hidden lg:block">
                  <div className="sticky top-20 space-y-6">
                    {canvasId && (
                      <ArticleRecommendations
                        currentCanvasId={canvasId}
                        onOpenArticle={(id) => navigate(`/articles/${id}`)}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  ref={centerRef}
                  className={`
                      flex flex-col w-full
                      ${hideBillboard
                      ? "lg:col-span-10 2xl:col-span-13"
                      : "lg:col-span-6 2xl:col-span-8"
                    }
                 `}
                >
                  <Outlet />
                </div>

                <div
                  className={`
                    hidden lg:block
                    ${hideBillboard
                      ? "lg:col-span-0 w-0 overflow-hidden pointer-events-none"
                      : "lg:col-span-4 2xl:col-span-5"
                    }
                  `}
                >
                  <div
                    className={`
                      sticky top-20
                      ${hideBillboard ? "h-0 overflow-hidden" : "h-[calc(100vh-5rem)]"}
                    `}
                  >
                    <Billboard />
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        <MessagingComponent />
        {isOpen && (
          <AccountSwitcherOverlay
            anchorRect={anchorRect}
            onClose={closeAccountSwitcher}
          />
        )}
        <SettingsModal
          isOpen={settingsConfig.isOpen}
          initialView={settingsConfig.view}
          onClose={() => setSettingsConfig(prev => ({ ...prev, isOpen: false }))}
          // onManageAccounts={openAccountSwitcher}
        />

        <LegalModal
          type={activeModal}
          onClose={() => setActiveModal(null)}
        />

        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
        />

      </div>
    </>
  );
}

export default MainLayout;