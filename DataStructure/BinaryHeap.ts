export class MinHeap {
  heap: number[];
  size: number;

  constructor(capacity: number) {
    // 容量最小值改为 1，避免 capacity = 0 时扩容永远还是 0。
    this.heap = new Array(Math.max(1, capacity));
    this.size = 0;
  }

  getSize(): number {
    return this.size;
  }

  isEmpty(): boolean {
    return this.size === 0;
  }

  resize(newSize: number): void {
    const newArray = new Array(newSize);
    for (let i = 0; i < this.size; i++) {
      newArray[i] = this.heap[i];
    }
    this.heap = newArray;
  }

  // 交换元素
  swap(i: number, j: number): void {
    let temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  // 获取父元素下标
  parent(index: number): number {
    return Math.floor((index - 1) / 2);
  }

  // 获取左子元素下标
  leftChild(index: number): number {
    return 2 * index + 1;
  }

  // 获取右子元素下标
  rightChild(index: number): number {
    return 2 * index + 2;
  }

  // 判断下标是否越界 
  isIndexOutOfBounds(index: number): boolean {
    return index >= this.getSize();
  }


  // 上浮操作
  swim(index: number): void {
    // 向上找
    let parentIndex = this.parent(index);
    while (index > 0 && this.heap[index] < this.heap[parentIndex]) {
      // 与父节点交换
      this.swap(parentIndex, index);
      index = parentIndex;
      parentIndex = this.parent(index);
    }
  }

  // 下沉操作
  sink(index: number): void {
    // 向下找
    while (!this.isIndexOutOfBounds(this.leftChild(index))) {
      let minIndex = this.leftChild(index);
      const rightChildIndex = this.rightChild(index);

      if (!this.isIndexOutOfBounds(rightChildIndex) && this.heap[rightChildIndex] < this.heap[minIndex]) {
        minIndex = rightChildIndex;
      }
      if (this.heap[index] <= this.heap[minIndex]) break;
      this.swap(index, minIndex);
      index = minIndex;
    }
  }

  peak(): number {
    if (this.isEmpty()) {
      throw Error('堆为空');
    }
    return this.heap[0];
  }

  // 插入元素
  push(value: number): void {
    // 插入前判断是否需要扩容
    if (this.size >= this.heap.length) {
      this.resize(this.heap.length * 2);
    }
    this.heap[this.getSize()] = value;
    this.swim(this.getSize());
    this.size++;
  }

  // 删除元素
  pop(): number {
    if (this.isEmpty()) {
      throw Error('堆为空');
    }
    const popElement = this.peak();
    this.swap(0, this.size - 1);
    this.size--;
    this.sink(0);
    // 缩容时保证容量是整数, 并且不会缩到0
    if (this.heap.length > 1 && this.size < Math.floor(this.heap.length / 4)) {
      this.resize(Math.max(1, Math.floor(this.heap.length / 2)));
    }
    return popElement;
  }
}
