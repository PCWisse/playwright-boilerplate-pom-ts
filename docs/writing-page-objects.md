# Writing page objects

## The shape

A page object exposes **locators as properties** and **intentions as methods**.
It never asserts. This is `src/pages/login.page.ts` in full:

```typescript
import { test, type Locator, type Page } from '@playwright/test';

import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  protected readonly path = '/login.html';

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByLabel('Username');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async login(username: string, password: string): Promise<void> {
    await test.step(`Sign in as "${username}"`, async () => {
      await this.usernameInput.fill(username);
      await this.passwordInput.fill(password);
      await this.submitButton.click();
    });
  }
}
```

Locators are created in the constructor and are lazy — nothing touches the page
until an action or assertion runs, so constructing a page object is free.

## BasePage

`src/pages/base.page.ts` gives every page `goto()` (navigates to `path`,
relative to `baseURL`, then calls `waitUntilLoaded()`) and `waitUntilLoaded()`.

The readiness hook is opt-in. `BasePage` declares:

```typescript
protected readonly loadingIndicatorTestId: string | null = null;

get loadingIndicator(): Locator | null {
  return this.loadingIndicatorTestId === null
    ? null
    : this.page.getByTestId(this.loadingIndicatorTestId);
}
```

Set `loadingIndicatorTestId` in a subclass and every `goto()` waits for that
element to become hidden. Leave it `null` (as all four shipped pages do, since
the demo app has no spinner) and `waitUntilLoaded()` is a no-op. For anything
more complex, override `waitUntilLoaded()` outright.

## Components vs pages

A **component** is UI that appears in more than one place. `BaseComponent`
(`src/components/base.component.ts`) takes a `page` and a **root locator** and
scopes everything to it, so its locators can never accidentally match an element
elsewhere on the page.

There are two shapes in the tree, and they are not interchangeable:

```typescript
// Root passed in by the caller — reusable wherever the markup appears.
this.table = new TableComponent(page, page.getByRole('main'));

// Root owned by the component — there is exactly one main nav.
this.nav = new NavComponent(page);
```

`NavComponent` fixes its own root (`page.getByRole('navigation', { name: 'Main' })`)
and its constructor takes only `page`. Use that shape when the element is a
singleton; use the injected-root shape when it is not.

`TableComponent` is the model for a reusable component: it is built entirely on
role locators (`table`, `columnheader`, `row`, `cell`), so it works with any
semantic table regardless of styling or class names. It exposes `root` (what was
passed in) and `element` (the `<table>` inside it) — use `element` when you need
to scope a screenshot or a whole-component assertion to the table itself.

## Wrap multi-action methods in `test.step`

A step gives the report a readable tree and points a failure at the action
instead of a bare locator. Wrap anything that performs more than one action —
`LoginPage.login`, `FormPage.createItem`, `TableComponent.columnValues` — and
leave single-action methods like `InventoryPage.search` alone.

Note that `columnValues` is **not** declared `async`: its body is a single
`return test.step(...)`, and marking it `async` trips `require-await` under
`strictTypeChecked`. It still returns a `Promise<string[]>`.

## Adding a new page

1. Create `src/pages/<name>.page.ts` extending `BasePage`.
2. Add it to `PomFixtures` and `pomTest` in `src/fixtures/pom.fixture.ts`.
3. It is now available as a fixture in every spec: `async ({ myPage }) => {}`.

Fixtures are lazy — adding one costs nothing to tests that do not name it.

## Path aliases

`tsconfig.json` defines `@pages/*`, `@components/*`, `@fixtures/*`, `@api/*`,
`@utils/*` and `@data/*`. The shipped code uses relative imports throughout;
if you switch to the aliases, switch consistently.
