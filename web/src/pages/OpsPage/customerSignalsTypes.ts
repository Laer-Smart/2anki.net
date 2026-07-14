export type CustomerSignalSource =
  | 'cancel_reason'
  | 'cancel_comment'
  | 'emoji_feedback'
  | 'failed_conversion'
  | 'empty_back';

export type CustomerSignalBucket =
  | 'pain-killer'
  | 'money-multiplier'
  | 'unknown';

export interface CustomerSignalRow {
  source: CustomerSignalSource;
  label: string;
  count: number;
  bucket: CustomerSignalBucket;
  sampleQuote?: string;
}

export interface CustomerSignalsResponse {
  signals: CustomerSignalRow[] | null;
  since: string;
  as_of: string;
  error?: string;
}
