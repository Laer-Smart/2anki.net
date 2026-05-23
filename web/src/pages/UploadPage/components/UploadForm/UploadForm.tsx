import { type SyntheticEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorHandlerType, classifyUploadError } from '../../../../components/errors/helpers/getErrorMessage';
import handleRedirect from '../../../../lib/handleRedirect';
import getAcceptedContentTypes from '../../helpers/getAcceptedContentTypes';
import { extractErrorMessage } from '../../helpers/extractErrorMessage';
import type { UploadErrorBody } from '../../../../types/UploadErrorBody';
import getHeadersFilename from '../../helpers/getHeadersFilename';
import { getDownloadFileName } from '../../../DownloadsPage/helpers/getDownloadFileName';
import { getEmptyDeckChatPrompt } from '../../helpers/getEmptyDeckChatPrompt';
import { useDrag } from './hooks/useDrag';
import { useUploadFormState } from './hooks/useUploadFormState';
import { useFileValidation } from './hooks/useFileValidation';
import { useDropboxChooser, type DropboxFile } from './hooks/useDropboxChooser';
import {
  useGooglePicker,
  type GoogleDriveFile,
} from './hooks/useGooglePicker';
import { UploadSourceChips, type UploadSource } from './UploadSourceChips';
import { FeedbackWidget } from '../../../../components/FeedbackWidget/FeedbackWidget';
import { useUserLocals } from '../../../../lib/hooks/useUserLocals';
import { get2ankiApi } from '../../../../lib/backend/get2ankiApi';
import { fireAnalyticsEvent } from '../../../../lib/analytics/fireAnalyticsEvent';
import { track } from '../../../../lib/analytics/track';
import ChatPanel from '../../../../components/ChatPanel/ChatPanel';
import { UpsellCard } from '../../../../components/UpsellCard';
import CardStylePicker, { CARD_STYLE_KEY, DEFAULT_CARD_STYLE } from './CardStylePicker';
import formStyles from './UploadForm.module.css';
import sharedStyles from '../../../../styles/shared.module.css';

import type { ZoneState, LockedPdfInfo, LimitInfo } from './hooks/useUploadFormState';

interface UploadFormProps {
  setErrorMessage: ErrorHandlerType;
}

const FORMATS = ['.zip', '.html', '.md', '.pdf', '.docx', '.xlsx', '.pptx', '.csv'];

const REJECTED_FALLBACK =
  'The server rejected the upload. Try again or email support@2anki.net.';
const NETWORK_FALLBACK =
  "Couldn't upload your file. Check your connection and try again.";

function isLimitRedirect(url: URL): boolean {
  return (
    url.pathname === '/limit' ||
    url.searchParams.get('error') === 'upload_limit_exceeded'
  );
}

function getLimitKind(url: URL): 'file_size' | 'card_count' {
  return url.searchParams.get('kind') === 'card_count' ? 'card_count' : 'file_size';
}

function getLimitDescription(
  kind: 'file_size' | 'card_count',
  context: 'anonymous' | 'trial_available' | 'trial_used'
): string {
  if (kind === 'file_size') {
    if (context === 'anonymous') return 'Create a free account to convert files of any size, or split the file and try again.';
    if (context === 'trial_available') return 'Start a 1-hour trial to convert files of any size, or split the file and try again.';
    return 'Your trial is used. Split the file, or upgrade to convert files of any size.';
  }
  if (context === 'anonymous') return 'Create a free account to start converting, or upgrade for no monthly cap.';
  if (context === 'trial_available') return 'Start a 1-hour trial to keep converting, or upgrade for no monthly cap.';
  return 'Your trial is used. Upgrade for no monthly cap, or wait until next month.';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toFriendlyThrownError(error: unknown): UploadErrorBody {
  const isNetworkError =
    error instanceof TypeError ||
    (error instanceof Error && /fetch|network/i.test(error.message));
  if (isNetworkError) return { code: 'unknown', message: NETWORK_FALLBACK };
  if (error instanceof Error) return { code: 'unknown', message: error.message };
  return { code: 'unknown', message: REJECTED_FALLBACK };
}

function zoneStateForUploadError(message: UploadErrorBody): 'emptyDeck' | 'error' {
  return message.code === 'empty_export' ? 'emptyDeck' : 'error';
}

function buildFormData(form: HTMLFormElement): FormData {
  const formData = new FormData(form);
  for (const [key, value] of Object.entries(globalThis.localStorage)) {
    formData.append(key, value);
  }
  return formData;
}

function parseCardCountHeader(headers: Headers): number | null {
  const cardCountHeader = headers.get('X-Card-Count');
  if (!cardCountHeader) return null;
  const parsed = Number.parseInt(cardCountHeader, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNonNegativeIntHeader(headers: Headers, name: string): number {
  const raw = headers.get(name);
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function resolveDeckName(headers: Headers): string {
  const fileNameHeader = getHeadersFilename(headers);
  const fallback =
    headers.get('Content-Type') === 'application/zip'
      ? 'Your Decks.zip'
      : 'Your deck.apkg';
  return fileNameHeader ?? fallback;
}

function displayFilename(fileInput: HTMLInputElement | null): string {
  const files = fileInput?.files;
  if (!files || files.length === 0) return '';
  if (files.length === 1) return files[0].name;
  return `${files.length} files`;
}

function UploadCloudIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 32L24 24L32 32" />
      <path d="M24 24V42" />
      <path d="M40.78 35.61A8 8 0 0038 20H35.28A12.8 12.8 0 1010 28.67" />
      <path d="M16 32L24 24L32 32" />
    </svg>
  );
}

function CheckCircleIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="20" />
      <path d="M16 24L22 30L34 18" />
    </svg>
  );
}

function DropboxIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 4l8 5-8 5-8-5 8-5zm16 0l8 5-8 5-8-5 8-5zM0 19l8-5 8 5-8 5-8-5zm24-5l8 5-8 5-8-5 8-5zM8 26l8-5 8 5-8 5-8-5z" />
    </svg>
  );
}

function GoogleDriveIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M11 4h10l10 17.5h-10L11 4zm-1 1.7L0 23.2 5 32h10L5 14.5 10 5.7zM10.5 23.5h21L26.5 32H5.5l5-8.5z" />
    </svg>
  );
}

function WarningIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21.07 6.73L3.51 38a3.2 3.2 0 002.93 4.8h35.12a3.2 3.2 0 002.93-4.8L26.93 6.73a3.2 3.2 0 00-5.86 0z" />
      <line x1="24" y1="18" x2="24" y2="28" />
      <circle cx="24" cy="34" r="0.5" fill="currentColor" />
    </svg>
  );
}

function UploadForm({ setErrorMessage }: Readonly<UploadFormProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const convertRef = useRef<HTMLButtonElement>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { validation, validate, reset: resetValidation } = useFileValidation();

  const {
    zoneState,
    setZoneState,
    downloadLink,
    setDownloadLink,
    deckName,
    setDeckName,
    cardCount,
    setCardCount,
    mcqCount,
    setMcqCount,
    mcqSkippedCount,
    setMcqSkippedCount,
    mcqDrawerOpen,
    setMcqDrawerOpen,
    mcqShowAnswer,
    setMcqShowAnswer,
    warningMessage,
    setWarningMessage,
    limitInfo,
    setLimitInfo,
    localError,
    setLocalError,
    progressWidth,
    setProgressWidth,
    progressSlow,
    setProgressSlow,
    showFallback,
    setShowFallback,
    trialPending,
    setTrialPending,
    trialError,
    setTrialError,
    dropboxFilename,
    setDropboxFilename,
    dropboxPending,
    setDropboxPending,
    dropboxError,
    setDropboxError,
    driveFilename,
    setDriveFilename,
    driveMimeType,
    setDriveMimeType,
    drivePending,
    setDrivePending,
    driveError,
    setDriveError,
    source,
    setSource,
    showInlineChat,
    setShowInlineChat,
    showErrorInlineChat,
    setShowErrorInlineChat,
    lockedPdfInfo,
    setLockedPdfInfo,
    pdfCredential,
    setPdfCredential,
    pdfUnlockError,
    setPdfUnlockError,
    pdfAttemptCount,
    setPdfAttemptCount,
    resetForm,
  } = useUploadFormState(() => {
    resetValidation();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
  });

  const [cardStyle, setCardStyle] = useState<string>(
    () => globalThis.localStorage?.getItem(CARD_STYLE_KEY) ?? DEFAULT_CARD_STYLE
  );

  const handleCardStyleChange = (value: string) => {
    globalThis.localStorage?.setItem(CARD_STYLE_KEY, value);
    setCardStyle(value);
  };

  const { data: userLocals } = useUserLocals();
  const queryClient = useQueryClient();
  const autoSyncActive = userLocals?.autoSyncActive === true;
  const successPromptShown = globalThis.document?.cookie?.includes('auto_sync_prompt_shown=true') === true;
  const showAutoSyncPrompt = zoneState === 'success' && !autoSyncActive && !successPromptShown;
  const isAuthenticated = userLocals?.user?.id != null;
  const showTrialButton =
    isAuthenticated &&
    userLocals?.user?.trial_started_at == null &&
    userLocals?.locals?.patreon !== true;
  const showSignInPrompt = userLocals != null && !isAuthenticated;
  const { openChooser, isConfigured: isDropboxConfigured } = useDropboxChooser(FORMATS);
  const { openPicker, isConfigured: isGoogleDriveConfigured } = useGooglePicker();

  const handleStartTrial = async () => {
    setTrialError(null);
    setTrialPending(true);
    try {
      const result = await get2ankiApi().startTrial();
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: ['userLocals'] });
        setLimitInfo(null);
        setZoneState('converting');
        convertRef.current?.click();
      } else if (result.reason === 'already_paid') {
        await queryClient.invalidateQueries({ queryKey: ['userLocals'] });
        setTrialError("You're already on Unlimited. Refresh to continue.");
      } else if (result.reason === 'already_used') {
        setTrialError("You've already used your 1-hour trial. Upgrade for unlimited conversions.");
      } else {
        setTrialError("Couldn't start your trial. Try again, or email support@2anki.net.");
      }
    } catch {
      setTrialError("Couldn't start your trial. Check your connection and try again.");
    } finally {
      setTrialPending(false);
    }
  };

  const submitFiles = () => {
    convertRef.current?.click();
  };

  const { dropHover } = useDrag({
    onDrop: (event) => {
      const { dataTransfer } = event;
      if (dataTransfer && dataTransfer.files.length > 0) {
        fileInputRef.current!.files = dataTransfer.files;
        if (validate(dataTransfer.files)) {
          submitFiles();
        }
      }
      event.preventDefault();
    },
  });

  useEffect(() => {
    if (zoneState === 'success' && downloadLink && !showFallback) {
      globalThis.sessionStorage?.removeItem('upload_pending_filename');
      if (cardCount !== 0) {
        fireAnalyticsEvent('deck_downloaded');
        track('deck_downloaded');
        downloadRef.current?.click();
      }
      fallbackTimerRef.current = setTimeout(() => {
        setShowFallback(true);
      }, 3000);
    }
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [zoneState, downloadLink]);

  useEffect(() => {
    if (zoneState !== 'converting') return;
    setProgressWidth(70);
    const timer = setTimeout(() => {
      setProgressSlow(true);
      setProgressWidth(90);
    }, 2000);
    return () => clearTimeout(timer);
  }, [zoneState]);

  useEffect(() => {
    if (zoneState === 'error') {
      track('upload_error_chat_shown');
    }
  }, [zoneState]);

  useEffect(() => {
    if (zoneState === 'emptyDeck') {
      track('upload_empty_deck_chat_shown');
    }
  }, [zoneState]);

  const handleDropboxFiles = async (files: DropboxFile[]) => {
    const first = files[0];
    setDropboxFilename(first?.name ?? null);
    setDropboxError(null);
    setZoneState('converting');
    fireAnalyticsEvent('upload_started');
    track('upload_started', { source: 'dropbox' });
    setProgressWidth(10);
    setProgressSlow(false);
    setShowFallback(false);
    try {
      const formData = new FormData();
      formData.append('files', JSON.stringify(files));
      for (const [key, value] of Object.entries(globalThis.localStorage)) {
        formData.append(key, value);
      }
      const request = await globalThis.fetch('/api/upload/dropbox', {
        method: 'post',
        body: formData,
      });
      if (request.redirected) {
        const redirectUrl = new URL(request.url, globalThis.location.origin);
        if (isLimitRedirect(redirectUrl)) {
          const kind = getLimitKind(redirectUrl);
          setLimitInfo({
            filename: first?.name ?? null,
            fileSizeBytes: kind === 'file_size' ? (first?.bytes ?? null) : null,
            kind,
          });
          setZoneState('limitReached');
          return;
        }
        handleRedirect(request);
        return;
      }
      if (request.status === 202) {
        globalThis.location.href = '/downloads';
        return;
      }
      if (request.status !== 200) {
        const message = await extractErrorMessage(request);
        setLocalError(message);
        setZoneState(zoneStateForUploadError(message));
        return;
      }
      setWarningMessage(request.headers.get('X-Warning'));
      setDeckName(resolveDeckName(request.headers));
      const count = parseCardCountHeader(request.headers);
      setCardCount(count);
      setMcqCount(parseNonNegativeIntHeader(request.headers, 'X-MCQ-Count'));
      setMcqSkippedCount(parseNonNegativeIntHeader(request.headers, 'X-MCQ-Skipped-Count'));
      const blob = await request.blob();
      setDownloadLink(globalThis.URL.createObjectURL(blob));
      setProgressWidth(100);
      if (count === 0) {
        setZoneState('emptyDeck');
      } else {
        fireAnalyticsEvent('conversion_success');
        setZoneState('success');
      }
    } catch (error) {
      setLocalError(toFriendlyThrownError(error));
      setZoneState('error');
    }
  };

  const handleDropboxClick = async () => {
    setDropboxError(null);
    setDropboxPending(true);
    try {
      const outcome = await openChooser();
      if (outcome.kind === 'cancelled') return;
      if (outcome.files.length === 0) return;
      await handleDropboxFiles(outcome.files);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Couldn't open Dropbox. Try again in a moment.";
      setDropboxError(message);
    } finally {
      setDropboxPending(false);
    }
  };

  const handleGoogleDriveFiles = async (
    files: GoogleDriveFile[],
    accessToken: string
  ) => {
    const first = files[0];
    setDriveFilename(first?.name ?? null);
    setDriveMimeType(first?.mimeType ?? null);
    setDriveError(null);
    setZoneState('converting');
    fireAnalyticsEvent('upload_started');
    track('upload_started', { source: 'google_drive' });
    setProgressWidth(10);
    setProgressSlow(false);
    setShowFallback(false);
    try {
      const formData = new FormData();
      formData.append('files', JSON.stringify(files));
      formData.append('googleDriveAuth', accessToken);
      for (const [key, value] of Object.entries(globalThis.localStorage)) {
        formData.append(key, value);
      }
      const request = await globalThis.fetch('/api/upload/google_drive', {
        method: 'post',
        body: formData,
      });
      if (request.redirected) {
        const redirectUrl = new URL(request.url, globalThis.location.origin);
        if (isLimitRedirect(redirectUrl)) {
          const kind = getLimitKind(redirectUrl);
          setLimitInfo({
            filename: first?.name ?? null,
            fileSizeBytes: kind === 'file_size' ? (first?.sizeBytes ?? null) : null,
            kind,
          });
          setZoneState('limitReached');
          return;
        }
        handleRedirect(request);
        return;
      }
      if (request.status === 202) {
        globalThis.location.href = '/downloads';
        return;
      }
      if (request.status !== 200) {
        const message = await extractErrorMessage(request);
        setLocalError(message);
        setZoneState(zoneStateForUploadError(message));
        return;
      }
      setWarningMessage(request.headers.get('X-Warning'));
      setDeckName(resolveDeckName(request.headers));
      const count = parseCardCountHeader(request.headers);
      setCardCount(count);
      setMcqCount(parseNonNegativeIntHeader(request.headers, 'X-MCQ-Count'));
      setMcqSkippedCount(parseNonNegativeIntHeader(request.headers, 'X-MCQ-Skipped-Count'));
      const blob = await request.blob();
      setDownloadLink(globalThis.URL.createObjectURL(blob));
      setProgressWidth(100);
      if (count === 0) {
        setZoneState('emptyDeck');
      } else {
        fireAnalyticsEvent('conversion_success');
        setZoneState('success');
      }
    } catch (error) {
      setLocalError(toFriendlyThrownError(error));
      setZoneState('error');
    }
  };

  const handleGoogleDriveClick = async () => {
    setDriveError(null);
    setDrivePending(true);
    try {
      const outcome = await openPicker();
      if (outcome.kind === 'cancelled') return;
      if (outcome.files.length === 0) return;
      await handleGoogleDriveFiles(outcome.files, outcome.accessToken);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Couldn't reach Google Drive. Sign in again and retry.";
      setDriveError(message);
    } finally {
      setDrivePending(false);
    }
  };

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setZoneState('converting');
    fireAnalyticsEvent('upload_started');
    track('upload_started', { source: 'file' });
    setProgressWidth(10);
    setProgressSlow(false);
    setShowFallback(false);
    try {
      const formData = buildFormData(event.currentTarget as HTMLFormElement);
      const request = await globalThis.fetch('/api/upload/file', {
        method: 'post',
        body: formData,
      });
      if (request.redirected) {
        const redirectUrl = new URL(request.url, globalThis.location.origin);
        if (isLimitRedirect(redirectUrl)) {
          const firstFile = fileInputRef.current?.files?.[0];
          const kind = getLimitKind(redirectUrl);
          setLimitInfo({
            filename: firstFile?.name ?? null,
            fileSizeBytes: kind === 'file_size' ? (firstFile?.size ?? null) : null,
            kind,
          });
          setZoneState('limitReached');
          return true;
        }
        return handleRedirect(request);
      }
      if (request.status === 202) {
        globalThis.location.href = '/downloads';
        return true;
      }
      if (request.status !== 200) {
        const cloned = request.clone();
        try {
          const body = await cloned.json();
          if (body?.error === 'needs_password') {
            const firstFile = fileInputRef.current?.files?.[0];
            if (firstFile) {
              setLockedPdfInfo({ filename: firstFile.name, file: firstFile });
              setPdfCredential('');
              setPdfUnlockError(null);
              setPdfAttemptCount(0);
              setZoneState('lockedPdf');
              return false;
            }
          }
        } catch {
          // non-JSON response — fall through to error
        }
        const message = await extractErrorMessage(request);
        setLocalError(message);
        setZoneState(zoneStateForUploadError(message));
        return false;
      }
      setWarningMessage(request.headers.get('X-Warning'));
      setDeckName(resolveDeckName(request.headers));
      const count = parseCardCountHeader(request.headers);
      setCardCount(count);
      setMcqCount(parseNonNegativeIntHeader(request.headers, 'X-MCQ-Count'));
      setMcqSkippedCount(parseNonNegativeIntHeader(request.headers, 'X-MCQ-Skipped-Count'));
      const blob = await request.blob();
      setDownloadLink(globalThis.URL.createObjectURL(blob));
      setProgressWidth(100);
      if (count === 0) {
        setZoneState('emptyDeck');
      } else {
        fireAnalyticsEvent('conversion_success');
        setZoneState('success');
      }
    } catch (error) {
      setLocalError(toFriendlyThrownError(error));
      setZoneState('error');
      return false;
    }
    return true;
  };

  const zoneClassName = [
    formStyles.dropZone,
    dropHover && zoneState === 'idle' ? formStyles.dropZoneActive : '',
    zoneState === 'converting' ? formStyles.dropZoneConverting : '',
    zoneState === 'success' ? formStyles.dropZoneSuccess : '',
    zoneState === 'emptyDeck' ? formStyles.dropZoneEmpty : '',
    zoneState === 'error' ? formStyles.dropZoneError : '',
    zoneState === 'limitReached' ? formStyles.dropZoneLimit : '',
    zoneState === 'lockedPdf' ? formStyles.dropZoneLocked : '',
    validation?.status === 'warning' ? formStyles.dropZoneWarning : '',
    validation?.status === 'error' ? formStyles.dropZoneError : '',
    validation?.status === 'info' ? formStyles.dropZoneInfo : '',
  ]
    .filter(Boolean)
    .join(' ');

  const renderValidationState = () => (
    <div className={formStyles.stateContent}>
      <span className={formStyles.validationIcon}>
        {validation?.status === 'error' ? '⚠' : 'ℹ'}
      </span>
      <p className={formStyles.validationTitle}>{validation?.title}</p>
      <p className={formStyles.validationBody}>{validation?.body}</p>
      <div className={formStyles.validationActions}>
        <button
          type="button"
          className={formStyles.actionButton}
          onClick={(e) => {
            e.preventDefault();
            resetValidation();
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        >
          Pick a different file
        </button>
        <button
          type="button"
          className={formStyles.resetLink}
          onClick={(e) => {
            e.preventDefault();
            resetValidation();
            submitFiles();
          }}
        >
          {validation?.continueLabel}
        </button>
      </div>
    </div>
  );

  const remoteSourceLabel = (): string | null => {
    if (driveFilename) return 'Google Drive';
    if (dropboxFilename) return 'Dropbox';
    return null;
  };

  const renderConvertingState = () => {
    const remoteFilename = driveFilename ?? dropboxFilename;
    const remoteSource = remoteSourceLabel();
    return (
      <div className={formStyles.stateContent}>
        <p className={formStyles.filename}>
          {remoteFilename ?? displayFilename(fileInputRef.current)}
        </p>
        <div className={formStyles.progressTrack}>
          <div
            className={`${formStyles.progressFill} ${progressSlow ? formStyles.progressFillSlow : ''}`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
        <p className={formStyles.statusText}>
          {remoteFilename && remoteSource
            ? `Fetching ${remoteFilename} from ${remoteSource}`
            : 'Making your deck...'}
        </p>
      </div>
    );
  };

  const handleSuccessPromptClick = () => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    globalThis.document.cookie = `auto_sync_prompt_shown=true; path=/; expires=${expires.toUTCString()}`;
  };

  const renderMcqDrawer = () => (
    <div className={formStyles.mcqDrawer}>
      <p className={formStyles.mcqDrawerHeading}>Preview</p>
      {mcqShowAnswer ? (
        <>
          <p className={formStyles.mcqDrawerQuestion}>
            Open your downloaded deck in Anki to see the full question and correct answer highlighted.
          </p>
          <button
            type="button"
            className={formStyles.mcqDrawerToggle}
            onClick={() => setMcqShowAnswer(false)}
          >
            Show question
          </button>
        </>
      ) : (
        <>
          <p className={formStyles.mcqDrawerQuestion}>
            Your deck contains {mcqCount} multiple-choice {mcqCount === 1 ? 'card' : 'cards'}.
            Each card shows a question stem with labelled options — tap the correct one in Anki to reveal the answer.
          </p>
          <button
            type="button"
            className={formStyles.mcqDrawerToggle}
            onClick={() => setMcqShowAnswer(true)}
          >
            Show answer
          </button>
        </>
      )}
    </div>
  );

  const renderSuccessState = () => (
    <div className={formStyles.stateContent}>
      <CheckCircleIcon className={formStyles.iconSuccess} />
      <p className={formStyles.successPrimary}>
        Your deck is ready
        {cardCount != null && (
          <span className={formStyles.cardCount}>
            &nbsp;&mdash; {cardCount} {cardCount === 1 ? 'card' : 'cards'}
          </span>
        )}
      </p>
      {mcqCount > 0 && (
        <>
          <button
            type="button"
            className={formStyles.mcqBadge}
            onClick={() => setMcqDrawerOpen((prev) => !prev)}
            aria-expanded={mcqDrawerOpen}
          >
            {mcqCount} multiple choice
            {mcqSkippedCount > 0 && (
              <span
                className={formStyles.mcqSkipped}
                title="Mark the correct option in Notion to render these as multiple choice. Use a Notion checkbox or bold the correct bullet."
              >
                &nbsp;&mdash;&nbsp;{mcqSkippedCount} skipped, no answer marked
              </span>
            )}
          </button>
          {mcqDrawerOpen && renderMcqDrawer()}
        </>
      )}
      <p className={formStyles.successSecondary}>
        {deckName} was saved to your downloads
      </p>
      {warningMessage && (
        <p className={formStyles.warningInline}>{warningMessage}</p>
      )}
      {showFallback && (
        <button
          type="button"
          className={formStyles.fallbackLink}
          onClick={() => downloadRef.current?.click()}
        >
          Didn't get the file? Download it here.
        </button>
      )}
      {showAutoSyncPrompt && (
        <p className={formStyles.autoSyncPrompt}>
          Want this to update automatically?{' '}
          <a
            href="/pricing?ref=upload-success-prompt"
            className={formStyles.autoSyncPromptLink}
            onClick={handleSuccessPromptClick}
          >
            Try Auto Sync
          </a>
        </p>
      )}
      {!showAutoSyncPrompt && (
        <UpsellCard surface="upload_success_upsell" />
      )}
      <button
        type="button"
        className={formStyles.actionButton}
        onClick={resetForm}
      >
        Make another deck
      </button>
      <div className={formStyles.feedbackPrompt}>
        <p className={formStyles.feedbackLabel}>How was your experience?</p>
        <FeedbackWidget page="/upload" compact />
      </div>
    </div>
  );

  const renderEmptyDeckBody = () => {
    if (driveMimeType === 'application/vnd.google-apps.document') {
      return (
        <p className={formStyles.emptyBody}>
          Your Doc converted, but we didn't see the bullet shape we turn into cards.
          Restructure your Doc so each question is a top-level bullet with its answer
          indented underneath, then try again.{' '}
          <a href="/documentation/help/common-problems#my-google-doc-converted-to-0-cards">
            See a working example
          </a>
        </p>
      );
    }
    if (driveMimeType === 'application/vnd.google-apps.spreadsheet') {
      return (
        <p className={formStyles.emptyBody}>
          Sheets need a column of questions and a column of answers. Make sure your
          Sheet has at least two columns, then try again.
        </p>
      );
    }
    if (driveMimeType === 'application/vnd.google-apps.presentation') {
      return (
        <p className={formStyles.emptyBody}>
          Slides need a title and bullets per slide to produce cards. Add titles and
          bullet points to your slides, then try again.
        </p>
      );
    }
    return (
      <p className={formStyles.emptyBody}>
        No cards were found in this file. Most files need a toggle-list (Notion)
        or a question/answer pair to become cards. See{' '}
        <a href="/documentation/help/common-problems">common problems</a> for the
        formats that work.
      </p>
    );
  };

  const currentFilename = (): string =>
    driveFilename ?? dropboxFilename ?? displayFilename(fileInputRef.current);

  const renderEmptyDeckState = () => {
    const isGoogleDriveFile = driveMimeType?.startsWith('application/vnd.google-apps.') ?? false;
    const emptyTitle = isGoogleDriveFile
      ? `No cards found in ${driveFilename ?? 'your file'}`
      : 'No cards found in this file';

    return (
      <div className={formStyles.stateContent}>
        <WarningIcon className={formStyles.iconWarning} />
        <p className={formStyles.emptyTitle}>{emptyTitle}</p>
        {renderEmptyDeckBody()}
        <div className={formStyles.emptyActions}>
          {downloadLink && (
            <button
              type="button"
              className={formStyles.emptyDownloadButton}
              onClick={() => downloadRef.current?.click()}
            >
              Download empty deck
            </button>
          )}
          <button
            type="button"
            className={formStyles.resetLink}
            onClick={resetForm}
          >
            Try a different file
          </button>
        </div>
      </div>
    );
  };

  const saveFilenameForReattach = (filename: string | null) => {
    if (filename != null && filename.length > 0) {
      globalThis.sessionStorage?.setItem('upload_pending_filename', filename);
    }
  };

  const renderLimitState = () => {
    const isFileSize = limitInfo?.kind === 'file_size';
    const title = isFileSize
      ? 'This file is over the 50 MB limit'
      : 'You reached your monthly limit of 100 cards';
    let limitContext: 'anonymous' | 'trial_available' | 'trial_used';
    if (showSignInPrompt) {
      limitContext = 'anonymous';
    } else if (showTrialButton) {
      limitContext = 'trial_available';
    } else {
      limitContext = 'trial_used';
    }
    const description = getLimitDescription(
      isFileSize ? 'file_size' : 'card_count',
      limitContext
    );

    return (
      <div className={formStyles.limitContent}>
        <p className={formStyles.limitTitle}>{title}</p>
        <p className={formStyles.limitDescription}>{description}</p>
        {limitInfo?.filename && (
          <span className={formStyles.limitFilename} title={limitInfo.filename}>
            {limitInfo.filename}
            {isFileSize && limitInfo.fileSizeBytes != null && (
              <> &mdash; {formatFileSize(limitInfo.fileSizeBytes)}</>
            )}
          </span>
        )}
        {trialError && (
          <p className={formStyles.limitError} role="alert">
            {trialError}
          </p>
        )}
        <div className={formStyles.limitActions}>
          {showSignInPrompt ? (
            <Link
              to="/register?redirect=/upload&start_trial=1"
              className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
              onClick={() => saveFilenameForReattach(limitInfo?.filename ?? null)}
            >
              Create account and start trial
            </Link>
          ) : (
            <>
              <Link
                to="/limit?ref=upload-limit-wall"
                className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
              >
                See upgrade options
              </Link>
              {showTrialButton && (
                <button
                  type="button"
                  className={`${sharedStyles.btnSecondary} ${sharedStyles.btnInline}`}
                  onClick={handleStartTrial}
                  disabled={trialPending}
                >
                  {trialPending ? 'Starting trial' : 'Start 1-hour trial'}
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className={formStyles.resetLink}
            onClick={resetForm}
          >
            Try a different file
          </button>
        </div>
      </div>
    );
  };

  const renderErrorState = () => {
    const classified = localError
      ? classifyUploadError(localError)
      : {
          title: 'Something broke while reading this file.',
          detail:
            'Try again, or send the file to support@2anki.net so we can fix the parser.',
        };
    const errorText = classified.detail
      ? `${classified.title} ${classified.detail}`
      : classified.title;
    const isExistingApkg =
      localError != null && /already an Anki deck/i.test(localError.message);
    return (
      <div className={formStyles.stateContent}>
        <WarningIcon className={formStyles.iconError} />
        <p className={formStyles.errorTitle}>Something went wrong</p>
        <p className={formStyles.errorBody}>
          {errorText}
          {isExistingApkg && (
            <>
              {' '}
              Want to print or share it as a PDF?{' '}
              <Link to="/print">Try Print Decks</Link>.
            </>
          )}
        </p>
        <button
          type="button"
          className={formStyles.actionButton}
          onClick={resetForm}
        >
          Try again
        </button>
      </div>
    );
  };

  const renderIdleState = () => (
    <div className={formStyles.stateContent}>
      <UploadCloudIcon
        className={`${formStyles.icon} ${dropHover ? formStyles.iconBob : ''}`}
      />
      <span className={formStyles.dropText}>
        {dropHover ? 'Drop it right here' : 'Drop your files here'}
      </span>
      {!dropHover && (
        <>
          <span className={formStyles.dropHint}>or</span>
          <span className={formStyles.chooseButton}>Choose files</span>
          <div className={formStyles.formatList}>
            {FORMATS.map((fmt) => (
              <span key={fmt} className={formStyles.formatPill}>
                {fmt}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const handleUnlock = async () => {
    if (!lockedPdfInfo) return;

    const credential = pdfCredential.trim();
    if (!credential) return;

    setZoneState('converting');
    setPdfUnlockError(null);

    try {
      const formData = new FormData();
      formData.append('file', lockedPdfInfo.file, lockedPdfInfo.filename);
      formData.append('credential', credential);
      for (const [key, value] of Object.entries(globalThis.localStorage)) {
        formData.append(key, value);
      }

      const request = await globalThis.fetch('/api/upload/retry-with-credential', {
        method: 'post',
        body: formData,
      });

      if (request.status === 200) {
        setWarningMessage(request.headers.get('X-Warning'));
        setDeckName(resolveDeckName(request.headers));
        const count = parseCardCountHeader(request.headers);
        setCardCount(count);
        setMcqCount(parseNonNegativeIntHeader(request.headers, 'X-MCQ-Count'));
        setMcqSkippedCount(parseNonNegativeIntHeader(request.headers, 'X-MCQ-Skipped-Count'));
        const blob = await request.blob();
        setDownloadLink(globalThis.URL.createObjectURL(blob));
        setProgressWidth(100);
        setLockedPdfInfo(null);
        if (count === 0) {
          setZoneState('emptyDeck');
        } else {
          fireAnalyticsEvent('conversion_success');
          setZoneState('success');
        }
        return;
      }

      const newAttemptCount = pdfAttemptCount + 1;
      setPdfAttemptCount(newAttemptCount);
      setPdfUnlockError('That didn\'t open the file. Check for typos and try again.');
      setZoneState('lockedPdf');
    } catch (error) {
      setPdfUnlockError(toFriendlyThrownError(error).message);
      setZoneState('lockedPdf');
    }
  };

  const renderLockedPdfState = () => (
    <div className={formStyles.stateContent}>
      <span className={formStyles.lockedIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="40" height="40">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
      <div className={formStyles.lockedBadge}>Locked</div>
      <p className={formStyles.lockedFilename}>{lockedPdfInfo?.filename}</p>
      <p className={formStyles.lockedHeadline}>This PDF is password-protected</p>
      <div className={formStyles.lockedInputRow}>
        <input
          type="password"
          className={formStyles.lockedInput}
          placeholder="Enter password"
          value={pdfCredential}
          autoFocus
          onChange={(e) => setPdfCredential(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
          aria-label="PDF password"
        />
        <button
          type="button"
          className={formStyles.lockedUnlockButton}
          onClick={handleUnlock}
          disabled={!pdfCredential.trim()}
        >
          Unlock
        </button>
      </div>
      {pdfUnlockError && (
        <p className={formStyles.lockedError} role="alert">{pdfUnlockError}</p>
      )}
      {pdfAttemptCount >= 3 && (
        <p className={formStyles.lockedHint}>
          Still stuck? Some PDFs have owner-only protection that can't be entered here — open the file in Preview or Adobe Reader, save a copy, and upload that.
        </p>
      )}
      <button
        type="button"
        className={formStyles.resetLink}
        onClick={resetForm}
      >
        Skip this file
      </button>
    </div>
  );

  const renderZoneContent = () => {
    if (validation && zoneState === 'idle') return renderValidationState();
    if (zoneState === 'converting') return renderConvertingState();
    if (zoneState === 'success') return renderSuccessState();
    if (zoneState === 'emptyDeck') return renderEmptyDeckState();
    if (zoneState === 'limitReached' && limitInfo) return renderLimitState();
    if (zoneState === 'lockedPdf') return renderLockedPdfState();
    if (zoneState === 'error') return renderErrorState();
    return renderIdleState();
  };

  const showChips = zoneState === 'idle' && !validation;
  const showDropboxPanel = showChips && source === 'dropbox';
  const showGoogleDrivePanel = showChips && source === 'google_drive';
  const showLocalPanel = !showChips || source === 'local';

  const renderLiveStatus = (): string => {
    if (zoneState === 'converting') return 'Converting your file.';
    if (zoneState === 'success') {
      if (cardCount == null) return 'Your deck is ready.';
      const noun = cardCount === 1 ? 'card' : 'cards';
      return `Your deck is ready — ${cardCount} ${noun}.`;
    }
    if (zoneState === 'emptyDeck') {
      return 'Conversion finished, but no cards were found.';
    }
    if (zoneState === 'error') return 'Conversion failed.';
    if (zoneState === 'limitReached') {
      return "You've reached your monthly limit.";
    }
    if (zoneState === 'lockedPdf') {
      return 'This PDF is password-protected. Enter the password to continue.';
    }
    return '';
  };

  return (
    <form encType="multipart/form-data" method="post" onSubmit={handleSubmit}>
      <output aria-live="polite" className={sharedStyles.srOnly}>
        {renderLiveStatus()}
      </output>
      <label
        htmlFor="pakker"
        id="upload-panel-local"
        className={`${zoneClassName} ${showLocalPanel ? '' : formStyles.panelHidden}`}
        aria-hidden={!showLocalPanel}
      >
        {renderZoneContent()}
        <input
          ref={fileInputRef}
          className={formStyles.fileInput}
          id="pakker"
          type="file"
          name="pakker"
          accept={getAcceptedContentTypes()}
          required
          multiple
          onChange={() => {
            const files = fileInputRef.current?.files;
            if (files && validate(files)) {
              submitFiles();
            }
          }}
        />
      </label>
      {zoneState === 'emptyDeck' && (
        <div className={formStyles.inlineChatWrapper}>
          <button
            type="button"
            className={formStyles.inlineChatToggle}
            onClick={() => {
              setShowInlineChat((prev) => {
                if (!prev) track('upload_empty_deck_chat_engaged');
                return !prev;
              });
            }}
            aria-expanded={showInlineChat}
            aria-controls="empty-deck-chat-panel"
          >
            <i className={`${formStyles.inlineChatToggleChevron} ${showInlineChat ? formStyles.inlineChatToggleChevronOpen : ''}`} aria-hidden="true">›</i>
            Ask Claude about this file
          </button>
          {showInlineChat && (
            <section
              id="empty-deck-chat-panel"
              className={formStyles.inlineChatBody}
              aria-label={`Ask Claude about ${currentFilename() || 'this file'}`}
            >
              <p className={formStyles.inlineChatContext}>
                About{' '}
                <span
                  className={formStyles.inlineChatFilename}
                  title={currentFilename() || 'your file'}
                >
                  {currentFilename() || 'your file'}
                </span>
              </p>
              <ChatPanel
                key={currentFilename()}
                initialPrompt={getEmptyDeckChatPrompt(driveMimeType, currentFilename())}
                cameFromUpload
              />
            </section>
          )}
        </div>
      )}
      {zoneState === 'error' && (
        <div className={formStyles.inlineChatWrapper}>
          <button
            type="button"
            className={formStyles.inlineChatToggle}
            onClick={() => {
              setShowErrorInlineChat((prev) => {
                if (!prev) track('upload_error_chat_engaged');
                return !prev;
              });
            }}
            aria-expanded={showErrorInlineChat}
            aria-controls="error-state-chat-panel"
          >
            <i className={`${formStyles.inlineChatToggleChevron} ${showErrorInlineChat ? formStyles.inlineChatToggleChevronOpen : ''}`} aria-hidden="true">›</i>
            {showErrorInlineChat ? 'Hide chat' : 'Talk it through instead'}
          </button>
          {showErrorInlineChat && (
            <section
              id="error-state-chat-panel"
              className={formStyles.inlineChatBody}
              aria-label={`Talk to Claude about ${currentFilename() || 'this file'}`}
            >
              <p className={formStyles.inlineChatContext}>
                About{' '}
                <span
                  className={formStyles.inlineChatFilename}
                  title={currentFilename() || 'your file'}
                >
                  {currentFilename() || 'your file'}
                </span>
              </p>
              <ChatPanel
                key={`error-${currentFilename()}`}
                initialPrompt={`I tried to convert ${currentFilename() || 'a file'} and got stuck. What can I do?`}
                cameFromUpload
              />
            </section>
          )}
        </div>
      )}
      {zoneState === 'idle' && !validation && (
        <CardStylePicker value={cardStyle} onChange={handleCardStyleChange} />
      )}
      {showChips && (
        <div
          id="upload-panel-dropbox"
          className={`${zoneClassName} ${showDropboxPanel ? '' : formStyles.panelHidden}`}
          aria-hidden={!showDropboxPanel}
        >
          <div className={formStyles.stateContent}>
            <button
              type="button"
              className={formStyles.changeSourceLink}
              aria-label="Change upload source"
              onClick={() => setSource('local')}
            >
              ← Change source
            </button>
            <DropboxIcon className={formStyles.dropboxIconLarge} />
            <span className={formStyles.dropText}>
              Pick a file from your Dropbox to convert it into a deck
            </span>
            <button
              type="button"
              className={formStyles.chooseButton}
              onClick={handleDropboxClick}
              disabled={dropboxPending}
              aria-label="Choose from Dropbox"
            >
              {dropboxPending ? 'Opening Dropbox' : 'Choose from Dropbox'}
            </button>
            <div className={formStyles.formatList}>
              {FORMATS.map((fmt) => (
                <span key={fmt} className={formStyles.formatPill}>
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {dropboxError && (
        <p className={formStyles.dropboxError} role="alert">
          {dropboxError}
        </p>
      )}
      {showChips && isGoogleDriveConfigured && (
        <div
          id="upload-panel-google-drive"
          className={`${zoneClassName} ${showGoogleDrivePanel ? '' : formStyles.panelHidden}`}
          aria-hidden={!showGoogleDrivePanel}
        >
          <div className={formStyles.stateContent}>
            <button
              type="button"
              className={formStyles.changeSourceLink}
              aria-label="Change upload source"
              onClick={() => setSource('local')}
            >
              ← Change source
            </button>
            <GoogleDriveIcon className={formStyles.dropboxIconLarge} />
            <span className={formStyles.dropText}>
              Pick a Doc, Sheet, Slide, or file from your Google Drive.
            </span>
            <span className={formStyles.dropHint}>
              Docs work best as a bulleted outline — top bullet asks, indented bullet answers.
            </span>
            <button
              type="button"
              className={formStyles.chooseButton}
              onClick={handleGoogleDriveClick}
              disabled={drivePending}
              aria-label="Choose from Google Drive"
            >
              {drivePending ? 'Opening Google Drive' : 'Choose from Google Drive'}
            </button>
            <div className={formStyles.formatList}>
              {FORMATS.map((fmt) => (
                <span key={fmt} className={formStyles.formatPill}>
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {driveError && (
        <p className={formStyles.dropboxError} role="alert">
          {driveError}
        </p>
      )}
      {showChips && (
        <div className={formStyles.chipsRow}>
          <UploadSourceChips
            active={source}
            onChange={setSource}
            dropboxAvailable={isDropboxConfigured}
            googleDriveAvailable={isGoogleDriveConfigured}
          />
        </div>
      )}
      {downloadLink && (
        <a
          hidden
          target="_blank"
          aria-label="download link"
          href={downloadLink}
          download={getDownloadFileName(deckName || 'Untitled')}
          ref={downloadRef}
          rel="noreferrer"
        >
          {downloadLink}
        </a>
      )}
      <button
        aria-label="Upload file"
        className={sharedStyles.hidden}
        ref={convertRef}
        type="submit"
      />
    </form>
  );
}

export default UploadForm;
