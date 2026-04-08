/**
 * @fileoverview Create post function for Lemmy.
 */

import { lemmyClient } from './client.js';

/**
 * Creates a new post on Lemmy.
 * @param {string} jwt - JWT token for authentication.
 * @param {number} communityId - ID of the Lemmy community.
 * @param {string} title - Title of the post.
 * @param {string} body - Body content of the post.
 * @param {string} url - URL to attach to the post.
 * @returns {Promise<any>} Created post data.
 * @throws {Error} If post creation fails.
 */
export async function createLemmyPost(jwt: string, communityId: number, title: string, body: string, url: string): Promise<any> {
    try {
        const res = await lemmyClient.createPost({
            name: title,
            body,
            ...(url ? { url } : {}),
            community_id: communityId
        });
        return res.post_view.post;
    } catch (error) {
        console.error('Post creation error:', (error as Error).message);
        throw new Error(`Lemmy post creation failed: ${(error as Error).message}`);
    }
}
