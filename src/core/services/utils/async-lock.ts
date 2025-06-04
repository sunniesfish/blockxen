class AsyncLock {
  private locked: boolean = false;
  private waitingQueue: Array<() => void> = [];

  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }

    return new Promise<() => void>((resolve) => {
      this.waitingQueue.push(() => {
        this.locked = true;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    if (this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift();
      next?.();
    } else {
      this.locked = false;
    }
  }
}

export default AsyncLock;
