import type { Locator, Page } from '@playwright/test';

/**
 * Shared surface for every page object: navigation relative to `baseURL` and a
 * readiness hook.
 *
 * Adapting to a real project: most applications show a global spinner while
 * loading. Set `loadingIndicatorTestId` in the subclass (or override
 * `waitUntilLoaded`) so every page waits for it to disappear.
 */
export abstract class BasePage {
  protected abstract readonly path: string;

  /** Override in a subclass when the application has a global loading spinner. */
  protected readonly loadingIndicatorTestId: string | null = null;

  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get loadingIndicator(): Locator | null {
    return this.loadingIndicatorTestId === null ? null : this.page.getByTestId(this.loadingIndicatorTestId);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitUntilLoaded();
  }

  async waitUntilLoaded(): Promise<void> {
    const indicator = this.loadingIndicator;
    if (indicator !== null) {
      await indicator.waitFor({ state: 'hidden' });
    }
  }
}
