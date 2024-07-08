import { Locator, Page, errors } from '@playwright/test';
import { Delays } from '../fixtures/constants/common.enums';
import PageHelper from './pageHelper';

export default class Wait {
  static async executeFunctionUntilTrue(
    functionToBeTrue: () => boolean | undefined,
    functionToExecute: () => Promise<void>,
    expectedSituation?: string,
    retryPeriodInMs: number = Delays.MINUTE,
    delayInMs: number = Delays.MILLISECOND * 2500
  ): Promise<void> {
    const start: number = new Date().valueOf();
    while (!functionToBeTrue() && new Date().valueOf() - start < retryPeriodInMs) {
      await functionToExecute();
      await this.sleep(delayInMs);
    }
    if (!functionToBeTrue()) {
      throw new Error(`${expectedSituation || 'Function'} was not true within ${retryPeriodInMs}ms.`);
    }
  }

  static async reloadUntilLocatorVisible(
    page: Page,
    locator: Locator,
    expectedSituation?: string,
    retryPeriodInMs: number = Delays.MINUTE,
    delayInMs: number = Delays.MILLISECOND * 2500
  ): Promise<void> {
    let isLocatorVisible = false;

    await Wait.executeFunctionUntilTrue(
      () => isLocatorVisible,
      async () => {
        await PageHelper.reloadPage(page);

        let errorThrown = false;
        try {
          await locator.waitFor({ state: 'visible', timeout: 10000 });
        } catch (error) {
          if (error instanceof errors.TimeoutError) {
            errorThrown = true;
          } else {
            throw error;
          }
        }
        isLocatorVisible = !errorThrown;
      },
      expectedSituation,
      retryPeriodInMs,
      delayInMs
    );
  }

  static async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
