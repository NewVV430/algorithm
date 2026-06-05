class Node {
  val: number;
  next: Node | null;

  constructor(element: number) {
    this.val = element;
    this.next = null;
  }
}

export class MyQueue {
  length: number;
  head: Node | null;
  tail: Node | null;

  constructor() {
    this.head = this.tail = null;
    this.length = 0;
  }

  // 判空
  isEmpty(): boolean {
    return this.length === 0;
  }


  // 遍历链表并输出
  dump(): void {
    for (let p = this.head; p != null; p = p.next) console.log(p.val);
  }

  // 向队尾插入元素，时间复杂度 O(1)
  push(e: number): void {
    const newNode = new Node(e);
    if (this.isEmpty()) {
      this.head = this.tail = newNode;
      this.length++;
      return;
    }
    this.tail!.next = newNode;
    this.tail = newNode;
    this.length++;
  }

  // 从队头删除元素，时间复杂度 O(1)
  pop(): number {
    if (this.isEmpty()) {
      throw new Error('队列为空');
    }

    const deleteVal = this.head!.val;
    this.head = this.head!.next;
    this.length--;

    if (this.length === 0) {
      // 队列中无元素
      this.head = this.tail = null;
    }

    return deleteVal;
  }

  // 查看队头元素，时间复杂度 O(1)
  peek(): number {
    if (this.isEmpty()) {
      throw new Error('队列为空');
    }

    return this.head!.val;
  }

  // 返回队列中的元素个数，时间复杂度 O(1)
  size(): number {
    return this.length;
  }
}
