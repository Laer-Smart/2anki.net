import ShareService from '../../services/ShareService';
import DeckShares from '../../data_layer/public/DeckShares';
import { UsersId } from '../../data_layer/public/Users';
import StorageHandler from '../../lib/storage/StorageHandler';
import ApkgPreviewService from '../../services/ApkgPreviewService/ApkgPreviewService';

const TITLE_MAX_LENGTH = 120;

class PublishShareUseCase {
  constructor(
    private readonly shareService: ShareService,
    private readonly storage: StorageHandler,
    private readonly previewService: ApkgPreviewService
  ) {}

  async execute(
    token: string,
    owner: UsersId,
    isPublic: boolean,
    title?: string
  ): Promise<DeckShares | null> {
    const share = await this.shareService.findShareForOwner(token, owner);
    if (share == null) {
      return null;
    }

    if (!isPublic) {
      return this.shareService.setPublicListing(token, owner, {
        isPublic: false,
        title: null,
        cardCount: null,
      });
    }

    const trimmedTitle = (title ?? '').trim();
    if (trimmedTitle.length === 0) {
      throw new Error('Title is required to publish a deck.');
    }

    const cardCount = await this.countCards(share);

    return this.shareService.setPublicListing(token, owner, {
      isPublic: true,
      title: trimmedTitle.slice(0, TITLE_MAX_LENGTH),
      cardCount,
    });
  }

  private async countCards(share: DeckShares): Promise<number | null> {
    try {
      const fileOutput = await this.storage.getFileContents(share.upload_key);
      if (fileOutput.Body == null) {
        return null;
      }
      const parsed = await this.previewService.parse(
        `share:${share.token}`,
        fileOutput.Body as Buffer
      );
      return this.previewService.getMeta(parsed).totalCards;
    } catch {
      return null;
    }
  }
}

export default PublishShareUseCase;
