import { Routes, Route } from "react-router-dom";
import { useEffect, Suspense, lazy } from "react";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ErrorBoundary from "./components/common/ErrorBoundary";
import useAuthToken from "./hooks/useAuthToken"; // Importar el nuevo hook
import { ENV } from "./config/env";
import { localDB } from "./services/localDB";
import { Auth0TestPage } from "./pages/Auth0Test";
import Auth0DebugPage from "./pages/Auth0Debug";
import AuthCallback from "./pages/AuthCallback";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./layout/AppLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
// Auth pages
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import TwoStepVerification from "./pages/AuthPages/TwoStepVerification";
// Admin pages (La Cajita)
import Lchome from "./screens/home";
import Categories from "./screens/categories";
import Playlist from "./screens/playlist";
import PlaylistPoster from "./screens/playlistposter";
import Seasons from "./screens/seasons";
import TempVideos from "./screens/tempvideos";
// Dashboard pages
const Ecommerce = lazy(() => import("./pages/Dashboard/Ecommerce"));
const Analytics = lazy(() => import("./pages/Dashboard/Analytics"));
import Marketing from "./pages/Dashboard/Marketing";
import Crm from "./pages/Dashboard/Crm";
const Stocks = lazy(() => import("./pages/Dashboard/Stocks"));
import Saas from "./pages/Dashboard/Saas";
// Others
import UserProfiles from "./pages/UserProfiles";
import Calendar from "./pages/Calendar";
import Invoices from "./pages/Invoices";
import Faqs from "./pages/Faqs";
import PricingTables from "./pages/PricingTables";
import ApiTestComponent from "./pages/Testing/ApiTestComponent";
import ApiTest from "./components/testing/ApiConnectionTest";
import SecuritySettings from "./pages/SecuritySettings";
import JWPlayerVideos from "./pages/Content/JWPlayerVideos";
import JWPlayerConfig from "./pages/Content/JWPlayerConfig";
import RealContentManager from "./pages/Content/RealContentManager";
// RealVideosPage no existe en este proyecto, se omite su ruta
import VideoManager from "./pages/Content/VideoManager";
import VideosConfig from "./pages/Content/VideosConfig";
import SeasonManager from "./pages/Content/SeasonManager";
// SeasonsPage / SegmentsPage no existen; usar managers disponibles
import SegmentManager from "./pages/Content/SegmentManager";
const HomeCarouselManager = lazy(() => import("./pages/Content/HomeCarouselManager"));
import VideoViewerPage from "./pages/Content/VideoViewerPage";
// JWPlayerTestPage no existe; omitir si no se usa
import Blank from "./pages/Blank";
import FormElements from "./pages/Forms/FormElements";
import FormLayout from "./pages/Forms/FormLayout";
import Chats from "./pages/Chat/Chats";
import TaskList from "./pages/Task/TaskList";
import TaskKanban from "./pages/Task/TaskKanban";
import FileManager from "./pages/FileManager";
import EmailInbox from "./pages/Email/EmailInbox";
import EmailDetails from "./pages/Email/EmailDetails";
import BasicTables from "./pages/Tables/BasicTables";
import DataTables from "./pages/Tables/DataTables";
import Alerts from "./pages/UiElements/Alerts";
import Avatars from "./pages/UiElements/Avatars";
import Badges from "./pages/UiElements/Badges";
import BreadCrumb from "./pages/UiElements/BreadCrumb";
import Buttons from "./pages/UiElements/Buttons";
import ButtonsGroup from "./pages/UiElements/ButtonsGroup";
import Cards from "./pages/UiElements/Cards";
import Carousel from "./pages/UiElements/Carousel";
import Dropdowns from "./pages/UiElements/Dropdowns";
import Images from "./pages/UiElements/Images";
import Links from "./pages/UiElements/Links";
import Lists from "./pages/UiElements/Lists";
import Modals from "./pages/UiElements/Modals";
import Notifications from "./pages/UiElements/Notifications";
import Pagination from "./pages/UiElements/Pagination";
import Popovers from "./pages/UiElements/Popovers";
import Progressbar from "./pages/UiElements/Progressbar";
import Ribbons from "./pages/UiElements/Ribbons";
import Spinners from "./pages/UiElements/Spinners";
import Tabs from "./pages/UiElements/Tabs";
import Tooltips from "./pages/UiElements/Tooltips";
import Videos from "./pages/UiElements/Videos";
// Charts
const LineChart = lazy(() => import("./pages/Charts/LineChart"));
const BarChart = lazy(() => import("./pages/Charts/BarChart"));
const PieChart = lazy(() => import("./pages/Charts/PieChart"));
// Fallbacks
import Maintenance from "./pages/OtherPage/Maintenance";
import Success from "./pages/OtherPage/Success";
import FiveZeroZero from "./pages/OtherPage/FiveZeroZero";
import FiveZeroThree from "./pages/OtherPage/FiveZeroThree";
import NotFound from "./pages/OtherPage/NotFound";
// Tests auxiliares
import LoginTest from "./components/LoginTest";
import Auth0LoginTest from "./components/Auth0LoginTest";

function AppContent() {
  // Obtener token de Auth0 y guardarlo en localStorage
  useAuthToken();
  // Inicializar base de datos local al cargar la app
  useEffect(() => {
    console.log("🔄 Inicializando aplicación...");

    // Validar configuración
    if (!ENV.API_BASE_URL) {
      console.error("❌ API_BASE_URL no está configurada");
    }

    // Inicializar base de datos local
  localDB.init().catch((error: unknown) => {
      console.error("❌ Error inicializando base de datos local:", error);
    });

    console.log("✅ Aplicación inicializada");
  }, []);

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<div className="p-6">Cargando...</div>}>
        <Routes>
        {/* Ruta raíz que maneja la redirección */}
        <Route path="/" element={<SignIn />} />

        {/* Auth Layout - Rutas públicas */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/two-step-verification"
          element={<TwoStepVerification />}
        />
        <Route path="/test-api" element={<ApiTest />} />
        <Route path="/test-login" element={<LoginTest />} />
        <Route path="/test-auth0" element={<Auth0LoginTest />} />
        <Route path="/auth0-flow" element={<Auth0TestPage />} />
        <Route path="/auth0-debug" element={<Auth0DebugPage />} />
  <Route path="/callback" element={<AuthCallback />} />

        {/*start la cajita */}

        <Route
          path="/lchome"
          element={
            <AppLayout>
              <Lchome />
            </AppLayout>
          }
        />
        <Route
          path="/lccategories"
          element={
            <AppLayout>
              <Categories />
            </AppLayout>
          }
        />
        <Route
          path="/lcplaylist"
          element={
            <AppLayout>
              <Playlist />
            </AppLayout>
          }
        />
        <Route
          path="/lcplaylistposter"
          element={
            <AppLayout>
              <PlaylistPoster />
            </AppLayout>
          }
        />
        <Route
          path="/lcseasons"
          element={
            <AppLayout>
              <Seasons />
            </AppLayout>
          }
        />
        <Route
          path="/lctempvideos"
          element={
            <AppLayout>
              <TempVideos />
            </AppLayout>
          }
        />
        {/*end   */}

        {/* Dashboard Layout - Rutas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              <AppLayout>
                <Ecommerce />
              </AppLayout>
            }
          />
          <Route
            path="/analytics"
            element={
              <AppLayout>
                <Analytics />
              </AppLayout>
            }
          />
          <Route
            path="/marketing"
            element={
              <AppLayout>
                <Marketing />
              </AppLayout>
            }
          />
          <Route
            path="/crm"
            element={
              <AppLayout>
                <Crm />
              </AppLayout>
            }
          />
          <Route
            path="/stocks"
            element={
              <AppLayout>
                <Stocks />
              </AppLayout>
            }
          />
          <Route
            path="/saas"
            element={
              <AppLayout>
                <Saas />
              </AppLayout>
            }
          />

          {/* Others Page */}
          <Route
            path="/profile"
            element={
              <AppLayout>
                <UserProfiles />
              </AppLayout>
            }
          />
          <Route
            path="/calendar"
            element={
              <AppLayout>
                <Calendar />
              </AppLayout>
            }
          />
          <Route
            path="/invoice"
            element={
              <AppLayout>
                <Invoices />
              </AppLayout>
            }
          />
          <Route
            path="/faq"
            element={
              <AppLayout>
                <Faqs />
              </AppLayout>
            }
          />
          <Route
            path="/pricing-tables"
            element={
              <AppLayout>
                <PricingTables />
              </AppLayout>
            }
          />
          <Route
            path="/api-test"
            element={
              <AppLayout>
                <ApiTestComponent />
              </AppLayout>
            }
          />
          <Route
            path="/api-debug"
            element={
              <AppLayout>
                <ApiTest />
              </AppLayout>
            }
          />
          <Route
            path="/security"
            element={
              <AppLayout>
                <SecuritySettings />
              </AppLayout>
            }
          />
          {/* Users route removida: componente no encontrado */}

          {/* Content Management */}
          <Route
            path="/videos"
            element={
              <AppLayout>
                <JWPlayerVideos />
              </AppLayout>
            }
          />
          <Route
            path="/videos-config"
            element={
              <AppLayout>
                <JWPlayerConfig />
              </AppLayout>
            }
          />
          <Route
            path="/api-content"
            element={
              <AppLayout>
                <RealContentManager />
              </AppLayout>
            }
          />
          {/* RealVideosPage no presente */}
          <Route
            path="/playlists"
            element={
              <AppLayout>
                <Playlist />
              </AppLayout>
            }
          />
          <Route
            path="/videos"
            element={
              <AppLayout>
                <VideoManager />
              </AppLayout>
            }
          />
          <Route
            path="/videos-config"
            element={
              <AppLayout>
                <VideosConfig />
              </AppLayout>
            }
          />
          <Route
            path="/seasons"
            element={
              <AppLayout>
                <SeasonManager />
              </AppLayout>
            }
          />
          {/* SeasonsPage no presente, usar /seasons de manager arriba */}
          <Route
            path="/segments"
            element={
              <AppLayout>
                <SegmentManager />
              </AppLayout>
            }
          />
          {/* SegmentsPage no presente */}
          <Route
            path="/carousel"
            element={
              <AppLayout>
                <HomeCarouselManager />
              </AppLayout>
            }
          />
          <Route
            path="/video-viewer"
            element={
              <AppLayout>
                <VideoViewerPage />
              </AppLayout>
            }
          />
          {/* JWPlayerTestPage no presente */}

          <Route
            path="/blank"
            element={
              <AppLayout>
                <Blank />
              </AppLayout>
            }
          />

          {/* Forms */}
          <Route
            path="/form-elements"
            element={
              <AppLayout>
                <FormElements />
              </AppLayout>
            }
          />
          <Route
            path="/form-layout"
            element={
              <AppLayout>
                <FormLayout />
              </AppLayout>
            }
          />

          {/* Applications */}
          <Route
            path="/chat"
            element={
              <AppLayout>
                <Chats />
              </AppLayout>
            }
          />

          <Route
            path="/task-list"
            element={
              <AppLayout>
                <TaskList />
              </AppLayout>
            }
          />
          <Route
            path="/task-kanban"
            element={
              <AppLayout>
                <TaskKanban />
              </AppLayout>
            }
          />
          <Route
            path="/file-manager"
            element={
              <AppLayout>
                <FileManager />
              </AppLayout>
            }
          />

          {/* Email */}
          <Route
            path="/inbox"
            element={
              <AppLayout>
                <EmailInbox />
              </AppLayout>
            }
          />
          <Route
            path="/inbox-details"
            element={
              <AppLayout>
                <EmailDetails />
              </AppLayout>
            }
          />

          {/* Tables */}
          <Route
            path="/basic-tables"
            element={
              <AppLayout>
                <BasicTables />
              </AppLayout>
            }
          />
          <Route
            path="/data-tables"
            element={
              <AppLayout>
                <DataTables />
              </AppLayout>
            }
          />

          {/* Ui Elements */}
          <Route
            path="/alerts"
            element={
              <AppLayout>
                <Alerts />
              </AppLayout>
            }
          />
          <Route
            path="/avatars"
            element={
              <AppLayout>
                <Avatars />
              </AppLayout>
            }
          />
          <Route
            path="/badge"
            element={
              <AppLayout>
                <Badges />
              </AppLayout>
            }
          />
          <Route
            path="/breadcrumb"
            element={
              <AppLayout>
                <BreadCrumb />
              </AppLayout>
            }
          />
          <Route
            path="/buttons"
            element={
              <AppLayout>
                <Buttons />
              </AppLayout>
            }
          />
          <Route
            path="/buttons-group"
            element={
              <AppLayout>
                <ButtonsGroup />
              </AppLayout>
            }
          />
          <Route
            path="/cards"
            element={
              <AppLayout>
                <Cards />
              </AppLayout>
            }
          />
          <Route
            path="/carousel"
            element={
              <AppLayout>
                <Carousel />
              </AppLayout>
            }
          />
          <Route
            path="/dropdowns"
            element={
              <AppLayout>
                <Dropdowns />
              </AppLayout>
            }
          />
          <Route
            path="/images"
            element={
              <AppLayout>
                <Images />
              </AppLayout>
            }
          />
          <Route
            path="/links"
            element={
              <AppLayout>
                <Links />
              </AppLayout>
            }
          />
          <Route
            path="/list"
            element={
              <AppLayout>
                <Lists />
              </AppLayout>
            }
          />
          <Route
            path="/modals"
            element={
              <AppLayout>
                <Modals />
              </AppLayout>
            }
          />
          <Route
            path="/notifications"
            element={
              <AppLayout>
                <Notifications />
              </AppLayout>
            }
          />
          <Route
            path="/pagination"
            element={
              <AppLayout>
                <Pagination />
              </AppLayout>
            }
          />
          <Route
            path="/popovers"
            element={
              <AppLayout>
                <Popovers />
              </AppLayout>
            }
          />
          <Route
            path="/progress-bar"
            element={
              <AppLayout>
                <Progressbar />
              </AppLayout>
            }
          />
          <Route
            path="/ribbons"
            element={
              <AppLayout>
                <Ribbons />
              </AppLayout>
            }
          />
          <Route
            path="/spinners"
            element={
              <AppLayout>
                <Spinners />
              </AppLayout>
            }
          />
          <Route
            path="/tabs"
            element={
              <AppLayout>
                <Tabs />
              </AppLayout>
            }
          />
          <Route
            path="/tooltips"
            element={
              <AppLayout>
                <Tooltips />
              </AppLayout>
            }
          />
          <Route
            path="/videos"
            element={
              <AppLayout>
                <Videos />
              </AppLayout>
            }
          />

          {/* Charts */}
          <Route
            path="/line-chart"
            element={
              <AppLayout>
                <LineChart />
              </AppLayout>
            }
          />
          <Route
            path="/bar-chart"
            element={
              <AppLayout>
                <BarChart />
              </AppLayout>
            }
          />
          <Route
            path="/pie-chart"
            element={
              <AppLayout>
                <PieChart />
              </AppLayout>
            }
          />
        </Route>

        {/* Fallback Routes */}
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/success" element={<Success />} />
        <Route path="/five-zero-zero" element={<FiveZeroZero />} />
        <Route path="/five-zero-three" element={<FiveZeroThree />} />
  {/* ComingSoon no presente */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}
