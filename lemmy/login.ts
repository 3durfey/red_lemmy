/**
 * @fileoverview Login function for Lemmy.
 */

import { lemmyClient } from './client.js';

/**
 * Logs into Lemmy using credentials from environment variables.
 * @returns {Promise<string>} JWT token for authenticated requests.
 * @throws {Error} If login fails.
 */
export async function loginLemmy(): Promise<string> {
    try {
        const res = await lemmyClient.login({
            username_or_email: process.env.LEMMY_USERNAME!,
            password: process.env.LEMMY_PASSWORD!
        });
        if (!res.jwt) {
            throw new Error('No JWT returned');
        }
        lemmyClient.setHeaders({ Authorization: `Bearer ${res.jwt}` });
        console.log('Logged in');
        return res.jwt;
    } catch (error) {
        console.error('Login error:', (error as Error).message);
        throw new Error(`Lemmy login failed: ${(error as Error).message}`);
    }
}
