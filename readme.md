# Algorithm Runner

这个仓库使用 `main.ts` 作为命令行运行器，用来直接执行 `DataStructure/` 或 `problem/` 目录下的 TypeScript 算法文件。

它支持两类题型：

- 普通算法题：调用某个 class 中的一个方法。
- 设计类题：创建一个实例后，连续调用多个方法，并保留实例状态。

## 目录约定

算法文件建议放在：

```text
DataStructure/
problem/
```

算法 class 建议使用 `export` 导出：

```ts
export class Solution {
  twoSum(nums: number[], target: number) {
    return [];
  }
}
```

## 查看帮助

```bash
node main.ts --help
```

## 普通算法题

适合类似 `twoSum`、`maxProfit`、`reverseList` 这类一次调用就能得到答案的题。

命令格式：

```bash
node main.ts <文件路径> [类名] [方法名] --args '<JSON数组>'
```

示例：

```bash
node main.ts problem/TwoSum.ts Solution twoSum --args '[[2,7,11,15],9]'
```

等价的简写形式：

```bash
node main.ts TwoSum Solution twoSum '[2,7,11,15]' 9
```

说明：

- `<文件路径>` 可以写完整路径，例如 `problem/TwoSum.ts`。
- 如果文件在 `DataStructure/` 或 `problem/` 下，也可以省略目录和 `.ts` 后缀，例如 `TwoSum`。
- `[类名]` 可以省略，但前提是文件中只导出了一个 class。
- `[方法名]` 可以省略，省略时会依次尝试 `run`、`main`、`test`。
- `--args` 是传给目标方法的参数数组。

## 设计类题

适合队列、栈、LRU Cache、哈希集合、循环数组等需要连续调用多个方法并保留状态的题。

命令格式：

```bash
node main.ts <文件路径> [类名] --calls '<JSON字符串数组>' --args '<二维JSON数组>'
```

示例：

```bash
node main.ts MyQueue MyQueue \
  --calls '["MyQueue","push","push","pop","empty"]' \
  --args '[[],[1],[2],[],[]]'
```

也可以用 `constructor` 表示构造函数：

```bash
node main.ts MyQueue MyQueue \
  --calls '["constructor","push","push","pop","empty"]' \
  --args '[[],[1],[2],[],[]]'
```

执行逻辑：

```ts
const instance = new MyQueue();
instance.push(1);
instance.push(2);
instance.pop();
instance.empty();
```

输出会是一个数组。构造函数和返回 `undefined` 的方法会输出 `null`：

```json
[null, null, null, 1, false]
```

## 参数规则

### `--args`

普通算法题中，`--args` 是传给单个方法的参数数组：

```bash
--args '[[2,7,11,15],9]'
```

表示：

```ts
solution.twoSum([2, 7, 11, 15], 9);
```

设计类题中，`--args` 必须是二维数组，每一项对应 `--calls` 中同位置的一次调用：

```bash
--calls '["constructor","add","get"]'
--args '[[5],[8],[]]'
```

表示：

```ts
const instance = new ClassName(5);
instance.add(8);
instance.get();
```

### 位置参数

普通算法题也可以不用 `--args`，直接把参数放在方法名后面：

```bash
node main.ts TwoSum Solution twoSum '[2,7,11,15]' 9
```

这些参数会逐个尝试按 JSON 解析：

- `9` 会解析成数字。
- `true` 会解析成布尔值。
- `[1,2,3]` 会解析成数组。
- 解析失败时会保留为字符串。

## 导入和导出

`main.ts` 会对目标 TypeScript 文件做简单转换，支持常见写法：

```ts
export class Solution {}
export default class Solution {}
import { Foo } from "./Foo";
import Foo from "./Foo";
```

这个运行器适合算法练习文件，不等同于完整 TypeScript 编译构建系统。复杂语法或复杂模块导出方式可能需要额外适配。

## 常见问题

### 找不到文件

确认文件在以下位置之一：

```text
./
DataStructure/
problem/
```

也可以直接传绝对路径。

### 需要指定类名

如果一个文件里导出了多个 class，需要在命令中显式指定类名：

```bash
node main.ts SomeFile SomeClass someMethod --args '[]'
```

### 连续调用模式下状态是否保留

保留。`--calls` 模式只创建一次实例，后续方法都在同一个实例上调用。

### 单方法模式下状态是否保留

不保留。每次执行 `node main.ts ...` 都是一个新的 Node 进程，会重新加载文件并重新创建实例。

