export type UploadErrorCode =
  | 'unsupported_format'
  | 'too_large'
  | 'invalid_markup'
  | 'malformed_notion'
  | 'corrupted_apkg'
  | 'password_protected_pdf'
  | 'claude_parse_failed'
  | 'empty_export'
  | 'unknown';

export interface UploadErrorBody {
  code: UploadErrorCode;
  message: string;
}
