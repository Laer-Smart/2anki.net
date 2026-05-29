const WINDOW_MS = 5 * 60 * 1000;
const CAPACITY = 50;

class NotionCallRingBuffer {
  private timestamps: number[] = [];
  private head = 0;
  private size = 0;

  record(): void {
    const now = Date.now();
    if (this.size < CAPACITY) {
      this.timestamps[this.head] = now;
      this.head = (this.head + 1) % CAPACITY;
      this.size += 1;
    } else {
      this.timestamps[this.head] = now;
      this.head = (this.head + 1) % CAPACITY;
    }
  }

  lastSuccessAt(): number | null {
    if (this.size === 0) return null;
    const cutoff = Date.now() - WINDOW_MS;
    let latest: number | null = null;
    for (let i = 0; i < this.size; i++) {
      const t = this.timestamps[i];
      if (t != null && t >= cutoff) {
        if (latest == null || t > latest) {
          latest = t;
        }
      }
    }
    return latest;
  }
}

export const notionCallRingBuffer = new NotionCallRingBuffer();
