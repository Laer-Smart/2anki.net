import fs from 'fs';
import path from 'path';

import { AnkifyClient } from '../../entities/ankify';
import { ExportedDeckBytesReader } from '../../usecases/ankify/ExportDeckPackageUseCase';

const CONTAINER_DATA_TARGET = '/data';

interface InspectedMount {
  Type?: string;
  Destination?: string;
  Source?: string;
}

interface InspectableContainer {
  inspect(): Promise<{ Mounts?: InspectedMount[] }>;
}

interface DockerWithContainerLookup {
  getContainer(id: string): InspectableContainer;
}

export class ExportVolumeUnavailableError extends Error {
  constructor() {
    super('Could not locate the exported deck on the host');
    this.name = 'ExportVolumeUnavailableError';
  }
}

const resolveHostPath = (
  mounts: InspectedMount[],
  containerPath: string
): string => {
  const dataMount = mounts.find(
    (mount) =>
      mount.Destination === CONTAINER_DATA_TARGET &&
      typeof mount.Source === 'string' &&
      mount.Source.length > 0
  );
  if (dataMount?.Source == null) {
    throw new ExportVolumeUnavailableError();
  }
  const relative = containerPath.slice(`${CONTAINER_DATA_TARGET}/`.length);
  const hostBase = path.resolve(dataMount.Source);
  const hostPath = path.resolve(hostBase, relative);
  const insideBase =
    hostPath === hostBase || hostPath.startsWith(hostBase + path.sep);
  if (insideBase) {
    return hostPath;
  }
  throw new ExportVolumeUnavailableError();
};

export const buildExportedDeckReader = (
  docker: DockerWithContainerLookup
): ExportedDeckBytesReader => {
  return async (client: AnkifyClient, containerPath: string) => {
    const container = docker.getContainer(client.container_id);
    const info = await container.inspect();
    const hostPath = resolveHostPath(info.Mounts ?? [], containerPath);

    let bytes: Buffer;
    try {
      bytes = await fs.promises.readFile(hostPath);
    } catch {
      throw new ExportVolumeUnavailableError();
    }

    return {
      bytes,
      cleanup: async () => {
        await fs.promises.unlink(hostPath).catch(() => undefined);
      },
    };
  };
};
