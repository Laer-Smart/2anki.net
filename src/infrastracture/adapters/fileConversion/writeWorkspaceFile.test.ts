import fs from 'fs';
import os from 'os';
import path from 'path';

import { WorkspaceEscapeError, writeWorkspaceFile } from './writeWorkspaceFile';

describe('writeWorkspaceFile', () => {
  let workspace: string;
  let outside: string;

  beforeEach(() => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wsguard-'));
    workspace = path.join(root, 'ws');
    outside = path.join(root, 'outside');
    fs.mkdirSync(workspace, { recursive: true });
    fs.mkdirSync(outside, { recursive: true });
  });

  it('writes a legitimate nested file inside the workspace', async () => {
    await writeWorkspaceFile(workspace, {
      name: 'Private & Shared/SLE/page.html',
      contents: '<p>real deck</p>',
    });

    const written = path.join(workspace, 'Private & Shared/SLE/page.html');
    expect(fs.existsSync(written)).toBe(true);
    expect(fs.readFileSync(written, 'utf8')).toBe('<p>real deck</p>');
  });

  it('throws and writes nothing outside the workspace for a traversal name', async () => {
    const escapeTarget = path.join('..', 'outside', 'evil.html');

    await expect(
      writeWorkspaceFile(workspace, {
        name: escapeTarget,
        contents: '<p>evil</p>',
      })
    ).rejects.toBeInstanceOf(WorkspaceEscapeError);

    expect(fs.readdirSync(outside)).toEqual([]);
  });

  it('throws for an absolute-path name', async () => {
    const target = path.join(outside, 'abs-evil.html');

    await expect(
      writeWorkspaceFile(workspace, { name: target, contents: '<p>x</p>' })
    ).rejects.toBeInstanceOf(WorkspaceEscapeError);

    expect(fs.existsSync(target)).toBe(false);
  });
});
