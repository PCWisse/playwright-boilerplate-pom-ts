import { env } from '../utils/env';

/**
 * The shape every fixture account here shares. Extend it in one place when your
 * application needs more than a username and password — a tenant id, an MFA
 * seed — and every user below is updated with it.
 */
export interface Credentials {
  username: string;
  password: string;
}

/**
 * The happy-path account. Sourced from `TEST_USERNAME` / `TEST_PASSWORD` so real
 * credentials live in `.env` and never in the repository. This is the account
 * `src/setup/auth.setup.ts` signs in as to produce the shared storage state.
 */
export const STANDARD_USER: Credentials = {
  username: env.username,
  password: env.password,
};

/**
 * Hard-coded rubbish, deliberately: it exists to exercise the failure path
 * (`tests/ui/login.spec.ts`). Never point it at the environment — the whole
 * value of this constant is that the credentials are guaranteed not to work.
 */
export const INVALID_USER: Credentials = {
  username: 'wrong_user',
  password: 'wrong_password',
};
