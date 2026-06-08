class Node<K, V> {
  key: K | null;
  val: V | null;
  prev: Node<K, V> | null;
  next: Node<K, V> | null;

  constructor(key: K | null, val: V | null) {
    this.key = key;
    this.val = val;
    this.prev = null;
    this.next = null;
  }
}

export class LinkedHashMap<K = any, V = any> {
  hashMap: Map<K, Node<K, V>>;
  head: Node<K, V>;
  tail: Node<K, V>;
  constructor() {
    this.hashMap = new Map();
    this.head = new Node<K, V>(null, null);
    this.tail = new Node<K, V>(null, null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: K): V {
    if (!this.hashMap.has(key)) {
      throw Error('哈希表中未找到对应的key')
    }
    return this.hashMap.get(key)!.val as V;
  }

  put(key: K, val: V) {
    // 先判断map中是否已经存在key了
    if (this.hashMap.has(key)) {
      // 进行值的替换
      this.hashMap.get(key)!.val = val;
      return;
    }
    const newNode = new Node(key, val);
    this.addLastNode(newNode);
    this.hashMap.set(key, newNode);
  }


  remove(key: K) {
    if (!this.hashMap.has(key)) {
      throw Error('哈希表中不存在key，删除失败');
    }
    const node = this.hashMap.get(key)!;
    this.removeNode(node);
    this.hashMap.delete(key);
  }

  containsKey(key: K) {
    return this.hashMap.has(key);
  }

  keys(): K[] {
    const keyList: K[] = [];
    let p = this.head.next;
    while (p !== this.tail) {
      keyList.push(p!.key as K);
      p = p!.next;
    }
    return keyList;
  }

  addLastNode(x: Node<K, V>) {
    const lastNode = this.tail.prev;
    lastNode!.next = x;
    x.prev = lastNode;
    x.next = this.tail;
    this.tail.prev = x;
  }

  removeNode(x: Node<K, V>) {
    x.prev!.next = x.next;
    x.next!.prev = x.prev;
    // 将引用彻底清除
    x.prev = null;
    x.next = null;
    x.key = null;
    x.val = null;
  }
}
