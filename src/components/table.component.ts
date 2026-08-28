import type { Locator, Page } from '@playwright/test';

import { BaseComponent } from './base.component';

/**
 * Generic data-table component built on ARIA role locators, so it works with
 * any semantic table regardless of styling or class names.
 */
export class TableComponent extends BaseComponent {
  private readonly table: Locator;

  constructor(page: Page, root: Locator) {
    super(page, root);
    this.table = root.getByRole('table');
  }

  rows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  async rowCount(): Promise<number> {
    return this.rows().count();
  }

  async headerNames(): Promise<string[]> {
    const headers = await this.table.getByRole('columnheader').allInnerTexts();
    return headers.map((header) => header.trim());
  }

  async columnIndex(name: string): Promise<number> {
    const headers = await this.headerNames();
    const index = headers.indexOf(name);
    if (index === -1) {
      throw new Error(
        `Column "${name}" not found. Available columns: ${headers.join(', ') || '(none)'}`,
      );
    }
    return index;
  }

  /** The first row whose text contains `text`. Chained + filtered, not indexed. */
  rowContaining(text: string): Locator {
    return this.rows().filter({ hasText: text }).first();
  }

  async cell(rowIndex: number, columnName: string): Promise<Locator> {
    const index = await this.columnIndex(columnName);
    return this.rows().nth(rowIndex).getByRole('cell').nth(index);
  }

  async cellText(rowIndex: number, columnName: string): Promise<string> {
    const cell = await this.cell(rowIndex, columnName);
    return (await cell.innerText()).trim();
  }

  async columnValues(columnName: string): Promise<string[]> {
    const index = await this.columnIndex(columnName);
    const rowCount = await this.rowCount();
    const values: string[] = [];
    for (let row = 0; row < rowCount; row += 1) {
      const text = await this.rows().nth(row).getByRole('cell').nth(index).innerText();
      values.push(text.trim());
    }
    return values;
  }
}
