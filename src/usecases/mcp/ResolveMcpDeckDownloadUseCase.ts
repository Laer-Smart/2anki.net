import { IUploadRepository } from '../../data_layer/UploadRespository';

export const MCP_DECK_PRESIGN_TTL_SECONDS = 300;

export interface DeckPresigner {
  getPresignedUrl(
    key: string,
    expiresSeconds?: number,
    filename?: string
  ): Promise<string>;
}

export type ResolveMcpDeckDownloadResult =
  | { kind: 'redirect'; url: string; owner: number }
  | { kind: 'not_found' };

export class ResolveMcpDeckDownloadUseCase {
  constructor(
    private readonly uploads: IUploadRepository,
    private readonly storage: DeckPresigner
  ) {}

  async resolve(objectId: string): Promise<ResolveMcpDeckDownloadResult> {
    const upload = await this.uploads.findByObjectId(objectId);
    if (upload == null || upload.key == null) {
      return { kind: 'not_found' };
    }
    const filename = upload.filename ?? 'deck.apkg';
    const url = await this.storage.getPresignedUrl(
      upload.key,
      MCP_DECK_PRESIGN_TTL_SECONDS,
      filename
    );
    return { kind: 'redirect', url, owner: upload.owner };
  }
}
