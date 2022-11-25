import { resolve, basename } from 'path';
import chalk from 'chalk';
import * as fs from 'fs';
import childProcess from 'child_process';

export function getTargets(): string[] {
  return fs.readdirSync(resolve(__dirname, '../packages')).filter((f) => {
    if (!fs.statSync(resolve(__dirname, `../packages/${f}`)).isDirectory()) {
      return false;
    }
    const pkg = require(`../packages/${f}/package.json`);
    return !(pkg.private && !pkg.buildOptions);
  });
}
export function checkFileSize(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const file = fs.readFileSync(filePath);
  const minSize = (file.length / 1024).toFixed(2) + 'kb';
  console.log(`${chalk.gray(chalk.bold(basename(filePath)))} min:${minSize}`);
}

export function cmdGet(cmd: string) {
  try {
    return childProcess.execSync(cmd).toString().trim();
  } catch (e) {
    return '';
  }
}

export function getGitUrl(): string {
  return cmdGet('git remote get-url origin').replace(/^git@github.com:/, 'https://github.com/');
}

export function useFile<
  P extends boolean = false,
  C = P extends true ? Record<string, any> : string,
>(path: string, parseJson = false as P): [C, (content: C) => void] {
  let content: string | Record<string, any> = fs.readFileSync(path).toString();
  if (parseJson) content = JSON.parse(content);

  return [
    content as C,
    (content) => {
      let result = content as string;
      if (parseJson) result = JSON.stringify(content, null, 2);
      fs.writeFileSync(path, result);
    },
  ];
}
