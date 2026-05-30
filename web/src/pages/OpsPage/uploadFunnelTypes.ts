export interface UploadFunnelStages {
  upload_started: number;
  conversion_succeeded: number;
  conversion_failed: number;
  deck_downloaded: number;
}

export interface UploadFunnelResponse {
  stages: UploadFunnelStages | null;
  upload_to_download_rate_pct: number;
  since: string;
  as_of: string;
  error?: string;
}
