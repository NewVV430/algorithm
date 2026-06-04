export class CircularArray {
  array: number[];
  size: number; // 数组空间容量
  count: number; // 数组元素个数
  start: number; // 第一个有效元素的下标
  end: number; // 最后一个有效元素的下一个下标

  constructor(count:number) {
    this.array = new Array(count);
    this.size = count;
    this.start = 0;
    this.end = 0;
    this.count = 0;
  }

  // 给数组扩容/缩容
  resize(newSize: number) {
    let newArray = new Array(newSize);
    for(let i = 0; i < this.count; i++) {
      // 不能确定this.start是在哪个位置
      newArray[i] = this.array[(this.start + i) % this.size];    
    }
    this.array = newArray;
    this.start = 0; 
    this.end = this.count;
    this.size = newSize;
  }

  // 判断数组容量是否已满 
  isFull(): boolean {
    return this.count === this.size;
  }

  // 判断数组是否为空
  isEmpyty(): boolean {
    return this.count === 0;
  }

  // 在数组头部添加元素
  addFirst(newEle: number):number[] {
    if(this.isFull()) {
      this.resize(2 * this.size);
    }
    this.start = (this.start -1 + this.size) % this.size;
    this.array[this.start] = newEle;
    this.count++;
    return this.array;
  }

  // 在数组头部删减元素
  removeFirst(): number {
    if(this.isEmpyty()) {
      console.log('数组为空');
      return -1;
    }
    const removeEle = this.array[this.start];
    this.start = (this.start + 1) % this.size;
    this.count--;
    // 判断删减后是否需要缩容
    if(this.count > 0 && this.count == this.size / 4) {
      this.resize(this.size / 2);
    }
    return removeEle;
  }

  // 在数组尾部增加元素
  addLast(newEle: number): number[] {
    if(this.isFull()){
      this.resize(this.size * 2);
    }
    // 先把增加的元素赋值，再移动end
    this.array[this.end] = newEle;
    this.end = (this.end + 1) % this.size;
    this.count++;
    return this.array;
  }

  // 在数组尾部删除元素
  removeLast(): number {
    if(this.isEmpyty()){
      console.log('array empty');
      return -1;
    }
    const removeEle = this.array[(this.end - 1 + this.size) % this.size];
    this.end = (this.end - 1 + this.size) % this.size;
    this.count--;
    // 判断删减后是否需要缩容
    if(this.count > 0 && this.count == this.size / 4) {
      this.resize(this.size / 2);
    }
    return removeEle;
  }

}