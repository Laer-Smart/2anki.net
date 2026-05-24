import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { lazy, ReactElement, useState } from 'react';
import { HelmetProvider } from 'react-helmet-async';

import { useCookies, CookiesProvider } from 'react-cookie';
import UploadPage from './pages/UploadPage';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage/AboutPage';

import isOfflineMode from './lib/isOfflineMode';
import DebugPage from './pages/DebugPage';
import { ContactPage } from './pages/ContactPage/ContactPage';
import FavoritesPage from './pages/FavoritesPage';
import { AppShell } from './components/AppShell/AppShell';
import DeleteAccountPage from './pages/DeleteAccountPage';
import { getErrorMessage } from './components/errors/helpers/getErrorMessage';
import { reportClientError } from './lib/reportClientError';
import { useUserLocals } from './lib/hooks/useUserLocals';
import { SkeletonPage } from './components/Skeleton/Skeleton';
import NotFoundPage from './pages/NotFoundPage';

const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NewPasswordPage = lazy(() => import('./pages/NewPasswordPage'));
const DownloadsPage = lazy(() => import('./pages/DownloadsPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const AccountPage = lazy(() => import('./pages/AccountPage/AccountPage'));
const SuccessfulCheckoutPage = lazy(
  () => import('./pages/SuccessfulCheckout/SuccessfulCheckout')
);
const DocsPage = lazy(() => import('./pages/DocsPage/DocsPage'));
const CardOptionsPage = lazy(() => import('./pages/CardOptionsPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const TemplatesEditorPage = lazy(
  () => import('./pages/TemplatesPage/EditorPage')
);
const RulesPage = lazy(() => import('./pages/RulesPage'));
const PreviewPage = lazy(() => import('./pages/PreviewPage'));
const DatabasePreviewPage = lazy(() => import('./pages/DatabasePreviewPage'));
const PreviewApkgPage = lazy(() => import('./pages/PreviewApkgPage'));
const AnkifyPage = lazy(() => import('./pages/AnkifyPage'));
const AnkifySetupPage = lazy(
  () => import('./pages/AnkifyPage/AnkifySetupPage')
);
const AnkifyHistoryPage = lazy(
  () => import('./pages/AnkifyPage/AnkifyHistoryPage')
);
const OpsLayout = lazy(() => import('./pages/OpsPage/OpsLayout'));
const EngineeringTab = lazy(() => import('./pages/OpsPage/EngineeringTab'));
const ErrorsTab = lazy(() => import('./pages/OpsPage/ErrorsTab'));
const PerformanceTab = lazy(() => import('./pages/OpsPage/PerformanceTab'));
const ConversionsTab = lazy(() => import('./pages/OpsPage/ConversionsTab'));
const BusinessTab = lazy(() => import('./pages/OpsPage/BusinessTab'));
const ShowcaseTab = lazy(() => import('./pages/OpsPage/ShowcaseTab'));
const InterviewsTab = lazy(() => import('./pages/OpsPage/InterviewsTab'));
const ContactMessagesTab = lazy(() => import('./pages/OpsPage/ContactMessagesTab'));
const CommandsTab = lazy(() => import('./pages/OpsPage/CommandsTab'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage/FeedbackPage'));
const NotionToAnki = lazy(() => import('./pages/LandingPage/NotionToAnki'));
const AnkiToNotion = lazy(() => import('./pages/LandingPage/AnkiToNotion'));
const QuizletToAnki = lazy(() => import('./pages/LandingPage/QuizletToAnki'));
const MarkdownToAnki = lazy(
  () => import('./pages/LandingPage/MarkdownToAnki')
);
const PdfToAnki = lazy(() => import('./pages/LandingPage/PdfToAnki'));
const UsmleAnki = lazy(() => import('./pages/LandingPage/UsmleAnki'));
const NursingFlashcards = lazy(
  () => import('./pages/LandingPage/NursingFlashcards')
);
const AnkiFromMedicalLectureSlides = lazy(
  () => import('./pages/LandingPage/AnkiFromMedicalLectureSlides')
);
const ConvertLandingPage = lazy(
  () => import('./pages/ConvertLandingPage/ConvertLandingPage')
);
const MagicLinkPage = lazy(() => import('./pages/MagicLinkPage'));
const PrintPage = lazy(() => import('./pages/PrintPage'));
const WhatsNewPage = lazy(() => import('./pages/WhatsNewPage/WhatsNewPage'));
const ImportPage = lazy(() => import('./pages/ImportPage'));
const ImageOcclusionPage = lazy(() =>
  import('./pages/ImageOcclusionPage').then((m) => ({
    default: m.ImageOcclusionPage,
  }))
);
const PhotoToFlashcardsPage = lazy(() =>
  import('./pages/PhotoToFlashcardsPage').then((m) => ({
    default: m.PhotoToFlashcardsPage,
  }))
);
const ChatPage = lazy(() => import('./pages/Chat/ChatPage'));
const NotionLandingPage = lazy(() => import('./pages/NotionLandingPage/NotionLandingPage'));
const AnswersPage = lazy(() => import('./pages/AnswersPage/AnswersPage'));
const LimitPage = lazy(() => import('./pages/LimitPage/LimitPage'));
const SharedDeckPage = lazy(() => import('./pages/SharedDeckPage'));
const MindmapsPage = lazy(() => import('./pages/MindmapsPage'));

const queryClient = new QueryClient();

function RequireAuth({
  isLoggedIn,
  isLoading,
  children,
}: Readonly<{
  isLoggedIn: boolean;
  isLoading: boolean;
  children: ReactElement;
}>) {
  if (isLoading) {
    return <SkeletonPage />;
  }
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppContent({
  error,
  setErrorMessage,
}: Readonly<{
  error: Error | null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setErrorMessage: (error: unknown) => void;
}>) {
  const { data, isLoading, refetch } = useUserLocals();
  const isLoggedIn = isLoading ? undefined : !!data?.user?.id;
  const isLoggedInResolved = isLoggedIn === true;

  const requireAuth = (element: ReactElement) => (
    <RequireAuth isLoggedIn={isLoggedInResolved} isLoading={isLoading}>
      {element}
    </RequireAuth>
  );

  return (
    <BrowserRouter>
      <AppShell
        error={error}
        isLoggedIn={isLoggedIn}
        email={data?.user?.email}
        locals={data?.locals == null ? data?.locals : { ...data.locals, trial_started_at: data?.user?.trial_started_at ?? null, autoSyncActive: data?.autoSyncActive === true }}
        features={data?.features}
      >
        <Routes>
          <Route
            path="/favorites"
            element={requireAuth(
              <FavoritesPage setError={setErrorMessage} />
            )}
          />
          <Route
            path="/downloads"
            element={requireAuth(
              <DownloadsPage setError={setErrorMessage} />
            )}
          />
          <Route
            path="/uploads"
            element={<Navigate to="/downloads" replace />}
          />
          <Route
            path="/upload"
            element={<UploadPage setErrorMessage={setErrorMessage} />}
          />
          <Route path="/print" element={<PrintPage />} />
          <Route path="/image-occlusion" element={<ImageOcclusionPage />} />
          <Route path="/photo-to-deck" element={requireAuth(<PhotoToFlashcardsPage />)} />
          <Route path="/mindmaps" element={requireAuth(<MindmapsPage />)} />
          <Route path="/mindmaps/:id" element={requireAuth(<MindmapsPage />)} />
          <Route path="/chat" element={requireAuth(<ChatPage />)} />
          <Route
            path="/register"
            element={<RegisterPage setErrorMessage={setErrorMessage} />}
          />
          <Route
            path="/notion"
            element={requireAuth(
              <SearchPage setError={setErrorMessage} />
            )}
          />
          <Route
            path="/search"
            element={<Navigate to="/notion" replace />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/magic" element={<MagicLinkPage />} />
          <Route
            path="/forgot"
            element={<ForgotPasswordPage setErrorMessage={setErrorMessage} />}
          />
          <Route
            path="/users/r/:id"
            element={<NewPasswordPage setErrorMessage={setErrorMessage} />}
          />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route
            path="/delete-account"
            element={requireAuth(
              <DeleteAccountPage setError={setErrorMessage} />
            )}
          />
          <Route
            path="/pricing"
            element={
              <PricingPage
                isLoggedIn={isLoggedInResolved}
                email={data?.user?.email}
                hostedAnkiRequested={data?.hostedAnkiRequested === true}
                trialStartedAt={data?.user?.trial_started_at ?? null}
                patreon={data?.user?.patreon ?? null}
                signupCountry={data?.user?.signup_country ?? null}
                autoSyncCapReached={data?.autoSyncCapReached === true}
                autoSyncActive={data?.autoSyncActive === true}
                onTrialStarted={() => { refetch(); }}
              />
            }
          />
          <Route
            path="/"
            element={
              <HomePage
                setErrorMessage={setErrorMessage}
                isLoggedIn={isLoggedInResolved}
              />
            }
          />
          <Route
            path="/successful-checkout"
            element={<SuccessfulCheckoutPage />}
          />
          <Route path="/limit" element={<LimitPage />} />
          <Route path="/account" element={requireAuth(<AccountPage />)} />
          <Route
            path="/import"
            element={requireAuth(
              <ImportPage setError={setErrorMessage} />
            )}
          />
          <Route path="/ankify" element={requireAuth(<AnkifyPage />)} />
          <Route
            path="/ankify/setup"
            element={requireAuth(<AnkifySetupPage />)}
          />
          <Route
            path="/ankify/history"
            element={requireAuth(<AnkifyHistoryPage />)}
          />
          <Route path="/ops" element={requireAuth(<OpsLayout />)}>
            <Route index element={<EngineeringTab />} />
            <Route path="errors" element={<ErrorsTab />} />
            <Route path="performance" element={<PerformanceTab />} />
            <Route path="conversions" element={<ConversionsTab />} />
            <Route path="business" element={<BusinessTab />} />
            <Route path="showcase" element={<ShowcaseTab />} />
            <Route path="interviews" element={<InterviewsTab />} />
            <Route path="messages" element={<ContactMessagesTab />} />
            <Route path="commands" element={<CommandsTab />} />
          </Route>
          <Route path="/feedback" element={requireAuth(<FeedbackPage />)} />
          <Route path="/settings" element={requireAuth(<AccountPage />)} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/whats-new" element={<WhatsNewPage />} />
          <Route path="/documentation" element={<DocsPage />} />
          <Route path="/documentation/*" element={<DocsPage />} />
          <Route
            path="/settings/card-options"
            element={<Navigate to="/card-options" replace />}
          />
          <Route
            path="/card-options"
            element={requireAuth(
              <CardOptionsPage setErrorMessage={setErrorMessage} />
            )}
          />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route
            path="/templates/new"
            element={requireAuth(<TemplatesEditorPage mode="new" />)}
          />
          <Route
            path="/templates/edit/:id"
            element={requireAuth(<TemplatesEditorPage mode="edit" />)}
          />
          <Route
            path="/rules/:id"
            element={requireAuth(
              <RulesPage setErrorMessage={setErrorMessage} />
            )}
          />
          <Route
            path="/preview/:id"
            element={requireAuth(
              <PreviewPage setError={setErrorMessage} />
            )}
          />
          <Route
            path="/preview/database/:id"
            element={requireAuth(
              <DatabasePreviewPage setError={setErrorMessage} />
            )}
          />
          <Route
            path="/preview/apkg/:key"
            element={requireAuth(
              <PreviewApkgPage setError={setErrorMessage} />
            )}
          />
          <Route
            path="/notion-to-anki"
            element={<NotionToAnki setErrorMessage={setErrorMessage} />}
          />
          <Route
            path="/anki-to-notion"
            element={<AnkiToNotion setErrorMessage={setErrorMessage} />}
          />
          <Route
            path="/quizlet-to-anki"
            element={<QuizletToAnki setErrorMessage={setErrorMessage} />}
          />
          <Route
            path="/markdown-to-anki"
            element={<MarkdownToAnki setErrorMessage={setErrorMessage} />}
          />
          <Route
            path="/pdf-to-anki"
            element={<PdfToAnki setErrorMessage={setErrorMessage} />}
          />
          <Route
            path="/usmle-anki"
            element={<UsmleAnki setErrorMessage={setErrorMessage} />}
          />
          <Route
            path="/nursing-flashcards"
            element={<NursingFlashcards setErrorMessage={setErrorMessage} />}
          />
          <Route
            path="/anki-from-medical-lecture-slides"
            element={
              <AnkiFromMedicalLectureSlides
                setErrorMessage={setErrorMessage}
              />
            }
          />
          <Route path="/notion-marketplace" element={<NotionLandingPage />} />
          <Route path="/answers/:slug" element={<AnswersPage />} />
          <Route
            path="/convert/:slug"
            element={
              <ConvertLandingPage setErrorMessage={setErrorMessage} />
            }
          />
          <Route path="/s/:token" element={<SharedDeckPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

function AppWithCookies() {
  const [cookies, setCookie] = useCookies(['token']);

  if (isOfflineMode() && !cookies.token) {
    setCookie('token', '?');
  }

  const [apiError, setApiError] = useState<unknown>(null);
  /**
   * This error handling is for network errors and errors happening in the background.
   * This code should be deleted and error handling should be unified for network requests.
   * */
  const handledError = (error: unknown) => {
    const errorMessage = getErrorMessage(error);
    reportClientError(error);
    setApiError(errorMessage);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent
        error={apiError as Error | null}
        setErrorMessage={handledError}
      />
    </QueryClientProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <CookiesProvider defaultSetOptions={{ path: '/' }}>
        <AppWithCookies />
      </CookiesProvider>
    </HelmetProvider>
  );
}

export default App;
