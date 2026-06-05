import { GoogleDriveFile } from '../../../data_layer/GoogleDriveRepository';

export const NATIVE_GOOGLE_APPS_EXPORT_MIMES: Record<
  string,
  { exportMime: string; extension: string }
> = {
  'application/vnd.google-apps.document': {
    exportMime:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: '.docx',
  },
  'application/vnd.google-apps.spreadsheet': {
    exportMime: 'text/csv',
    extension: '.csv',
  },
  'application/vnd.google-apps.presentation': {
    exportMime:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extension: '.pptx',
  },
};

export function createGoogleDriveDownloadLink(file: GoogleDriveFile) {
  return 'https://www.googleapis.com/drive/v3/files/' + file.id + '?alt=media';
}

export function createGoogleDriveExportLink(
  file: GoogleDriveFile,
  exportMime: string
) {
  return (
    'https://www.googleapis.com/drive/v3/files/' +
    file.id +
    '/export?mimeType=' +
    encodeURIComponent(exportMime)
  );
}
