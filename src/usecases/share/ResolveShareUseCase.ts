import ShareService from '../../services/ShareService';
import DeckShares from '../../data_layer/public/DeckShares';

class ResolveShareUseCase {
  constructor(private readonly shareService: ShareService) {}

  async execute(token: string): Promise<DeckShares | null> {
    return this.shareService.findActiveShare(token);
  }
}

export default ResolveShareUseCase;
