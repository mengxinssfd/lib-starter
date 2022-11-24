import * as Path from 'path';
import * as Fs from 'fs';
import { Config, RepoType } from './init-pkg';

const PnpmWorkspaceContent = `
packages:
  # all packages in subdirs of packages/ and components/
  - 'packages/**'
  # exclude packages that are inside test directories
  - '!**/tests/**'
`.trim();

const paths = {
  typedoc: Path.resolve(__dirname, '../typedoc.json'),
  tsconfig: Path.resolve(__dirname, '../typedoc.json'),
  pnpmWorkspace: Path.resolve(__dirname, '../pnpm-workspace.yaml'),
  pkgs: Path.resolve(__dirname, '../packages'),
  src: Path.resolve(__dirname, '../src'),
};

export function setRepo(config: Config) {
  const typedocJson = JSON.parse(Fs.readFileSync(paths.typedoc).toString());
  if (config.repoType === RepoType.mono) {
    // 1.设置pnpm-workspace.yaml
    Fs.writeFileSync(paths.pnpmWorkspace, PnpmWorkspaceContent);

    // 2.设置tsconfig.json
    const tsconfigJson = JSON.parse(Fs.readFileSync(paths.tsconfig).toString());
    tsconfigJson.include.push(...['pages/*/src', 'pages/*/__tests__']);
    Fs.writeFileSync(paths.tsconfig, JSON.stringify(tsconfigJson, null, 2));

    // 3.生成packages目录
    Fs.mkdirSync(paths.pkgs);

    // 4.设置typedoc.json
    typedocJson.entryPointStrategy = 'packages';
    typedocJson.entryPoints = ['packages/*'];

    // 5.新增repo
  } else {
    typedocJson.name = config.name;
  }

  typedocJson.navigationLinks.GitHub = config.git.replace(/\.git$/, '');

  Fs.writeFileSync(paths.typedoc, JSON.stringify(typedocJson, null, 2));
}
