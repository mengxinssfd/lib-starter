import * as Path from 'path';
import * as Fs from 'fs';
import { Config, RepoType } from './init-pkg';
import { execa } from 'execa';
import { rootDir, useFile } from './utils';
import { toCamel } from '@mxssfd/core';
import path from 'path';
import fs from 'fs';

const PnpmWorkspaceContent = `
packages:
  # all packages in subdirs of packages/ and components/
  - 'packages/**'
  # exclude packages that are inside test directories
  - '!**/tests/**'
  - '!**/test/**'
`.trim();

const paths = {
  typedoc: rootDir('typedoc.json'),
  tsconfig: rootDir('tsconfig.json'),
  pnpmWorkspace: rootDir('pnpm-workspace.yaml'),
  pkgs: rootDir('packages'),
  src: rootDir('src'),
};

export async function setRepo(config: Config) {
  const [typedocJson, updateTypedoc] = useFile(paths.typedoc, true);
  typedocJson['navigationLinks'].GitHub = config.git.replace(/\.git$/, '');
  if (config.repoType === RepoType.mono) {
    // 1.设置pnpm-workspace.yaml
    Fs.writeFileSync(paths.pnpmWorkspace, PnpmWorkspaceContent);

    // 2.设置tsconfig.json
    const [tsconfigContent, setTsconfig] = useFile(paths.tsconfig);
    setTsconfig(
      tsconfigContent
        .replace(
          /("include": \[)/,
          `$1
    "packages/*/src",
    "packages/*/__tests__",`,
        )
        .trim(),
    );

    // 3.生成packages目录
    Fs.mkdirSync(paths.pkgs);

    // 4.设置typedoc.json
    typedocJson['entryPointStrategy'] = 'packages';
    updateTypedoc(typedocJson);

    // 5.新增repo
    await execa('npm', ['run', 'pkg:new'], { stdio: 'inherit' });
    return;
  }

  typedocJson['name'] = config.name;
  updateTypedoc(typedocJson);

  // 生成src目录
  Fs.mkdirSync(paths.src);
  Fs.writeFileSync(Path.resolve(paths.src, 'index.ts'), `export const test = () => 'test';`);

  // 更新package.json
  const [pkgJson, updatePkg] = useFile(rootDir('package.json'), true);

  pkgJson['main'] = `dist/${config.name}.cjs.js`;
  pkgJson['module'] = `dist/${config.name}.esm-bundler.js`;
  pkgJson['types'] = `dist/${config.name}.d.ts`;
  pkgJson['exports'] = {
    '.': {
      import: {
        node: `./dist/${config.name}.cjs.js`,
        default: `./dist/${config.name}.esm-bundler.js`,
      },
      require: `./dist/${config.name}.cjs.js`,
    },
  };
  pkgJson['buildOptions'] = {
    name: toCamel(pkgJson['name'], '-', true),
    formats: ['esm-bundler', 'esm-browser', 'cjs', 'global'],
  };
  updatePkg(pkgJson);

  const [apiJson, updateApiJson] = useFile(rootDir('api-extractor.json'), true);

  apiJson['mainEntryPointFilePath'] = './dist/src/index.d.ts';
  apiJson['dtsRollup'] = {
    enabled: true,
    publicTrimmedFilePath: './dist/<unscopedPackageName>.d.ts',
  };
  updateApiJson(apiJson);

  // 生成测试文件
  const testDir = path.resolve(rootDir(), '__tests__');
  fs.mkdirSync(testDir);
  const testContent = `
import * as testTarget from '../src';

describe('${config.name}', function () {
  test('base', () => {
    expect(1).toBe(1);
  });
});
`.trim();
  fs.writeFileSync(path.resolve(testDir, 'index.test.ts'), testContent);
}
