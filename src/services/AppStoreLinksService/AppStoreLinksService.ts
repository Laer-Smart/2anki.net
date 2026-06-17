export interface AppStoreLinks {
  available: boolean;
  iosUrl?: string;
  macUrl?: string;
}

// The native app ships from one universal App Store record (bundle
// no.laersmart.-anki), so iOS, iPad, and Mac share one numeric Apple ID. The ID
// is a public identifier — it appears in every apps.apple.com URL — so it lives
// here as a stable default. APPLE_IAP_APP_APPLE_ID (also used by
// AppleStoreKitService) overrides it without a redeploy if the record ever
// changes. The page only falls back to its coming-soon state if both are empty.
export const DEFAULT_APP_STORE_APPLE_ID = '6775249373';

export default class AppStoreLinksService {
  getLinks(
    appleId: string | undefined = process.env.APPLE_IAP_APP_APPLE_ID ||
      DEFAULT_APP_STORE_APPLE_ID
  ): AppStoreLinks {
    if (appleId == null || appleId === '') {
      return { available: false };
    }
    return {
      available: true,
      iosUrl: `https://apps.apple.com/app/id${appleId}`,
      macUrl: `https://apps.apple.com/app/id${appleId}?mt=12`,
    };
  }
}
