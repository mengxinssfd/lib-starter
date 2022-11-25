import * as path from 'path';
import { prompt } from 'enquirer';
import chalk from 'chalk';
import * as fs from 'fs';
import * as tsUtils from '@mxssfd/core';
import { getGitUrl, useFile } from './utils';
import rootPkg from '../package.json';

const pkgsPath = path.resolve(__dirname, '../packages');

async function getConfig() {
  const config = {
    name: '',
    pkgName: '',
    umdName: '',
    deps: [],
    formats: [],
    private: false,
    description: '',
    keywords: '',
  };

  ({ value: config.name } = await prompt<{ value: string }>({
    type: 'input',
    name: 'value',
    message: '目录名(dirName)',
    required: true,
    validate(value) {
      if (fs.existsSync(path.resolve(pkgsPath, value))) {
        return '目录已存在！';
      }
      return true;
    },
  }));

  const reply = await prompt([
    {
      type: 'input',
      name: 'pkgName',
      message: '包名(pkgName)',
      initial: `@${rootPkg.name}/${config.name}`,
      required: true,
    },
    {
      type: 'input',
      name: 'umdName',
      message: '全局umd名(umdName)',
      initial: tsUtils.toCamel(rootPkg.name, '-') + tsUtils.toCamel(config.name, '-', true),
      required: true,
    },
    {
      type: 'input',
      name: 'description',
      message: '项目描述(description)',
      required: true,
    },
    {
      type: 'input',
      name: 'keywords',
      message: '关键词(keywords)',
      initial: config.name.split('-').join(','),
      required: true,
    },
    {
      type: 'confirm',
      name: 'private',
      message: '是否私有(private)',
      initial: false,
      required: true,
    },
  ]);

  Object.assign(config, reply);

  const deps = (fs.existsSync(pkgsPath) ? fs.readdirSync(pkgsPath) : []).map((pkg) =>
    path.basename(pkg),
  );

  if (deps.length) {
    ({ deps: config.deps } = await prompt({
      type: 'multiselect',
      name: 'deps',
      message: '选择依赖(deps)(按空格键选中/取消，enter键确定)',
      choices: deps,
    }));
  }

  const formatsChoices = ['esm-bundler', 'esm-browser', 'cjs', 'global'];

  ({ formats: config.formats } = await prompt({
    type: 'multiselect',
    name: 'formats',
    message: '选择打包类型(formats)(按空格键选中/取消，enter键确定)',
    choices: formatsChoices,
    initial: formatsChoices as any,
  }));

  console.log('\n');
  step(JSON.stringify(config, null, 2));
  console.log('\n');
  const { confirm } = await prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: '确认',
    initial: false,
    required: true,
  });

  if (!confirm) throw 'cancel';

  return config;
}

const step = (msg: string) => console.log(chalk.cyan(msg));

async function setup() {
  try {
    const config = await getConfig();

    const pkgPath = path.resolve(pkgsPath, config.name);

    // 1.生成pkg目录
    step('生成pkg目录');
    if (!fs.existsSync(pkgsPath)) {
      fs.mkdirSync(pkgsPath);
    }
    fs.mkdirSync(pkgPath);

    // 2.生成package.json
    step('生成package.json');

    const gitUrl = getGitUrl();
    const gitUrlWithoutGit = gitUrl.replace(/^\.git$/, '');

    // 拼接package.json
    const pkgContent = `
{
  "name": "${config.pkgName}",
  "version": "${rootPkg.version}",
  "description": "${config.description}",
  "main": "index.js",
  "module": "dist/${config.name}.esm-bundler.js",
  "exports": {
    ".": {
      "import": "./dist/${config.name}.esm-bundler.js",
      "require": "./index.js"
    },
    "./": "./dist"
  },
  "types": "dist/${config.name}.d.ts",
  "keywords": ${JSON.stringify(config.keywords.split(','))},
  "files": [
    "index.js",
    "index.mjs",
    "dist"
  ],
  "repository": {
    "type": "git",
    "url": "git+${gitUrl}"
  },
  "buildOptions": {
    "name": "${config.umdName}",
    "formats": ${JSON.stringify(config.formats)}
  },
  "scripts": {
    "apie": "api-extractor run"
  },
  "dependencies": ${JSON.stringify(
    config.deps.reduce((prev, cur) => {
      prev[`@${rootPkg.name}/${cur}`] = rootPkg.version;
      return prev;
    }, {} as Record<string, string>),
  )},
  "author": "dyh",
  "license": "MIT",
  "bugs": {
    "url": "${gitUrlWithoutGit}/issues"
  },
  "homepage": "${gitUrlWithoutGit}/tree/master/packages/${config.name}"
}
  `.trim();
    console.log(pkgContent);
    // 写入
    fs.writeFileSync(
      path.resolve(pkgPath, 'package.json'),
      JSON.stringify(JSON.parse(pkgContent), null, 2),
    );

    // 创建index.js index.mjs
    step('生成index.js index.mjs');
    const jsContent = `
    'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/${config.name}.cjs.prod.js');
} else {
  module.exports = require('./dist/${config.name}.cjs.js');
}
    `.trim();
    fs.writeFileSync(path.resolve(pkgPath, 'index.js'), jsContent);
    fs.writeFileSync(path.resolve(pkgPath, 'index.mjs'), "export * from './index.js'");

    // 创建api-extractor.json
    step('生成api-extractor.json');
    const apiExtContent = {
      extends: '../../api-extractor.json',
      mainEntryPointFilePath: './dist/packages/<unscopedPackageName>/src/index.d.ts',
      dtsRollup: {
        publicTrimmedFilePath: './dist/<unscopedPackageName>.d.ts',
      },
    };
    fs.writeFileSync(
      path.resolve(pkgPath, 'api-extractor.json'),
      JSON.stringify(apiExtContent, null, 2),
    );

    // 创建README.md
    step('创建README.md');
    const mdContent = `
# ${config.pkgName}  
${config.description}
    `.trim();
    fs.writeFileSync(path.resolve(pkgPath, 'README.md'), mdContent);

    // 创建src目录
    step('创建src目录');
    fs.mkdirSync(path.resolve(pkgPath, 'src'));

    // 添加src/index.ts文件
    step('创建src/index.ts文件');
    fs.writeFileSync(path.resolve(pkgPath, 'src/index.ts'), '');

    // 添加__tests__目录
    step('创建__tests__目录');
    const testDir = path.resolve(pkgPath, '__tests__');
    fs.mkdirSync(testDir);
    step('添加__tests__/index.test.ts');
    const testContent = `
import * as testTarget from '../src';

describe('${config.pkgName}', function () {
  test('base', () => {
    expect(1).toBe(1);
  });
});
`.trim();
    fs.writeFileSync(path.resolve(testDir, 'index.test.ts'), testContent);

    step('修改typedoc配置开始');

    const [typedocConfig, setFile] = useFile(path.resolve(__dirname, '../typedoc.json'), true);
    if (!typedocConfig['entryPoints']) typedocConfig['entryPoints'] = [];
    typedocConfig['entryPoints'].push('packages/' + config.name);
    setFile(typedocConfig);

    step('修改typedoc配置完成');

    step('finish');
  } catch (e) {
    console.log(e);
  }
}
setup();
