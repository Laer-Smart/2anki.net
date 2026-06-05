import { ProvisionResult, RacService } from '../../services/ankify/RacService';

class RespinAnkifyClientUseCase {
  constructor(private readonly rac: RacService) {}

  execute(owner: number): Promise<ProvisionResult> {
    return this.rac.respin(owner);
  }
}

export default RespinAnkifyClientUseCase;
