// Errors that are the client's fault and fully handled by ErrorHandler as a
// 4xx — not bugs to investigate. Logging a full stack for these floods the
// server logs and buries real crashes. Mirrors the dashboard skip in
// ErrorCaptureMiddleware (entity.parse.failed) and extends it to the expected
// upload-shape errors that resolve to a clean 400.
export const isExpectedClientFault = (error?: Error): boolean => {
  if (!error) {
    return false;
  }
  if ((error as { type?: string }).type === 'entity.parse.failed') {
    return true;
  }
  return error.name === 'AnkiAppExportError';
};
