import fs from 'fs';

import { resolvePath } from '../lib/constants';

const appInfo = JSON.parse(
  fs.readFileSync(resolvePath(__dirname, '../../package.json')).toString()
);

export interface VersionInfo {
  version: string;
  sha: string;
}

class VersionService {
  public getVersion(): VersionInfo {
    return {
      version: appInfo.version,
      sha: process.env.GIT_SHA ?? 'unknown',
    };
  }
}

export default VersionService;
