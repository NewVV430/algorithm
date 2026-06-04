const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { stripTypeScriptTypes } = require("node:module");

const PROJECT_ROOT = __dirname;
const SEARCH_DIRS = ["DataStructure", "problem"];

const moduleCache = new Map();

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  const options = parseCliArgs(args);
  const filePath = resolveTsFile(options.file);
  const loadedModule = loadTsModule(filePath);
  const ClassConstructor = pickClass(loadedModule.exports, options.className);

  if (!ClassConstructor) {
    printClassList(filePath, loadedModule.exports);
    process.exitCode = 1;
    return;
  }

  if (options.callNames.length > 0) {
    const results = await runCallSequence(ClassConstructor, options);
    printResult(results);
    return;
  }

  const methodName = options.methodName || pickDefaultMethod(ClassConstructor);

  if (!methodName) {
    printMethodList(ClassConstructor, options.className);
    return;
  }

  const target = getCallableTarget(ClassConstructor, methodName);

  if (!target) {
    console.error(`没有找到可执行方法: ${ClassConstructor.name}.${methodName}()`);
    printMethodList(ClassConstructor, ClassConstructor.name);
    process.exitCode = 1;
    return;
  }

  const result = target.method.apply(target.receiver, options.methodArgs);
  const awaitedResult = result && typeof result.then === "function" ? await result : result;

  printResult(awaitedResult);
}

function parseCliArgs(args) {
  const options = {
    file: "",
    className: "",
    methodName: "",
    methodArgs: [],
    callNames: [],
  };

  const positional = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--args") {
      const value = args[index + 1];

      if (value === undefined) {
        throw new Error("--args 后面需要跟一个 JSON 数组，例如 --args '[[2,7,11,15],9]'");
      }

      options.methodArgs = parseArgsJson(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--args=")) {
      options.methodArgs = parseArgsJson(arg.slice("--args=".length));
      continue;
    }

    if (arg === "--calls") {
      const value = args[index + 1];

      if (value === undefined) {
        throw new Error("--calls 后面需要跟一个 JSON 字符串数组，例如 --calls '[\"MyQueue\",\"push\",\"pop\"]'");
      }

      options.callNames = parseCallsJson(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--calls=")) {
      options.callNames = parseCallsJson(arg.slice("--calls=".length));
      continue;
    }

    positional.push(arg);
  }

  options.file = positional[0] || "";
  options.className = positional[1] || "";
  options.methodName = positional[2] || "";

  if (options.methodArgs.length === 0) {
    options.methodArgs = positional.slice(3).map(parseValue);
  }

  if (!options.file) {
    throw new Error("缺少文件路径，例如: node main.ts problem/TwoSum.ts Solution twoSum --args '[[2,7,11,15],9]'");
  }

  if (options.callNames.length > 0 && options.methodName) {
    throw new Error("--calls 连续调用模式下不需要再传方法名，请使用: node main.ts <文件路径> [类名] --calls '[]' --args '[]'");
  }

  return options;
}

function parseArgsJson(value) {
  const parsed = parseValue(value);

  if (!Array.isArray(parsed)) {
    throw new Error("--args 必须是 JSON 数组，例如 --args '[[2,7,11,15],9]'");
  }

  return parsed;
}

function parseCallsJson(value) {
  const parsed = parseValue(value);

  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error("--calls 必须是 JSON 字符串数组，例如 --calls '[\"MyQueue\",\"push\",\"pop\"]'");
  }

  if (parsed.length === 0) {
    throw new Error("--calls 至少需要包含一个调用名称");
  }

  return parsed;
}

function parseValue(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
}

function resolveTsFile(input) {
  const candidates = [];
  const normalizedInput = input.endsWith(".ts") ? input : `${input}.ts`;

  if (path.isAbsolute(normalizedInput)) {
    candidates.push(normalizedInput);
  } else {
    candidates.push(path.resolve(PROJECT_ROOT, normalizedInput));

    for (const dir of SEARCH_DIRS) {
      candidates.push(path.resolve(PROJECT_ROOT, dir, normalizedInput));
    }
  }

  const found = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());

  if (!found) {
    throw new Error(`找不到 TS 文件: ${input}`);
  }

  return found;
}

function loadTsModule(filePath) {
  const resolvedPath = path.resolve(filePath);

  if (moduleCache.has(resolvedPath)) {
    return moduleCache.get(resolvedPath);
  }

  const source = fs.readFileSync(resolvedPath, "utf8");
  const classNames = collectClassNames(source);
  const module = { exports: {} };
  const dirname = path.dirname(resolvedPath);

  moduleCache.set(resolvedPath, module);

  const script = new vm.Script(toCommonJs(source, classNames), {
    filename: resolvedPath,
  });

  const sandbox = {
    console,
    module,
    exports: module.exports,
    require: (request) => localRequire(request, dirname),
    __dirname: dirname,
    __filename: resolvedPath,
    process,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
  };

  script.runInNewContext(sandbox);

  return module;
}

function localRequire(request, dirname) {
  if (!request.startsWith(".") && !path.isAbsolute(request)) {
    return require(request);
  }

  const basePath = path.isAbsolute(request) ? request : path.resolve(dirname, request);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.js`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.js"),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());

  if (!found) {
    throw new Error(`找不到导入文件: ${request}`);
  }

  if (found.endsWith(".ts")) {
    return loadTsModule(found).exports;
  }

  return require(found);
}

function toCommonJs(source, classNames) {
  const code = stripTypesWithoutWarning(source);
  const defaultExports = [];
  const namedExports = new Set(classNames);
  let importIndex = 0;

  let transformed = code
    .replace(/import\s+type\s+[^;]+;?\s*/g, "")
    .replace(/import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["'];?/g, 'const $1 = require("$2");')
    .replace(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, 'const {$1} = require("$2");')
    .replace(/import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["'];?/g, (_match, name, request) => {
      const moduleName = `__imported_default_${importIndex}`;
      importIndex += 1;
      return `const ${moduleName} = require("${request}"); const ${name} = ${moduleName}.default ?? ${moduleName};`;
    })
    .replace(/import\s+["']([^"']+)["'];?/g, 'require("$1");');

  transformed = transformed.replace(
    /export\s+default\s+class\s+([A-Za-z_$][\w$]*)/g,
    (_match, name) => {
      namedExports.add(name);
      defaultExports.push(name);
      return `class ${name}`;
    },
  );

  transformed = transformed.replace(
    /export\s+class\s+([A-Za-z_$][\w$]*)/g,
    (_match, name) => {
      namedExports.add(name);
      return `class ${name}`;
    },
  );

  transformed = transformed.replace(/export\s+default\s+([A-Za-z_$][\w$]*);?/g, (_match, name) => {
    defaultExports.push(name);
    return "";
  });

  transformed = transformed.replace(/export\s+\{([^}]+)\};?/g, (_match, names) => {
    for (const part of names.split(",")) {
      const exportName = part.trim().split(/\s+as\s+/).pop();

      if (exportName) {
        namedExports.add(exportName);
      }
    }

    return "";
  });

  const exportLines = [];

  for (const name of namedExports) {
    exportLines.push(`if (typeof ${name} !== "undefined") module.exports.${name} = ${name};`);
  }

  for (const name of defaultExports) {
    exportLines.push(`if (typeof ${name} !== "undefined") module.exports.default = ${name};`);
  }

  return `${transformed}\n${exportLines.join("\n")}\n`;
}

function stripTypesWithoutWarning(source) {
  if (typeof stripTypeScriptTypes !== "function") {
    return source;
  }

  const originalEmitWarning = process.emitWarning;

  process.emitWarning = (warning, ...args) => {
    if (String(warning).includes("stripTypeScriptTypes")) {
      return;
    }

    originalEmitWarning.call(process, warning, ...args);
  };

  try {
    return stripTypeScriptTypes(source, { mode: "transform" });
  } finally {
    process.emitWarning = originalEmitWarning;
  }
}

function collectClassNames(source) {
  const names = new Set();
  const classPattern = /(?:export\s+(?:default\s+)?)?class\s+([A-Za-z_$][\w$]*)/g;
  let match = classPattern.exec(source);

  while (match) {
    names.add(match[1]);
    match = classPattern.exec(source);
  }

  return Array.from(names);
}

function pickClass(moduleExports, className) {
  if (className) {
    return moduleExports[className] || null;
  }

  const exportedClasses = Object.values(moduleExports).filter((value) => typeof value === "function");

  return exportedClasses.length === 1 ? exportedClasses[0] : null;
}

function pickDefaultMethod(ClassConstructor) {
  for (const methodName of ["run", "main", "test"]) {
    if (typeof ClassConstructor[methodName] === "function") {
      return methodName;
    }

    if (typeof ClassConstructor.prototype[methodName] === "function") {
      return methodName;
    }
  }

  return "";
}

function getCallableTarget(ClassConstructor, methodName) {
  if (typeof ClassConstructor[methodName] === "function") {
    return {
      receiver: ClassConstructor,
      method: ClassConstructor[methodName],
    };
  }

  if (typeof ClassConstructor.prototype[methodName] === "function") {
    const instance = new ClassConstructor();
    return {
      receiver: instance,
      method: instance[methodName],
    };
  }

  return null;
}

async function runCallSequence(ClassConstructor, options) {
  const callNames = options.callNames;
  const callArgs = normalizeSequenceArgs(options.methodArgs, callNames.length);
  const results = [];
  let instance = null;
  let startIndex = 0;

  if (isConstructorCall(callNames[0], ClassConstructor, options.className)) {
    instance = new ClassConstructor(...callArgs[0]);
    results.push(null);
    startIndex = 1;
  } else {
    instance = new ClassConstructor();
  }

  for (let index = startIndex; index < callNames.length; index += 1) {
    const methodName = callNames[index];

    if (isConstructorCall(methodName, ClassConstructor, options.className)) {
      throw new Error(`构造函数调用只能出现在 --calls 的第一项: ${methodName}`);
    }

    const target = getSequenceCallableTarget(ClassConstructor, instance, methodName);

    if (!target) {
      console.error(`没有找到可执行方法: ${ClassConstructor.name}.${methodName}()`);
      printMethodList(ClassConstructor, ClassConstructor.name);
      process.exitCode = 1;
      return results;
    }

    const result = target.method.apply(target.receiver, callArgs[index]);
    const awaitedResult = result && typeof result.then === "function" ? await result : result;
    results.push(awaitedResult === undefined ? null : awaitedResult);
  }

  return results;
}

function normalizeSequenceArgs(methodArgs, callCount) {
  if (methodArgs.length === 0) {
    return Array.from({ length: callCount }, () => []);
  }

  if (!methodArgs.every((item) => Array.isArray(item))) {
    throw new Error("--calls 连续调用模式下，--args 必须是二维 JSON 数组，例如 --args '[[3],[1],[]]'");
  }

  if (methodArgs.length !== callCount) {
    throw new Error(`--calls 和 --args 长度必须一致，当前 calls=${callCount}, args=${methodArgs.length}`);
  }

  return methodArgs;
}

function isConstructorCall(callName, ClassConstructor, className) {
  return callName === "constructor" || callName === ClassConstructor.name || Boolean(className && callName === className);
}

function getSequenceCallableTarget(ClassConstructor, instance, methodName) {
  if (instance && typeof instance[methodName] === "function") {
    return {
      receiver: instance,
      method: instance[methodName],
    };
  }

  if (typeof ClassConstructor[methodName] === "function") {
    return {
      receiver: ClassConstructor,
      method: ClassConstructor[methodName],
    };
  }

  return null;
}

function printResult(result) {
  if (result === undefined) {
    return;
  }

  if (typeof result === "string") {
    console.log(result);
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

function printHelp() {
  console.log(`用法:
  node main.ts <文件路径> [类名] [方法名] [...参数]
  node main.ts <文件路径> [类名] [方法名] --args '<JSON数组>'
  node main.ts <文件路径> [类名] --calls '<JSON字符串数组>' --args '<二维JSON数组>'

示例:
  node main.ts DataStructure/CircularArray.ts CircularArray
  node main.ts problem/TwoSum.ts Solution twoSum --args '[[2,7,11,15],9]'
  node main.ts TwoSum Solution twoSum '[2,7,11,15]' 9
  node main.ts MyQueue MyQueue --calls '["MyQueue","push","push","pop"]' --args '[[],[1],[2],[]]'

约定:
  1. 算法文件放在 DataStructure 或 problem 下。
  2. class 建议使用 export 导出，例如: export class Solution { ... }
  3. 不传方法名时，会优先尝试 run、main、test；如果不存在则只列出可用方法。
  4. --calls 连续调用模式下，第一项可以是 class 名或 constructor，用来创建实例；返回值中的 undefined 会显示为 null。

当前可发现的文件:
${formatDiscoveredFiles()}`);
}

function formatDiscoveredFiles() {
  const files = [];

  for (const dir of SEARCH_DIRS) {
    const absoluteDir = path.join(PROJECT_ROOT, dir);

    if (fs.existsSync(absoluteDir)) {
      collectTsFiles(absoluteDir, files);
    }
  }

  if (files.length === 0) {
    return "  暂无";
  }

  return files
    .sort()
    .map((file) => `  ${path.relative(PROJECT_ROOT, file)}: ${collectClassNames(fs.readFileSync(file, "utf8")).join(", ") || "未发现 class"}`)
    .join("\n");
}

function collectTsFiles(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectTsFiles(fullPath, files);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
}

function printClassList(filePath, moduleExports) {
  const classNames = Object.entries(moduleExports)
    .filter(([_name, value]) => typeof value === "function")
    .map(([name]) => name);

  console.error(`需要指定类名，文件 ${path.relative(PROJECT_ROOT, filePath)} 中可用 class: ${classNames.join(", ") || "无"}`);
}

function printMethodList(ClassConstructor, className) {
  const instanceMethods = Object.getOwnPropertyNames(ClassConstructor.prototype)
    .filter((name) => name !== "constructor" && typeof ClassConstructor.prototype[name] === "function");
  const staticMethods = Object.getOwnPropertyNames(ClassConstructor)
    .filter((name) => !["length", "name", "prototype"].includes(name) && typeof ClassConstructor[name] === "function");
  const methods = [...staticMethods.map((name) => `${name} (static)`), ...instanceMethods];

  console.log(`${className || ClassConstructor.name} 可用方法: ${methods.join(", ") || "无"}`);
}
