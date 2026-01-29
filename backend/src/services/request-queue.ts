/**
 * Simple Request Queue to prevent overwhelming Vertex AI
 * Serializes video analysis requests to avoid 429 rate limit errors
 */

interface QueuedRequest {
  id: string;
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private maxConcurrent = 1; // Start with 1 concurrent request
  private activeCount = 0;

  constructor(maxConcurrent = 1) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add a request to the queue
   */
  public async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        fn,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(request);
      console.log(`📋 Request queued. Queue size: ${this.queue.length}, Active: ${this.activeCount}`);

      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const request = this.queue.shift();

      if (!request) {
        break;
      }

      this.activeCount++;
      const waitTime = Date.now() - request.timestamp;

      console.log(
        `⏳ Processing request (waited ${waitTime}ms). Active: ${this.activeCount}/${this.maxConcurrent}`,
      );

      try {
        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        console.error(`❌ Request failed:`, error);
        request.reject(error);
      } finally {
        this.activeCount--;

        // Small delay between requests to avoid rapid-fire calls
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Continue processing if there are more requests
        if (this.queue.length > 0) {
          this.processQueue();
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get queue statistics
   */
  public getStats() {
    return {
      queueSize: this.queue.length,
      activeCount: this.activeCount,
      maxConcurrent: this.maxConcurrent,
      totalPending: this.queue.length + this.activeCount,
    };
  }
}

// Export singleton instance
export const requestQueue = new RequestQueue(1); // 1 concurrent request
