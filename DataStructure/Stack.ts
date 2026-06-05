export class MyStack {

  array: number[];
  length: number;
  capacity: number;

  constructor() {
    this.array = new Array(1);
    this.length = 0;
    this.capacity = 1;
  }

  isEmpty(): boolean {
    return this.length === 0;
  }

  isFull(): boolean {
    return this.capacity === this.length;
  }

  resize(newSize: number): void {
    const newArray = new Array(newSize);
    for (let i = 0; i < this.length; i++) {
      newArray[i] = this.array[i];
    }
    this.array = newArray;
    this.capacity = newSize;
  }

  // 向栈顶插入元素，时间复杂度均摊 O(1)
  push(e: number): void {
    if (this.isFull()) {
      this.resize(this.capacity * 2);
    }
    this.array[this.length] = e;
    this.length++;
  }

  // 从栈顶删除元素，时间复杂度均摊 O(1)
  pop(): number {
    if (this.isEmpty()) {
      throw new Error('Stack is empty');
    }
    const deleteVal = this.array[this.length - 1];
    this.length--;
    if (this.capacity > 1 && this.length <= this.capacity / 4) {
      this.resize(Math.max(1, this.capacity / 2));
    }
    return deleteVal;
  }

  // 查看栈顶元素，时间复杂度 O(1)
  peek(): number {
    if (this.isEmpty()) {
      throw new Error('Stack is Empty');
    }
    return this.array[this.length - 1];
  }

  // 返回栈中的元素个数，时间复杂度 O(1)
  size(): number {
    return this.length;
  }
}
