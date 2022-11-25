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
