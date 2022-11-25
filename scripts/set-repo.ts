import * as Path from 'path';
import * as Fs from 'fs';
import { Config, RepoType } from './init-pkg';
import { execa } from 'execa';
import { useFile } from './utils';

const PnpmWorkspaceContent = `
packages:
  # all packages in subdirs of packages/ and components/
  - 'packages/**'
  # exclude packages that are inside test directories
  - '!**/tests/**'
  - '!**/test/**'
`.trim();

const paths = {
  typedoc: Path.resolve(__dirname, '../typedoc.json'),
  tsconfig: Path.resolve(__dirname, '../tsconfig.json'),
  pnpmWorkspace: Path.resolve(__dirname, '../pnpm-workspace.yaml'),
  pkgs: Path.resolve(__dirname, '../packages'),
  src: Path.resolve(__dirname, '../src'),
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
      tsconfigContent.replace(
        /("include": \[)/,
        `$1
    "packages/*/src",
    "packages/*/__tests__",`,
      ),
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
}
