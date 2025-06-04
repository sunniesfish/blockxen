/**
 * 큐 구현
 * 실제 사용되는 메서드만 구현
 */
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

  isEmpty(): boolean {
    return this.length === 0;
  }

  get length(): number {
    return this.inArray.length + this.outArray.length;
  }
}
