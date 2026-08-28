import type { Locator, Page } from '@playwright/test';

import { NavComponent } from '../components/nav.component';
import { TableComponent } from '../components/table.component';
import { BasePage } from './base.page';

export class InventoryPage extends BasePage {
  protected readonly path = '/inventory.html';

  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly emptyState: Locator;
  readonly table: TableComponent;
  readonly nav: NavComponent;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Inventory', level: 1 });
    this.searchInput = page.getByLabel('Search items');
    this.emptyState = page.getByTestId('empty-state');
    this.table = new TableComponent(page, page.getByRole('main'));
    this.nav = new NavComponent(page);
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }
}
