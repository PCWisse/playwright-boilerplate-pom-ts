/*
 * Copyright (C) 2024, Alphabet International GmbH
 */

import type { Locator, Page } from '@playwright/test';
import Wait from '../../../helpers/wait';


export default class Table {
  protected page: Page;
  private parentLocator: Locator;
  protected component: Locator;
  protected columnHeader: Locator;
  protected firstRow: Locator;
  protected columnFirstRow: Locator;
  protected row: Locator;
  protected span: Locator;
  tableBody: Locator;
  totalTableRows: Locator;
  protected lastRow: Locator;

  constructor(page: Page, parentLocator: Locator) {
    this.page = page;
    this.parentLocator = parentLocator;
    this.component = this.parentLocator.locator('table');
    this.columnHeader = this.component.locator('thead th');
    this.tableBody = this.component.locator('tbody');
    this.firstRow = this.component.locator('tbody tr').first();
    this.lastRow = this.component.locator('tbody tr').last();
    this.columnFirstRow = this.firstRow.locator('td');
    this.span = this.columnFirstRow.locator('span');
    this.row = this.component.locator('tbody tr');
  }

  async waitForTableToBeVisible(): Promise<void> {
    await this.page.waitForTimeout(1500);
    await this.tableBody.waitFor({ state: 'attached' });
  }

  async countRows(): Promise<number> {
    return this.row.count();
  }

  async getColumnIndexByName(columnName: string): Promise<number> {
    await this.component.waitFor({ state: 'visible' });
    const columns = await this.columnHeader.count();
    for (let index = 0; index < columns; index++) {
      if ((await this.columnHeader.nth(index).innerText()) === columnName) {
        return index;
      }
    }
    throw new Error(`Could not find column named ${columnName}`);
  }
  async getValueFromARowWhenColumnNameGiven(columnName: string): Promise<any> {
    await this.component.waitFor({ state: 'visible' });
    const columns = await this.columnHeader.count();
    for (let i = 0; i < columns; i++) {
      if ((await this.columnHeader.nth(i).innerText()) === columnName) {
        const result = await this.columnFirstRow.nth(i).innerText();
        return result?.trim();
      }
    }
  }

  async getValueFromTable(columnHeader: string): Promise<string> {
    await this.waitForTableToBeVisible();
    const filterLocator: Locator = this.component.filter({ hasText: columnHeader }).locator('tbody tr td .al-label');
    return filterLocator.innerText();
  }

  async openRowWithValue(rowValue: string): Promise<void> {
    await this.waitForTableToBeVisible();
    const filterLocator: Locator = this.row.filter({ hasText: rowValue });
    await filterLocator.click();
  }

  async openLastRow(): Promise<void> {
    await this.waitForTableToBeVisible();
    await this.lastRow.click();
  }

  async openFirstRow(): Promise<void> {
    await this.waitForTableToBeVisible();
    await this.firstRow.click();
  }

  async isRowVisible(taskName: string): Promise<boolean> {
    return this.row.locator(`td:has-text("${taskName}")`).isVisible();
  }

  async getClassFromColumnOnFirstRow(header: string): Promise<boolean | undefined> {
    await this.component.waitFor({ state: 'visible' });
    const columns = await this.columnHeader.count();

    for (let i = 0; i < columns; i++) {
      if ((await this.columnHeader.nth(i).textContent()) === header) {
        const td = this.columnFirstRow.nth(i);
        const span = td.locator('span');

        if (await span.isVisible()) {
          const className = await span.getAttribute('class');
          return className?.includes('al-ds-icon-checked');
        } else {
          return false;
        }
      }
    }
  }

  async waitForRowCountEquals(rows = 1): Promise<boolean> {
    let isCorrectAmountOfRowsVisible = false;

    await Wait.executeFunctionUntilTrue(
      () => isCorrectAmountOfRowsVisible,
      async () => {
        isCorrectAmountOfRowsVisible = (await this.countRows()) === rows;
      },
      `Table with ${await this.countRows()} rows has been loaded`
    );

    return isCorrectAmountOfRowsVisible;
  }

  async checkRowExistence(searchArray: { columnIndex: number; searchValue: string }[]): Promise<boolean> {
    await this.component.nth(0).waitFor({ state: 'attached' });
    try {
      await this.searchAllRowsForValueWhenColumnIndexGiven(searchArray);
      return true;
    } catch (err) {
      return false;
    }
  }

  async findRowAndClickColumnIcon(searchCombination: { columnIndex: number; searchValue: string }[], locator: string): Promise<void> {
    await (await this.searchAllRowsForValueWhenColumnIndexGiven(searchCombination)).locator(locator).click();
  }

  async findRowAndGetColumnValue(searchArray: { columnIndex: number; searchValue: string }[], locator: string): Promise<string> {
    return (await this.searchAllRowsForValueWhenColumnIndexGiven(searchArray)).locator(locator).innerText();
  }

  async searchAllRowsForValueWhenColumnIndexGiven(searchArray: { columnIndex: number; searchValue: string }[]): Promise<Locator> {
    const rowCount = await this.row.count();
    for (let i = 0; i < rowCount; i++) {
      const rowData = await this.row.nth(i).allInnerTexts();
      for (const columnData of searchArray) {
        const rowDataArray: any = rowData[0].split('\t');
        if (rowDataArray[columnData.columnIndex].trim() === columnData.searchValue) {
          return this.row.nth(i);
        }
      }
    }
    throw new Error('Could not find values in any row');
  }

  async getRowIndexByColumnIndexAndValue(searchArray: { columnIndex: number; searchValue: string }[]): Promise<number> {
    const rowCount = await this.row.count();
    for (let i = 0; i < rowCount; i++) {
      const rowData = await this.row.nth(i).allInnerTexts();
      for (const columnData of searchArray) {
        const rowDataArray: any = rowData[0].split('\t');
        if (rowDataArray[columnData.columnIndex].trim() === columnData.searchValue) {
          return i;
        }
      }
    }
    throw new Error('Could not find values in any row');
  }

  async getValueOfCell(rowIndex: number, columnIndex: number): Promise<string> {
    return await this.getLocatorOfCell(rowIndex, columnIndex).innerText();
  }

  getLocatorOfCell(rowIndex: number, columnIndex: number): Locator {
    return this.component.locator('tr').nth(rowIndex).locator('td').nth(columnIndex);
  }

  async getFirstRowOfTable(): Promise<string> {
    return this.firstRow.innerText();
  }

  async getLastRowOfTable(): Promise<string> {
    return this.lastRow.innerText();
  }
}
