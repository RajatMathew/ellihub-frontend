import { FileService } from '@modules/file/services';

export const startup = async () => {
    await FileService.createRootFolder();
};
