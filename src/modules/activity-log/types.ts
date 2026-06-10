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
    | 'project'
    | 'rfq'
    | 'purchaseOrder'
    | 'primeChangeOrder'
    | 'subChangeOrder'
    | 'invoice'
    | 'template';

export type ActivityAction =
    | 'create'
    | 'update'
    | 'delete'
    | 'link'
    | 'unlink'
    | 'addTag'
    | 'removeTag'
    | 'comment';
