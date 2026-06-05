import { AnkifyClientView, RacService } from '../../services/ankify/RacService';

class ListAnkifyClientsUseCase {
  constructor(private readonly rac: RacService) {}

  execute(owner: number): Promise<AnkifyClientView[]> {
    return this.rac.list(owner);
  }
}

export default ListAnkifyClientsUseCase;
