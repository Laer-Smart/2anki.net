import { ProvisionResult, RacService } from '../../services/ankify/RacService';

class ProvisionAnkifyClientUseCase {
  constructor(private readonly rac: RacService) {}

  execute(owner: number): Promise<ProvisionResult> {
    return this.rac.provision(owner);
  }
}

export default ProvisionAnkifyClientUseCase;
