import type { Archiver, ArchiverOptions } from 'archiver';

interface ArchiverModule {
  ZipArchive: new (options?: ArchiverOptions) => Archiver;
}

const archiverModule = require('archiver') as ArchiverModule;

export function createZipArchive(options: ArchiverOptions): Archiver {
  return new archiverModule.ZipArchive(options);
}
