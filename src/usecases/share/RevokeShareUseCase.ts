import ShareService from '../../services/ShareService';
import { UsersId } from '../../data_layer/public/Users';

class RevokeShareUseCase {
  constructor(private readonly shareService: ShareService) {}

  async execute(token: string, owner: UsersId): Promise<boolean> {
    return this.shareService.revokeShare(token, owner);
  }
}

export default RevokeShareUseCase;
