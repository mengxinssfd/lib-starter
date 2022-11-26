import { resolve, basename } from 'path';
import chalk from 'chalk';
import * as fs from 'fs';
import childProcess from 'child_process';

export function rootDir(path = ''): string {
  return resolve(__dirname, '../' + path);
}

export function fuzzyMatchTarget(partialTargets: string[], includeAllMatching: boolean) {
  const targets = getTargets();
  const matched: string[] = [];
  partialTargets.forEach((partialTarget) => {
    for (const target of targets) {
      if (target.match(partialTarget)) {
        matched.push(target);
        if (!includeAllMatching) {
          break;
        }
      }
    }
  });
  if (matched.length) {
    return matched;
  } else {
    console.log();
    console.error(
      `  ${chalk.bgRed.white(' ERROR ')} ${chalk.red(
        `Target ${chalk.underline(partialTargets)} not found!`,
      )}`,
    );
    console.log();

    process.exit(1);
  }
}

export function getTargets(): string[] {
  const path = rootDir('packages');
  return (fs.existsSync(path) ? fs.readdirSync(path) : []).filter((f) => {
    if (!fs.statSync(rootDir(`packages/${f}`)).isDirectory()) {
      return false;
    }
    const pkg = require(`${path}/${f}/package.json`);
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
  let _content: string | Record<string, any> | null = fs.readFileSync(path).toString();
  if (parseJson) _content = JSON.parse(_content);

  return [
    _content as C,
    (content) => {
      _content = null;
      let result = content as string;
      if (parseJson) result = JSON.stringify(content, null, 2);
      fs.writeFileSync(path, result);
    },
  ];
}
