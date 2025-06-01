export class Queue<T> {
  private readonly inArray: T[] = [];
  private readonly outArray: T[] = [];

  enqueue(item: T): void {
    this.inArray.push(item);
  }

  dequeue(): T {
    if (this.length === 0) throw new Error("Queue is empty");

    if (this.outArray.length === 0) {
      while (this.inArray.length > 0) {
        this.outArray.push(this.inArray.pop()!);
      }
    }
    return this.outArray.pop()!;
  }

  peek(): T {
    if (this.length === 0) throw new Error("Queue is empty");

    if (this.outArray.length === 0) {
      return this.inArray[0];
    }

    return this.outArray[this.outArray.length - 1];
  }

  isEmpty(): boolean {
    return this.length === 0;
  }

  size(): number {
    return this.length;
  }

  clear(): void {
    this.inArray.length = 0;
    this.outArray.length = 0;
  }

  toArray(): T[] {
    const totalLength = this.length;
    if (totalLength === 0) return [];

    const result: T[] = new Array(totalLength);
    let index = 0;

    for (let i = this.outArray.length - 1; i >= 0; i--) {
      result[index++] = this.outArray[i];
    }

    for (let i = 0; i < this.inArray.length; i++) {
      result[index++] = this.inArray[i];
    }

    return result;
  }

  get length(): number {
    return this.inArray.length + this.outArray.length;
  }
}
