import StorageHandler from '../lib/storage/StorageHandler';
import DownloadRepository from '../data_layer/DownloadRepository';

class DownloadService {
  constructor(private downloadRepository: DownloadRepository) {}

  async getFileBody(
    owner: string,
    key: string,
    storage: StorageHandler
  ): Promise<Buffer | null | undefined> {
    const fileEntry = await this.downloadRepository.getFile(owner, key);
    if (!fileEntry) {
      return null;
    }
    const file = await storage.getFileContents(fileEntry.key);
    return file?.Body;
  }

  async getFilename(owner: string, key: string): Promise<string | null> {
    return this.downloadRepository.getFilename(owner, key);
  }

  isValidKey(key: string) {
    return key && key.length > 0;
  }

  isMissingDownloadError(error: unknown) {
    const errorName = (error as { name?: string })?.name;
    return errorName != null && errorName.includes('NoSuchKey');
  }

  deleteMissingFile(owner: string, key: string) {
    this.downloadRepository.deleteMissingFile(owner, key);
  }
}

export default DownloadService;
