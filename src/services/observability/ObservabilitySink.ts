import {
  IObservabilityRepository,
  OutboundCallLogRow,
  RequestLogRow,
} from '../../data_layer/ObservabilityRepository';

export const OBSERVABILITY_FLUSH_THRESHOLD = 100;
export const OBSERVABILITY_FLUSH_INTERVAL_MS = 5000;

export class ObservabilitySink {
  private requestBuffer: RequestLogRow[] = [];

  private outboundBuffer: OutboundCallLogRow[] = [];

  private intervalHandle: NodeJS.Timeout | null = null;

  private pendingFlush: Promise<void> | null = null;

  constructor(
    private readonly repository: IObservabilityRepository,
    private readonly options: {
      flushThreshold?: number;
      flushIntervalMs?: number;
    } = {}
  ) {}

  start() {
    if (this.intervalHandle != null) return;
    const interval =
      this.options.flushIntervalMs ?? OBSERVABILITY_FLUSH_INTERVAL_MS;
    this.intervalHandle = setInterval(() => {
      void this.flush();
    }, interval);
    this.intervalHandle.unref();
  }

  stop() {
    if (this.intervalHandle != null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  recordRequest(row: RequestLogRow) {
    this.requestBuffer.push(row);
    this.maybeFlush();
  }

  recordOutboundCall(row: OutboundCallLogRow) {
    this.outboundBuffer.push(row);
    this.maybeFlush();
  }

  async flush(): Promise<void> {
    const requests = this.requestBuffer;
    const outbound = this.outboundBuffer;
    this.requestBuffer = [];
    this.outboundBuffer = [];

    const tasks: Promise<unknown>[] = [];
    if (requests.length > 0) {
      tasks.push(
        this.repository.insertRequestLogs(requests).catch((error) => {
          console.error(
            `[observability] dropping ${requests.length} request log(s):`,
            error
          );
        })
      );
    }
    if (outbound.length > 0) {
      tasks.push(
        this.repository.insertOutboundCallLogs(outbound).catch((error) => {
          console.error(
            `[observability] dropping ${outbound.length} outbound log(s):`,
            error
          );
        })
      );
    }
    await Promise.all(tasks);
  }

  waitForPendingFlush(): Promise<void> {
    return this.pendingFlush ?? Promise.resolve();
  }

  private maybeFlush() {
    const threshold =
      this.options.flushThreshold ?? OBSERVABILITY_FLUSH_THRESHOLD;
    if (
      this.requestBuffer.length < threshold &&
      this.outboundBuffer.length < threshold
    ) {
      return;
    }
    if (this.pendingFlush != null) return;
    this.pendingFlush = this.flush().finally(() => {
      this.pendingFlush = null;
    });
  }
}
