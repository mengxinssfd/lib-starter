import fs from 'fs';
import * as Path from 'path';
import pkgJson from '../package.json';

// 给lib-starter创建src目录和__tests__目录
if (pkgJson.name === 'lib-starter') {
  // src
  const src = Path.resolve(__dirname, '../src');
  if (!fs.existsSync(src)) fs.mkdirSync(src);
  const indexTs = Path.resolve(src, 'index.ts');
  if (!fs.existsSync(indexTs)) fs.writeFileSync(indexTs, "export const test = () => 'test';\n");

  // __tests__
  const tests = Path.resolve(__dirname, '../__tests__');
  if (!fs.existsSync(tests)) fs.mkdirSync(tests);
  const indexTestsTs = Path.resolve(tests, 'index.test.ts');
  if (!fs.existsSync(indexTestsTs))
    fs.writeFileSync(
      indexTestsTs,
      `import * as testTarget from '../src';

describe('${pkgJson.name}', function () {
  test('base', () => {
    expect(testTarget.test()).toBe('test');
  });
});
`,
    );
}
