import * as path from 'path';
import { prompt } from 'enquirer';
import childProcess from 'child_process';
import semver from 'semver';
import chalk from 'chalk';
import * as fs from 'fs';
import { setRepo } from './set-repo';

export enum RepoType {
  mono = 'mono',
  multi = 'multi',
}

const projectPath = path.resolve(__dirname, '../');
const pkgPath = path.resolve(projectPath, 'package.json');
const pkg = require(pkgPath);

function cmdGet(cmd: string) {
  try {
    return childProcess.execSync(cmd).toString().trim();
  } catch (e) {
    return '';
  }
}

export interface Config {
  name: string;
  description: string;
  author: string;
  keywords: string;
  git: string;
  version: string;
  license: string;
  repoType: RepoType;
}

async function getConfig() {
  const initConfig: Config = {
    name: path.basename(projectPath),
    description: pkg.description,
    author: cmdGet('git config user.name'),
    keywords: pkg.keywords.join(','),
    git: cmdGet('git remote get-url origin').replace(/^git@github.com:/, 'https://github.com/'),
    version: '0.0.0',
    license: pkg.license,
    repoType: RepoType.multi,
  };

  const reply = await prompt<Config>([
    // 1.获取项目名称
    {
      type: 'input',
      name: 'name',
      initial: initConfig.name,
      message: '输入项目名称：',
    },
    // 2.获取版本号version
    {
      type: 'input',
      name: 'version',
      initial: initConfig.version,
      message: '输入版本号(version)：',
      validate(value) {
        // 校验版本号
        if (!semver.valid(value)) {
          return `invalid version: ${value}`;
        }
        return true;
      },
    },
    // 3.获取description
    {
      type: 'input',
      name: 'description',
      initial: initConfig.description,
      message: '输入项目描述(description)：',
    },
    // 4.获取keywords
    {
      type: 'input',
      name: 'keywords',
      initial: initConfig.keywords,
      message: '输入关键词(keywords)：',
    },
    // 5.获取author
    {
      type: 'input',
      name: 'author',
      initial: initConfig.author,
      message: '输入作者(author)：',
    },
    // 6.获取license
    {
      type: 'input',
      name: 'license',
      initial: initConfig.license,
      message: '输入license：',
    },
    // 7.repo类型
    {
      type: 'select',
      name: 'repoType',
      initial: RepoType.multi as any,
      message: '选择repo类型：',
      choices: [{ name: RepoType.mono }, { name: RepoType.multi }],
    },
  ]);

  const config = { ...initConfig, ...reply };

  console.log(chalk.green(JSON.stringify(config, null, 2)));

  const { confirm } = await prompt<{ confirm: string }>({
    type: 'confirm',
    name: 'confirm',
    message: '是否确认',
  });

  if (!confirm) return Promise.reject('cancel');

  return config;
}
async function setup() {
  try {
    console.log(chalk.cyan('初始化package.json开始...'));
    const config = await getConfig();
    //  console.log(config);
    // 3.根据description填写README.md
    // 5.获取远程git地址

    // 设置项目名称
    pkg.name = config.name;
    // 设置版本号version
    pkg.version = config.version;
    // 设置description
    pkg.description = config.description;
    // 设置keywords
    pkg.keywords = config.keywords.trim().split(',');
    // 设置author
    pkg.author = config.author;
    // 设置git
    pkg.repository.url = 'git+' + config.git;
    pkg.bugs.url = config.git.replace('.git', '/issues');
    pkg.homepage = config.git.replace('.git', '#readme');

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    console.log(chalk.cyan('初始化package.json完成...'));

    console.log(chalk.cyan('初始化repo开始...'));
    setRepo(config);
    console.log(chalk.cyan('初始化repo完成...'));
  } catch (e) {
    console.log(e);
  }
}
setup();
