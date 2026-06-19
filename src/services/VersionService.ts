import fs from 'fs';

import { resolvePath } from '../lib/constants';
import { resolveRelease } from '../lib/release';

const appInfo = JSON.parse(
  fs.readFileSync(resolvePath(__dirname, '../../package.json')).toString()
);

export interface VersionInfo {
  version: string;
  sha: string;
  release: string;
}

class VersionService {
  public getVersion(): VersionInfo {
    return {
      version: appInfo.version,
      sha: process.env.GIT_SHA ?? 'unknown',
      release: resolveRelease() ?? 'unknown',
    };
  }
}

export default VersionService;
