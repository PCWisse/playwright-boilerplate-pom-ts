import * as allure from 'allure-js-commons';

import { env } from './env';

/**
 * The only severities Allure recognises, as a union so a typo fails the build
 * instead of quietly producing a test with no severity at all.
 */
export type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

/**
 * Allure metadata for a single test; every field is optional.
 *
 * `epic`, `feature` and `story` form the report's three-level grouping tree, so
 * they only pay off when a whole suite spells them consistently. Agree the
 * vocabulary once, at the start of a project.
 */
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
    // `allure.issue` takes (url, name), in that order. Passing the ticket key
    // first produces a link whose href is the bare key and whose label is the
    // URL, which renders as a dead link in the report.
    await allure.issue(`${env.ticketBaseUrl}${options.issue}`, options.issue);
  }
}

/** Keys whose values must never reach a report artifact. */
const SECRET_KEY = /^(token|password|secret|authorization|cookie|api_?key|refresh_?token)$/i;

const REDACTED = '«redacted»';

/** Largest attachment body kept, in characters. */
const MAX_BODY_CHARS = 8_192;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, SECRET_KEY.test(key) ? REDACTED : redact(nested)]));
  }
  return value;
}

/**
 * Prepares a response body for attachment to a test result.
 *
 * Attachments are not private. `testInfo.attach` feeds every reporter at once:
 * the built-in HTML report, the `blob` report that CI uploads as an artifact,
 * and Allure. So a raw body containing a bearer token would be published to
 * anyone who can read the pipeline's artifacts. Redact secret-looking keys
 * before that happens, and cap the size so a large listing endpoint cannot
 * inflate the report on every request, every retry, in every project.
 */
export function sanitiseBody(raw: string): string {
  if (raw === '') {
    return '(empty body)';
  }

  let text = raw;
  try {
    text = JSON.stringify(redact(JSON.parse(raw)), null, 2);
  } catch {
    // Not JSON: attach it verbatim, still capped. Redaction is key-based and
    // cannot be applied safely to an unknown format.
  }

  return text.length > MAX_BODY_CHARS ? `${text.slice(0, MAX_BODY_CHARS)}\n… truncated, ${String(text.length - MAX_BODY_CHARS)} more characters` : text;
}
