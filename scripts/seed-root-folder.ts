import { FileService } from '@modules/file/services';

export const seedRootFolder = async () => {
    await FileService.createRootFolder();
};
