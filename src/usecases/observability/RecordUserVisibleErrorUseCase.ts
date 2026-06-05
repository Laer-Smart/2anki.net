import type {
  IUserVisibleErrorsRepository,
  RecordErrorInput,
} from '../../data_layer/UserVisibleErrorsRepository';

export class RecordUserVisibleErrorUseCase {
  constructor(private readonly repository: IUserVisibleErrorsRepository) {}

  async execute(input: RecordErrorInput): Promise<void> {
    try {
      await this.repository.record(input);
    } catch (err) {
      console.error(
        'RecordUserVisibleErrorUseCase: failed to persist error record',
        err
      );
    }
  }
}
