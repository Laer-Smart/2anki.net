import ShareService from '../../services/ShareService';
import { IUploadRepository } from '../../data_layer/UploadRespository';
import { UsersId } from '../../data_layer/public/Users';

export interface CreateShareResult {
  token: string;
  url: string;
}

class CreateShareUseCase {
  constructor(
    private readonly uploadRepository: IUploadRepository,
    private readonly shareService: ShareService
  ) {}

  async execute(owner: UsersId, uploadKey: string): Promise<CreateShareResult> {
    const upload = await this.uploadRepository.findByKey(owner, uploadKey);
    if (upload?.owner !== owner) {
      throw new Error('Upload not found');
    }

    const existing = await this.shareService.findActiveShareForOwnerAndKey(owner, uploadKey);
    if (existing != null) {
      return { token: existing.token, url: this.shareService.buildShareUrl(existing.token) };
    }

    const share = await this.shareService.createShare(owner, uploadKey);
    return { token: share.token, url: this.shareService.buildShareUrl(share.token) };
  }
}

export default CreateShareUseCase;
