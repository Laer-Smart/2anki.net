import {
  IErrorEventRepository,
  ErrorGroupRow,
  ListErrorGroupsOptions,
} from '../../data_layer/ErrorEventRepository';

export interface ListErrorGroupsResult {
  groups: ErrorGroupRow[];
  totalGroups: number;
}

export class ListErrorGroupsUseCase {
  constructor(private readonly repository: IErrorEventRepository) {}

  async execute(options: ListErrorGroupsOptions): Promise<ListErrorGroupsResult> {
    const [rawGroups, totalGroups] = await Promise.all([
      this.repository.listGroups(options),
      this.repository.countGroups(options.source),
    ]);
    const groups = rawGroups.map(({ message_hash, message, stack, url, release, source, user_id, user_agent, first_seen, last_seen, occurrences }) => ({
      message_hash,
      message,
      stack,
      url,
      release,
      source,
      user_id,
      user_agent,
      first_seen,
      last_seen,
      occurrences,
    }));
    return { groups, totalGroups };
  }
}
