import {
  ErrorGroupRow,
  ErrorSampleRow,
  IErrorEventRepository,
  ResolutionStatus,
} from '../../data_layer/ErrorEventRepository';

const EXPORT_GROUP_LIMIT = 200;
const USER_AGENT_MAX_LENGTH = 100;

const PREAMBLE =
  'Investigate these production error groups from 2anki.net. For each: root cause, severity, recommended fix.';

export interface ExportErrorGroupsOptions {
  source?: 'web' | 'server';
  status: ResolutionStatus;
}

function singleLine(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function renderSample(sample: ErrorSampleRow | undefined): string[] {
  if (sample == null) {
    return [];
  }
  const userAgent =
    sample.user_agent == null
      ? '(none)'
      : truncate(sample.user_agent, USER_AGENT_MAX_LENGTH);
  const lines = [
    '',
    'Latest sample:',
    '',
    `- Release: ${sample.release ?? '(unknown)'}`,
    `- URL: ${sample.url ?? '(none)'}`,
    `- User agent: ${userAgent}`,
    `- User: ${sample.user_id == null ? 'anonymous' : sample.user_id}`,
  ];
  if (sample.stack != null && sample.stack !== '') {
    lines.push('', 'Stack:', '', '```', sample.stack, '```');
  }
  return lines;
}

function renderGroup(
  group: ErrorGroupRow,
  index: number,
  sample: ErrorSampleRow | undefined
): string {
  return [
    `## ${index + 1}. ${singleLine(group.message)}`,
    '',
    `- Source: ${group.source}`,
    `- Occurrences: ${group.occurrences}`,
    `- First seen: ${group.first_seen}`,
    `- Last seen: ${group.last_seen}`,
    ...renderSample(sample),
  ].join('\n');
}

export class ExportErrorGroupsUseCase {
  constructor(private readonly repository: IErrorEventRepository) {}

  async execute(options: ExportErrorGroupsOptions): Promise<string> {
    const groups = await this.repository.listGroups({
      limit: EXPORT_GROUP_LIMIT,
      offset: 0,
      source: options.source,
      sort: 'occurrences',
      status: options.status,
    });
    if (groups.length === 0) {
      return `${PREAMBLE}\n\nNo error groups match.\n`;
    }
    const samples = await this.repository.latestSamples(
      groups.map((group) => group.message_hash)
    );
    const sampleByHash = new Map(
      samples.map((sample) => [sample.message_hash, sample])
    );
    const sections = groups.map((group, index) =>
      renderGroup(group, index, sampleByHash.get(group.message_hash))
    );
    return [PREAMBLE, '', sections.join('\n\n'), ''].join('\n');
  }
}
