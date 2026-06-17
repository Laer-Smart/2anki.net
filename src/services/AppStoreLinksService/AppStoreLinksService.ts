export interface AppStoreLinks {
  available: boolean;
  iosUrl?: string;
  macUrl?: string;
}

// The native app ships from one universal App Store record, so iOS and Mac
// share the numeric Apple ID. The ID lives only in the server env
// (APPLE_IAP_APP_APPLE_ID, also used by AppleStoreKitService) — never baked into
// the web bundle — so the Download page reads it through this service. When the
// ID is unset the page degrades to its coming-soon state instead of rendering a
// dead link.
export default class AppStoreLinksService {
  getLinks(
    appleId: string | undefined = process.env.APPLE_IAP_APP_APPLE_ID
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
