import { env } from '../utils/env';

export interface Credentials {
  username: string;
  password: string;
}

export const STANDARD_USER: Credentials = {
  username: env.username,
  password: env.password,
};

export const INVALID_USER: Credentials = {
  username: 'wrong_user',
  password: 'wrong_password',
};
