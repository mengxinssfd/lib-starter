import { createSrcAndTests } from './utils';
import pkgJson from '../package.json';
import * as Path from 'path';

// 给lib-starter创建src目录和__tests__目录
if (pkgJson.name === 'lib-starter') createSrcAndTests(Path.resolve(__dirname, '../'), pkgJson.name);
