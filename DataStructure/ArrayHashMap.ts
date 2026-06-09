class Node<K, V> {
  key: K
  value: V

  constructor(key: K, val: V) {
    this.key = key;
    this.value = val;
  }
}

export class ArrayHashMap<K, V> {
  // key,index的映射
  map: Map<K, any>;
  // 真正的key-value集合;
  arr: Node<K, V>[];

  constructor() {
    this.map = new Map<K, Number>;
    this.arr = new Array<Node<K, V>>();
  }

  get(key: K) {
    if (!this.map.has(key)) {
      throw Error('哈希表中不存在该key')
    }
    return this.arr[this.map.get(key)!].value
  }

  put(key: K, value: V) {
    const node = new Node(key, value);
    if (!this.map.has(key)) {
      // 没有这个key
      this.arr.push(node);
      // 需要在map中新增 key-index 的映射对
      this.map.set(key, this.arr.length - 1);
      return;
    }
    // 覆盖已有的value
    const index = this.map.get(key);
    this.arr[index].value = value;


  }

  remove(key: K) {
    if(!this.map.has(key)){
      throw Error('哈希表中不存在该key');
    }
    const index = this.map.get(key);
    // 交换 这个index 和 末尾元素（数组 + map) 
    if(index !== this.arr.length - 1) {
      const removeNode = this.arr[index];
      const lastNode = this.arr[this.arr.length - 1];
      
      // 更新map
      this.map.set(lastNode.key, index);

      // 交换元素 将removeNode和lastNode交换位置
      this.arr[index] = lastNode;
      this.arr[this.arr.length - 1] = removeNode;
    }
    // 删除末尾元素
    this.arr.pop();
    // 删除map中这个key的映射
    this.map.delete(key)
  }

  // 随机弹出一个键
  randomKey() {
    const length = this.arr.length;
    const randomIndex = Math.floor(Math.random()* length);
    return this.arr[randomIndex].key;
  }
}