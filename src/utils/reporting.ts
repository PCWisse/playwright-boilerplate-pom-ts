import * as allure from 'allure-js-commons';

import { env } from './env';

export type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

export interface Annotation {
  severity?: Severity;
  /** Top-level grouping, e.g. a product area. */
  epic?: string;
  /** Second-level grouping, e.g. a user-facing capability. */
  feature?: string;
  /** Third-level grouping, e.g. a single user story. */
  story?: string;
  /** Ticket key, e.g. 'SHOP-1234'. Linked via TICKET_BASE_URL. */
  issue?: string;
  owner?: string;
}

/**
 * Adds Allure metadata to the current test. Every field is optional; call it as
 * the first statement in a test body.
 *
 * These annotations are what make the Allure report worth its extra
 * dependency: they group results by product area and link a failure straight to
 * its ticket. They are inert in the built-in HTML report.
 */
export async function annotate(options: Annotation): Promise<void> {
  if (options.severity !== undefined) {
    await allure.severity(options.severity);
  }
  if (options.epic !== undefined) {
    await allure.epic(options.epic);
  }
  if (options.feature !== undefined) {
    await allure.feature(options.feature);
  }
  if (options.story !== undefined) {
    await allure.story(options.story);
  }
  if (options.owner !== undefined) {
    await allure.owner(options.owner);
  }
  if (options.issue !== undefined) {
    // `allure.issue` takes (url, name) — in that order. Passing the ticket key
    // first produces a link whose href is the bare key and whose label is the
    // URL, which renders as a dead link in the report.
    await allure.issue(`${env.ticketBaseUrl}${options.issue}`, options.issue);
  }
}
