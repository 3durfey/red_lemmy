/**
 * @fileoverview Create community function for Lemmy.
 */

import { lemmyClient } from './client.js';

/**
 * Creates a new community on Lemmy based on Reddit subreddit URL.
 * @param {string} jwt - JWT token for authentication.
 * @param {string} redditUrl - Reddit URL to extract subreddit name from.
 * @param {string} title - Title for the new community.
 * @param {string} description - Description for the new community.
 * @returns {Promise<number>} ID of the created community.
 * @throws {Error} If community creation fails.
 */
export async function createLemmyCommunity(jwt: string, redditUrl: string, title: string, description: string): Promise<number> {
    const subredditMatch = redditUrl.match(/\/r\/([^\/]+)/);
    const subredditName = subredditMatch ? subredditMatch[1] : 'unknown';
    const communityName = `${subredditName}_lemmy`;

    console.log('Subreddit URL:', redditUrl);
    console.log('Extracted subreddit name:', subredditName);
    console.log('Final community name:', communityName);

    try {
        const res = await lemmyClient.createCommunity({
            name: communityName,
            title,
            description
        });
        return res.community_view.community.id;
    } catch (error) {
        console.error('Community creation error:', (error as Error).message);
        throw new Error(`Lemmy community creation failed: ${(error as Error).message}`);
    }
}
