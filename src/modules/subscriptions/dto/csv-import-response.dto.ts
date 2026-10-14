import { ApiProperty } from '@nestjs/swagger';

export class CsvRowErrorDto {
  @ApiProperty({ example: 3, description: 'Line or row number in the CSV file' })
  row: number;

  @ApiProperty({
    example: 'Amount must be greater than zero',
    description: 'Validation error message for this row',
  })
  message: string;
}

export class CsvImportResponseDto {
  @ApiProperty({ example: 5, description: 'Total number of data rows processed' })
  totalRows: number;

  @ApiProperty({ example: 3, description: 'Number of successfully imported subscriptions' })
  imported: number;

  @ApiProperty({ example: 2, description: 'Number of rejected/skipped rows' })
  rejected: number;

  @ApiProperty({
    type: [CsvRowErrorDto],
    description: 'List of row-level validation errors encountered',
  })
  errors: CsvRowErrorDto[];
}
