import fs from 'fs';
import os from 'os';
import path from 'path';

import { AnkifyClient } from '../../entities/ankify';
import {
  buildExportedDeckReader,
  ExportVolumeUnavailableError,
} from './buildExportedDeckReader';

const client = { container_id: 'cid' } as unknown as AnkifyClient;

const dockerWithMount = (source: string) => ({
  getContainer: jest.fn(() => ({
    inspect: jest.fn(async () => ({
      Mounts: [{ Type: 'volume', Destination: '/data', Source: source }],
    })),
  })),
});

describe('buildExportedDeckReader', () => {
  test('reads the exported bytes from the host volume mountpoint and cleans up', async () => {
    const volumeDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'ankify-export-')
    );
    const containerPath = '/data/abc.apkg';
    const hostFile = path.join(volumeDir, 'abc.apkg');
    await fs.promises.writeFile(hostFile, 'apkg-bytes');

    const reader = buildExportedDeckReader(dockerWithMount(volumeDir));
    const { bytes, cleanup } = await reader(client, containerPath);

    expect(bytes.toString()).toBe('apkg-bytes');
    expect(fs.existsSync(hostFile)).toBe(true);

    await cleanup();
    expect(fs.existsSync(hostFile)).toBe(false);

    await fs.promises.rm(volumeDir, { recursive: true, force: true });
  });

  test('throws when the /data mount has no host source', async () => {
    const docker = {
      getContainer: jest.fn(() => ({
        inspect: jest.fn(async () => ({ Mounts: [] })),
      })),
    };
    const reader = buildExportedDeckReader(docker);

    await expect(reader(client, '/data/abc.apkg')).rejects.toBeInstanceOf(
      ExportVolumeUnavailableError
    );
  });

  test('throws when the exported file is missing on the host', async () => {
    const volumeDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'ankify-export-')
    );
    const reader = buildExportedDeckReader(dockerWithMount(volumeDir));

    await expect(reader(client, '/data/missing.apkg')).rejects.toBeInstanceOf(
      ExportVolumeUnavailableError
    );

    await fs.promises.rm(volumeDir, { recursive: true, force: true });
  });

  test('rejects a container path that escapes the /data mount', async () => {
    const volumeDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'ankify-export-')
    );
    const reader = buildExportedDeckReader(dockerWithMount(volumeDir));

    await expect(
      reader(client, '/data/../../../etc/passwd')
    ).rejects.toBeInstanceOf(ExportVolumeUnavailableError);

    await fs.promises.rm(volumeDir, { recursive: true, force: true });
  });
});
