export type ActivityEntityType =
    | 'contact'
    | 'vendor'
    | 'gc'
    | 'employee'
    | 'department'
    | 'file'
    | 'costCode'
    | 'costCodeCategory'
    | 'professionalRole'
    | 'project';

export type ActivityAction =
    | 'create'
    | 'update'
    | 'delete'
    | 'link'
    | 'unlink'
    | 'addTag'
    | 'removeTag'
    | 'comment';
