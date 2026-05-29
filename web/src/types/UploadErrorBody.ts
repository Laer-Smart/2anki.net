export type UploadErrorCode =
  | 'unsupported_format'
  | 'too_large'
  | 'invalid_markup'
  | 'malformed_notion'
  | 'corrupted_apkg'
  | 'password_protected_pdf'
  | 'pdf_processing_failed'
  | 'docx_processing_failed'
  | 'claude_parse_failed'
  | 'empty_export'
  | 'markdown_likely_lossy'
  | 'unknown';

export interface UploadErrorBody {
  code: UploadErrorCode;
  message: string;
}
