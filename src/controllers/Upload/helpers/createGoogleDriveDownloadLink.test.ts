import {
  createGoogleDriveDownloadLink,
  createGoogleDriveExportLink,
  NATIVE_GOOGLE_APPS_EXPORT_MIMES,
} from './createGoogleDriveDownloadLink';
import { GoogleDriveFile } from '../../../data_layer/GoogleDriveRepository';

const baseFile: GoogleDriveFile = {
  id: 'file123',
  name: 'My Doc',
  mimeType: 'application/vnd.google-apps.document',
  iconUrl: '',
  url: '',
  sizeBytes: 0,
  embedUrl: '',
  description: '',
  driveSuccess: true,
  isShared: false,
  lastEditedUtc: 0,
  rotation: 0,
  rotationDegree: 0,
  serviceId: '',
  type: 'document',
};

describe('createGoogleDriveDownloadLink', () => {
  it('returns an alt=media download URL for a binary file', () => {
    const file = { ...baseFile, mimeType: 'application/pdf' };
    expect(createGoogleDriveDownloadLink(file)).toBe(
      'https://www.googleapis.com/drive/v3/files/file123?alt=media'
    );
  });
});

describe('createGoogleDriveExportLink', () => {
  it('returns an export URL with the given mime type', () => {
    expect(createGoogleDriveExportLink(baseFile, 'text/html')).toBe(
      'https://www.googleapis.com/drive/v3/files/file123/export?mimeType=text%2Fhtml'
    );
  });

  it('encodes the mime type correctly for CSV', () => {
    expect(createGoogleDriveExportLink(baseFile, 'text/csv')).toBe(
      'https://www.googleapis.com/drive/v3/files/file123/export?mimeType=text%2Fcsv'
    );
  });

  it('encodes the mime type correctly for PDF', () => {
    expect(createGoogleDriveExportLink(baseFile, 'application/pdf')).toBe(
      'https://www.googleapis.com/drive/v3/files/file123/export?mimeType=application%2Fpdf'
    );
  });
});

describe('NATIVE_GOOGLE_APPS_EXPORT_MIMES', () => {
  it('maps google-apps.document to docx mime with .docx extension', () => {
    expect(
      NATIVE_GOOGLE_APPS_EXPORT_MIMES['application/vnd.google-apps.document']
    ).toEqual({
      exportMime:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: '.docx',
    });
  });

  it('maps google-apps.spreadsheet to text/csv with .csv extension', () => {
    expect(
      NATIVE_GOOGLE_APPS_EXPORT_MIMES['application/vnd.google-apps.spreadsheet']
    ).toEqual({
      exportMime: 'text/csv',
      extension: '.csv',
    });
  });

  it('maps google-apps.presentation to pptx mime with .pptx extension', () => {
    expect(
      NATIVE_GOOGLE_APPS_EXPORT_MIMES[
        'application/vnd.google-apps.presentation'
      ]
    ).toEqual({
      exportMime:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: '.pptx',
    });
  });

  it('does not include google-apps.folder', () => {
    expect(
      NATIVE_GOOGLE_APPS_EXPORT_MIMES['application/vnd.google-apps.folder']
    ).toBeUndefined();
  });
});
