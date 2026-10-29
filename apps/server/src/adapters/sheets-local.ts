import ExcelJS from 'exceljs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const SHEET_HEADER = ['Startup', 'Lowest paid monthly price (USD)', 'Evidence quote', 'Source URL', 'Status', 'Note'];

export interface SheetRow {
  name: string;
  priceUsd: number | null;
  quote: string | null;
  url: string;
}

/** Spreadsheet formula injection guard: text from pages must never be interpreted as a formula. */
export function safeCell(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

/** The exact matrix of strings that read-back must find on disk. */
export function expectedMatrix(rows: SheetRow[]): string[][] {
  return [
    SHEET_HEADER,
    ...rows.map((r) => [
      safeCell(r.name),
      r.priceUsd === null ? 'NOT FOUND' : String(r.priceUsd),
      r.quote === null ? 'NOT FOUND' : safeCell(r.quote),
      r.url,
      r.priceUsd === null ? 'GAP' : 'FOUND',
      r.priceUsd === null ? 'Price not shown on the page; flagged, not guessed' : '',
    ]),
  ];
}

/** Local xlsx adapter (exceljs). Writes a NEW document owned by Darby; never edits anything it did not create. */
export async function writeLocalSheet(file: string, sheetName: string, rows: SheetRow[]): Promise<{ matrix: string[][]; range: string }> {
  mkdirSync(path.dirname(file), { recursive: true });
  const matrix = expectedMatrix(rows);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Darby';
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName);
  matrix.forEach((r, i) => {
    const row = ws.addRow(r);
    if (i > 0 && rows[i - 1]!.priceUsd !== null) row.getCell(2).value = rows[i - 1]!.priceUsd; // numeric cell; reads back as the same digits
  });
  ws.getRow(1).font = { bold: true };
  ws.columns = [{ width: 22 }, { width: 18 }, { width: 44 }, { width: 44 }, { width: 10 }, { width: 46 }];
  await wb.xlsx.writeFile(file);
  return { matrix, range: `A1:F${matrix.length}` };
}
