import type { Report } from 'reports/Report';

export type ReportPrintInput = Pick<
  Report,
  'title' | 'columns' | 'reportData' | 'filters' | 'filterMap'
> & { fyo: Pick<Report['fyo'], 'format'> };

/** Reuse the report's selected cells and filters without recalculating its accounts. */
export function getReportPrintValues(
  report: ReportPrintInput,
  start: number,
  limit: number,
  selection: boolean[]
) {
  const columns = report.columns
    .map((column, index) => ({ ...column, index }))
    .filter((_, index) => selection[index]);
  const width =
    columns.reduce((sum, column) => sum + (column.width || 1), 0) || 1;
  const first = Math.max(Math.floor(start) - 1, 0);
  const count = Math.max(Math.floor(limit), 0);
  const rows = report.reportData.slice(first, first + count);
  const meta = report.filters.flatMap((field) => {
    const value = report.filterMap[field.fieldname];
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      value === false ||
      value === 'All' ||
      value === 'none'
    )
      return [];
    return [
      {
        label: field.label || field.fieldname,
        value: report.fyo.format(value, field),
      },
    ];
  });
  return {
    printTitle: report.title,
    isReport: true,
    showPaymentQR: false,
    showTerms: false,
    printMetaLeft: meta,
    printMetaRight: [
      { label: 'Generated', value: report.fyo.format(new Date(), 'Datetime') },
      {
        label: 'Rows',
        value: rows.length
          ? `${first + 1} - ${first + rows.length} of ${
              report.reportData.length
            }`
          : '0',
      },
    ],
    printColumns: columns.map((column) => ({
      key: String(column.index),
      label: column.label,
      align: column.align || 'left',
      width: `${((column.width || 1) / width) * 100}%`,
    })),
    printRows: rows.map((row) => {
      const cells: Record<string, unknown> = {};
      const styles: Record<string, Record<string, string>> = {};
      for (const column of columns) {
        const cell = row.cells[column.index];
        cells[String(column.index)] =
          column.fieldtype === 'Currency'
            ? (cell?.value || '').replace(/৳\s*/g, 'Tk. ')
            : cell?.value || '';
        styles[String(column.index)] = {
          fontWeight: cell?.bold ? '700' : '400',
          fontStyle: cell?.italics ? 'italic' : 'normal',
          paddingLeft: `${10 + Number(cell?.indent || row.level || 0) * 10}px`,
        };
      }
      return { ...cells, _cellStyles: styles } as Record<string, unknown> & {
        _cellStyles: typeof styles;
      };
    }),
    printTotals: [],
  };
}
