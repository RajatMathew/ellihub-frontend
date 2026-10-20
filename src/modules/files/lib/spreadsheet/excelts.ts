/**
 * The parts of ExcelTS the preview uses, re-exported by name. The dialog
 * dynamic-imports this file rather than the package: `import()` of the package
 * itself keeps all of it — PDF, Word, Markdown, charts — while named
 * re-exports let the bundler drop what the preview never calls.
 */
export {
  decodeRange,
  formatCellValue,
  getCellDisplayText,
  ValueType,
  Workbook,
} from '@cj-tech-master/excelts';
// The zip reader, for the parts ExcelTS does not model: a sheet's text boxes.
export { unzip } from '@cj-tech-master/excelts/archive';
