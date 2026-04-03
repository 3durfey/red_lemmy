/**
 * @fileoverview Shared Lemmy HTTP client instance.
 */

import { LemmyHttp } from 'lemmy-js-client';

export const lemmyClient = new LemmyHttp(process.env.LEMMY_BASE_URL!);
