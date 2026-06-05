import { AnkifyClientView, RacService } from '../../services/ankify/RacService';

class ReissueAnkifySessionUrlUseCase {
  constructor(private readonly rac: RacService) {}

  execute(id: number, owner: number): Promise<AnkifyClientView | null> {
    return this.rac.reissueSessionUrl(id, owner);
  }
}

export default ReissueAnkifySessionUrlUseCase;
