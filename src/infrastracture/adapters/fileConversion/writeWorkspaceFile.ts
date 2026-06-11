import fs from 'fs';
import path from 'path';

export class WorkspaceEscapeError extends Error {
  constructor() {
    super('Refusing to write a file outside the conversion workspace');
    this.name = 'WorkspaceEscapeError';
  }
}

interface WorkspaceFile {
  name: string;
  contents?: Buffer | Uint8Array | string;
}

const toBuffer = (contents: Buffer | Uint8Array | string): Buffer =>
  Buffer.isBuffer(contents) ? contents : Buffer.from(contents as string);

export const writeWorkspaceFile = async (
  workspaceLocation: string,
  file: WorkspaceFile
): Promise<void> => {
  if (file.contents == null) {
    return;
  }

  const base = path.resolve(workspaceLocation);
  const dest = path.resolve(base, file.name);

  if (dest !== base && !dest.startsWith(base + path.sep)) {
    throw new WorkspaceEscapeError();
  }

  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.writeFile(dest, toBuffer(file.contents));
};
