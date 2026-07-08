import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { isPayingUser } from '../../components/NavigationBar/helpers/getPlanLabel';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import { PassLadderCard } from '../../components/PassLadderCard/PassLadderCard';
import { track } from '../../lib/analytics/track';
import { storePassToken } from '../../lib/anonymousPass';
import useQuery from '../../lib/hooks/useQuery';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import styles from '../../styles/shared.module.css';
import { ExploreCard } from './components/ExploreCard/ExploreCard';
import { OnboardingTour } from './components/OnboardingTour/OnboardingTour';
import { RecentSources } from './components/RecentSources/RecentSources';
import UploadForm from './components/UploadForm/UploadForm';
import pageStyles from './UploadPage.module.css';

const REATTACH_KEY = 'upload_pending_filename';
const SIGNUP_FLAG_KEY = 'signup_completed_tracked';
const SIGNUP_RECENCY_MS = 10 * 60 * 1000;
const AI_FLAG_KEY = 'claude-ai-flashcards';

type AiBadgeState = 'anon' | 'free' | 'on' | 'off';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

function deriveAiBadgeState(
  isSignedIn: boolean,
  isPaying: boolean,
  isAiOn: boolean
): AiBadgeState {
  if (!isSignedIn) return 'anon';
  if (!isPaying) return 'free';
  if (isAiOn) return 'on';
  return 'off';
}

function isFreshSignup(
  createdAt: string | null | undefined,
  onboardedAt: string | null | undefined
): boolean {
  if (createdAt == null) return false;
  if (onboardedAt != null) return false;
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return false;
  return Date.now() - createdMs <= SIGNUP_RECENCY_MS;
}

export function UploadPage({ setErrorMessage }: Readonly<Props>) {
  const query = useQuery();
  const view = query.get('view');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reattachFilename, setReattachFilename] = useState<string | null>(
    () => {
      const stored = globalThis.sessionStorage?.getItem(REATTACH_KEY) ?? null;
      return stored != null && stored.length > 0 ? stored : null;
    }
  );
  const { data: userLocals } = useUserLocals();
  const [returnedFromPass, setReturnedFromPass] = useState(
    () => searchParams.get('from') === 'pass'
  );
  const pageViewTracked = useRef(false);
  const signupTracked = useRef(false);

  const isSignedIn = userLocals?.user?.id != null;
  const isPaying = isPayingUser(userLocals?.locals);
  const [aiFlag, setAiFlag] = useState(
    () => globalThis.localStorage?.getItem(AI_FLAG_KEY) === 'true'
  );

  useEffect(() => {
    setAiFlag(globalThis.localStorage?.getItem(AI_FLAG_KEY) === 'true');
  }, [isSignedIn]);

  const isAiOn = isPaying && aiFlag;
  const aiBadgeState = deriveAiBadgeState(isSignedIn, isPaying, isAiOn);

  const toggleAi = () => {
    const next = !isAiOn;
    globalThis.localStorage?.setItem(AI_FLAG_KEY, String(next));
    setAiFlag(next);
    track(next ? 'upload_ai_turned_on' : 'upload_ai_turned_off');
  };

  useEffect(() => {
    track('upload_ai_badge_viewed', { state: aiBadgeState });
  }, [aiBadgeState]);

  useEffect(() => {
    if (pageViewTracked.current) return;
    pageViewTracked.current = true;
    track('upload_page_viewed');
  }, []);

  useEffect(() => {
    if (signupTracked.current) return;
    const user = userLocals?.user;
    if (user?.id == null) return;
    if (!isFreshSignup(user.created_at, user.onboarded_at)) return;
    if (globalThis.sessionStorage?.getItem(SIGNUP_FLAG_KEY) != null) return;
    signupTracked.current = true;
    globalThis.sessionStorage?.setItem(SIGNUP_FLAG_KEY, '1');
    track('signup_completed', { method: 'oauth' });
  }, [userLocals]);

  useEffect(() => {
    if (searchParams.get('from') === 'pass') {
      setReturnedFromPass(true);
      const next = new URLSearchParams(searchParams);
      next.delete('from');
      const qs = next.toString();
      navigate(qs ? `/upload?${qs}` : '/upload', { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const passSession = searchParams.get('pass_session');
    if (passSession != null && passSession.length > 0) {
      // Owner decision: anonymous passes live in the browser (localStorage is sanctioned for this use case)
      storePassToken(passSession);
      const next = new URLSearchParams(searchParams);
      next.delete('pass_session');
      const qs = next.toString();
      navigate(qs ? `/upload?${qs}` : '/upload', { replace: true });
    }
  }, [searchParams, navigate]);

  if (
    view === 'template' ||
    view === 'deck-options' ||
    view === 'card-options'
  ) {
    return <Navigate to="/card-options" replace />;
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Upload — 2anki</title>
      </Helmet>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Convert your notes</h1>
        <p className={styles.subtitle}>
          Drop a file and get a deck you don&apos;t have to fix — proper cloze,
          atomic cards, the right note types. Notion, PDF, Markdown, HTML, Word,
          and CSV too.
        </p>
      </header>
      <OnboardingTour
        createdAt={userLocals?.user?.created_at ?? null}
        onboardedAt={userLocals?.user?.onboarded_at ?? null}
      />
      {reattachFilename != null && (
        <div className={pageStyles.reattachBanner} role="status">
          <span>Re-attach </span>
          <strong>{reattachFilename}</strong>
          <span> to convert</span>
        </div>
      )}
      {returnedFromPass && <PassLadderCard />}
      <div className={styles.aiOffBadge} role="status">
        {aiBadgeState === 'on' && (
          <>
            <button
              type="button"
              className={styles.aiToggle}
              aria-pressed="true"
              aria-label="Turn AI off"
              onClick={toggleAi}
            >
              <span className={styles.badgeSuccess}>AI is on</span>
            </button>
            <span className={styles.aiOffBadgeBody}>
              <span> Cards are written by Claude. </span>
              <Link to="/card-options?returnTo=/upload#pdf-ai">
                Manage in Settings
              </Link>
              <span>.</span>
            </span>
          </>
        )}
        {aiBadgeState === 'off' && (
          <>
            <button
              type="button"
              className={styles.aiToggle}
              aria-pressed="false"
              aria-label="Turn AI on"
              onClick={toggleAi}
            >
              <span className={styles.badgeWarning}>AI is off</span>
            </button>
            <span className={styles.aiOffBadgeBody}>
              <span>
                {' '}
                You&apos;ll get rule-based cards from your file&apos;s
                structure.{' '}
              </span>
              <button
                type="button"
                className={styles.aiInlineLink}
                onClick={toggleAi}
              >
                Turn on Claude cards
              </button>
              <span>. </span>
              <Link to="/card-options?returnTo=/upload">
                Manage in Settings
              </Link>
              <span>.</span>
            </span>
          </>
        )}
        {aiBadgeState === 'free' && (
          <>
            <span className={styles.badgeWarning}>AI is off</span>
            <span className={styles.aiOffBadgeBody}>
              <span>
                {' '}
                You&apos;ll get rule-based cards from your file&apos;s
                structure.{' '}
              </span>
              <Link
                to="/pricing"
                onClick={() => track('upload_ai_free_badge_clicked')}
              >
                Upgrade to write cards with Claude
              </Link>
              <span>. </span>
              <Link to="/card-options?returnTo=/upload">
                Manage in Settings
              </Link>
              <span>.</span>
            </span>
          </>
        )}
        {aiBadgeState === 'anon' && (
          <span className={styles.aiOffBadgeBody}>
            <span>Claude can write your cards — </span>
            <Link
              to="/login?redirect=/card-options"
              onClick={() => track('upload_ai_anon_badge_clicked')}
            >
              sign in to turn on AI
            </Link>
            <span>.</span>
          </span>
        )}
      </div>
      <UploadForm
        setErrorMessage={setErrorMessage}
        aiOn={isAiOn}
        passLadderShownOnPage={returnedFromPass}
      />
      {isSignedIn && <RecentSources />}
      <ExploreCard />
      <section className={pageStyles.howItWorks}>
        <h2 className={pageStyles.howItWorksHeading}>How it works</h2>
        <p className={pageStyles.footnote}>Files are deleted after 2 hours.</p>
        <div className={pageStyles.steps}>
          <div className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>1</span>
            <div>
              <p className={pageStyles.stepTitle}>Drop or choose a file</p>
              <p className={pageStyles.stepBody}>
                PDF, Word, Notion export, Markdown, HTML, Excel, CSV, or
                PowerPoint. In Word docs, headings become card fronts and the
                body text under each heading becomes the back. Images land on
                the back, and strikethrough text on a card becomes an Anki tag.
              </p>
              <p className={pageStyles.stepBody}>
                Coming from Notion?{' '}
                <a href="/documentation/start-here/upload-a-file">
                  How to export your pages.
                </a>
              </p>
            </div>
          </div>
          <div className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>2</span>
            <div>
              <p className={pageStyles.stepTitle}>Your deck is built</p>
              <p className={pageStyles.stepBody}>
                Images, code blocks, cloze, and formatting carry over. Usually a
                few seconds.
              </p>
            </div>
          </div>
          <div className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>3</span>
            <div>
              <p className={pageStyles.stepTitle}>Open in Anki</p>
              <p className={pageStyles.stepBody}>
                Your .apkg downloads automatically. Import it into Anki or
                AnkiDroid to start studying.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className={pageStyles.contactNudge} aria-label="Contact us">
        <p>
          Something not working? <Link to="/contact">Tell us</Link> or email{' '}
          <a href="mailto:support@2anki.net">support@2anki.net</a>.
        </p>
      </section>
    </div>
  );
}
