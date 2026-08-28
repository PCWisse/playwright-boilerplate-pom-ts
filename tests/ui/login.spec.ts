import { INVALID_USER, STANDARD_USER } from '../../src/data/users';
import { expect, test } from '../../src/fixtures';

test.describe('Login', () => {
  // The login flow must start signed out, so discard the shared storage state.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('signs in with valid credentials', { tag: ['@smoke'] }, async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login(STANDARD_USER.username, STANDARD_USER.password);

    await expect(page.getByRole('heading', { name: 'Inventory', level: 1 })).toBeVisible();
    await expect(page.getByTestId('current-user')).toHaveText(STANDARD_USER.username);
  });

  test(
    'shows an error for invalid credentials',
    { tag: ['@regression'] },
    async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login(INVALID_USER.username, INVALID_USER.password);

      await expect(loginPage.errorMessage).toBeVisible();
      await expect(loginPage.errorMessage).toHaveText('Invalid username or password');
    },
  );
});
