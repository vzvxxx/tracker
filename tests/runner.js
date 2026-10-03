// Мини-раннер автотестов: регистрируем тесты, потом запускаем по очереди.
const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function assert(condition, message = 'условие не выполнено') {
  if (!condition) throw new Error(message);
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

export function assertEqual(actual, expected, message = '') {
  if (!deepEqual(actual, expected)) {
    throw new Error(`${message} ожидалось ${JSON.stringify(expected)}, получено ${JSON.stringify(actual)}`);
  }
}

export async function run() {
  const list = document.getElementById('results');
  let passed = 0;
  let failed = 0;
  for (const { name, fn } of tests) {
    const li = document.createElement('li');
    try {
      await fn();
      passed += 1;
      li.textContent = `✅ ${name}`;
    } catch (error) {
      failed += 1;
      li.textContent = `❌ ${name} — ${error.message}`;
      li.className = 'fail';
    }
    list.appendChild(li);
  }
  document.getElementById('summary').textContent = `Пройдено: ${passed}, упало: ${failed}`;
  document.title = failed ? `❌ ${failed}` : `✅ ${passed}`;
}
