import { BadRequestException, Injectable } from '@nestjs/common';
import { BillingCycle } from './enums/billing-cycle.enum.js';
import { CsvRowErrorDto } from './dto/csv-import-response.dto.js';

export interface ValidatedCsvSubscriptionRow {
  row: number;
  name: string;
  amount: number;
  billingDate: Date;
  billingCycle: BillingCycle;
}

export interface CsvParseResult {
  totalRows: number;
  validRows: ValidatedCsvSubscriptionRow[];
  errors: CsvRowErrorDto[];
}

@Injectable()
export class CsvParserService {
  /**
   * Parses and validates raw CSV content buffer for subscription records.
   * Expected columns: name,amount,billingDate,billingCycle
   *
   * @param csvContent String or Buffer of CSV data
   */
  parseSubscriptionsCsv(csvContent: string | Buffer): CsvParseResult {
    const text =
      typeof csvContent === 'string'
        ? csvContent
        : csvContent.toString('utf-8');

    if (!text || text.trim().length === 0) {
      throw new BadRequestException('CSV file is empty');
    }

    // Split rows handling \r\n and \n
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new BadRequestException('CSV file contains no valid rows');
    }

    // Parse header row
    const rawHeader = this.parseCsvLine(lines[0]);
    const header = rawHeader.map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));

    let nameIdx = header.indexOf('name');
    let amountIdx = header.indexOf('amount');
    let dateIdx = header.findIndex(
      (h) => h === 'billingdate' || h === 'date' || h === 'startdate',
    );
    let cycleIdx = header.findIndex(
      (h) => h === 'billingcycle' || h === 'cycle' || h === 'frequency',
    );

    let startLine = 1;
    // If first row didn't match standard headers, check if it's already a data row
    if (nameIdx === -1 && amountIdx === -1) {
      nameIdx = 0;
      amountIdx = 1;
      dateIdx = 2;
      cycleIdx = 3;
      startLine = 0;
    } else {
      // Default fallback positions if some headers were omitted
      if (nameIdx === -1) nameIdx = 0;
      if (amountIdx === -1) amountIdx = 1;
      if (dateIdx === -1) dateIdx = 2;
      if (cycleIdx === -1) cycleIdx = 3;
    }

    const validRows: ValidatedCsvSubscriptionRow[] = [];
    const errors: CsvRowErrorDto[] = [];
    let dataRowCounter = 0;

    for (let i = startLine; i < lines.length; i++) {
      dataRowCounter++;
      // File line number is 1-based (e.g. line 2 is the first data row if header exists)
      const fileLineNumber = i + 1;
      const columns = this.parseCsvLine(lines[i]);

      const rawName = columns[nameIdx]?.trim();
      const rawAmount = columns[amountIdx]?.trim();
      const rawDate = columns[dateIdx]?.trim();
      const rawCycle = columns[cycleIdx]?.trim()?.toUpperCase();

      // 1. Validate Name
      if (!rawName) {
        errors.push({
          row: fileLineNumber,
          message: 'Subscription name is required',
        });
        continue;
      }

      // 2. Validate Amount
      const parsedAmount = Number(rawAmount);
      if (!rawAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
        errors.push({
          row: fileLineNumber,
          message: 'Amount must be greater than zero',
        });
        continue;
      }

      // 3. Validate Billing Date
      if (!rawDate) {
        errors.push({
          row: fileLineNumber,
          message: 'Billing date is required',
        });
        continue;
      }

      const parsedDate = this.parseDate(rawDate);
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        errors.push({
          row: fileLineNumber,
          message: 'Invalid billing date format (expected YYYY-MM-DD)',
        });
        continue;
      }

      // 4. Validate Billing Cycle
      if (
        !rawCycle ||
        (rawCycle !== BillingCycle.MONTHLY && rawCycle !== BillingCycle.YEARLY)
      ) {
        errors.push({
          row: fileLineNumber,
          message: 'Invalid billing cycle',
        });
        continue;
      }

      validRows.push({
        row: fileLineNumber,
        name: rawName,
        amount: parsedAmount,
        billingDate: parsedDate,
        billingCycle: rawCycle as BillingCycle,
      });
    }

    return {
      totalRows: dataRowCounter,
      validRows,
      errors,
    };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result.map((col) => col.replace(/^"|"$/g, ''));
  }

  private parseDate(input: string): Date | null {
    const parts = input.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month - 1, day);
      }
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
}
