import { SAUCE_BUYER, SAUCE_TAX_RATE, SAUCE_USERS } from '../../src/data/saucedemo';
import { SauceCheckoutPage } from '../../src/pages/saucedemo/checkout.page';
import { expect, sauceTest as test } from '../../src/fixtures/saucedemo.fixture';

/**
 * End-to-end examples against https://www.saucedemo.com/, a public demo shop
 * published by Sauce Labs for exactly this purpose.
 *
 * These run in their own `saucedemo` project and are NOT part of `npm run
 * test:ci`, because they depend on a site nobody here controls: an outage
 * there must never redden a pull request. Run them with
 * `npm run test:saucedemo`.
 */
test.describe('Swag Labs', () => {
  test.beforeEach(async ({ saucePages }) => {
    await saucePages.login.goto();
  });

  test('signs in and lists the catalogue', { tag: ['@external', '@smoke'] }, async ({ saucePages }) => {
    await saucePages.login.login(SAUCE_USERS.standard.username, SAUCE_USERS.standard.password);

    await expect(saucePages.inventory.title).toBeVisible();
    await expect(saucePages.inventory.productNames).toHaveCount(6);
  });

  test('refuses a locked-out account', { tag: ['@external'] }, async ({ saucePages }) => {
    await saucePages.login.login(SAUCE_USERS.lockedOut.username, SAUCE_USERS.lockedOut.password);

    await expect(saucePages.login.errorMessage).toContainText('locked out');
    // Still on the login page: the failure must not leak through to the app.
    await expect(saucePages.login.loginButton).toBeVisible();
  });

  test('sorts the catalogue by price', { tag: ['@external'] }, async ({ saucePages }) => {
    await saucePages.login.login(SAUCE_USERS.standard.username, SAUCE_USERS.standard.password);
    await expect(saucePages.inventory.title).toBeVisible();

    await saucePages.inventory.sortBy('Price (low to high)');

    // Assert the ordering the user actually sees, not that a <select> changed.
    const texts = await saucePages.inventory.prices.allInnerTexts();
    const prices = texts.map((t) => Number(t.replace('$', '')));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('buys a backpack and is charged the right total', { tag: ['@external', '@smoke'] }, async ({ saucePages }) => {
    const product = 'Sauce Labs Backpack';

    await saucePages.login.login(SAUCE_USERS.standard.username, SAUCE_USERS.standard.password);
    await expect(saucePages.inventory.title).toBeVisible();

    await saucePages.inventory.addToCart(product);
    // The count lives in the button's accessible name, so this one assertion
    // covers both "the cart updated" and "it says so to a screen reader".
    await expect(saucePages.inventory.cartButton).toHaveAccessibleName('Cart, 1 items');

    await saucePages.inventory.openCart();
    await expect(saucePages.cart.items).toHaveCount(1);
    await expect(saucePages.cart.items.first()).toContainText(product);

    await saucePages.cart.checkout();
    await saucePages.checkout.fillBuyer(SAUCE_BUYER);

    // The real check: the arithmetic the shop shows the customer.
    const subtotal = await SauceCheckoutPage.amount(saucePages.checkout.itemTotal);
    const tax = await SauceCheckoutPage.amount(saucePages.checkout.tax);
    const total = await SauceCheckoutPage.amount(saucePages.checkout.total);

    expect(tax).toBeCloseTo(subtotal * SAUCE_TAX_RATE, 2);
    expect(total).toBeCloseTo(subtotal + tax, 2);

    await saucePages.checkout.finish();
    await expect(saucePages.checkout.confirmation).toBeVisible();
  });
});
