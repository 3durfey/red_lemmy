 /**
 * @fileoverview Server for Reddit to Lemmy data extraction and import.
 * Provides endpoints to fetch Reddit data and import posts to Lemmy communities.
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import axios from 'axios';
import { LemmyHttp } from 'lemmy-js-client';

const app = express();

app.use(express.json());
app.use(express.static('frontend'));

const MOBILE_UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36";

// Lemmy client
const lemmyClient = new LemmyHttp(process.env.LEMMY_BASE_URL!);

/**
 * Logs into Lemmy using credentials from environment variables.
 * @returns {Promise<string>} JWT token for authenticated requests.
 * @throws {Error} If login fails.
 */
async function loginLemmy(): Promise<string> {
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
async function createLemmyPost(jwt: string, communityId: number, title: string, body: string, url: string): Promise<any> {
    try {
        const res = await lemmyClient.createPost({
            name: title,
            body,
            url,
            community_id: communityId
        });
        return res.post_view.post;
    } catch (error) {
        console.error('Post creation error:', (error as Error).message);
        throw new Error(`Lemmy post creation failed: ${(error as Error).message}`);
    }
}

/**
 * Creates a new community on Lemmy based on Reddit subreddit URL.
 * @param {string} jwt - JWT token for authentication.
 * @param {string} redditUrl - Reddit URL to extract subreddit name from.
 * @param {string} title - Title for the new community.
 * @param {string} description - Description for the new community.
 * @returns {Promise<number>} ID of the created community.
 * @throws {Error} If community creation fails.
 */
async function createLemmyCommunity(jwt: string, redditUrl: string, title: string, description: string): Promise<number> {
    // Extract subreddit name from URL
    const subredditMatch = redditUrl.match(/\/r\/([^\/]+)/);
    const subredditName = subredditMatch ? subredditMatch[1] : 'unknown';
    const communityName = `${subredditName}_lemmy`;

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

/**
 * @route POST /fetch
 * @desc Fetches Reddit data from a given URL by appending .json.
 * @param {Request} req - Express request with body.url
 * @param {Response} res - Express response
 */
app.post('/fetch', async (req: Request, res: Response): Promise<void> => {
    let redditUrl: string = req.body.url;

    // The Redlib Approach: Append .json to the URL
    if (!redditUrl.endsWith('.json')) {
        redditUrl = redditUrl.replace(/\/$/, "") + ".json";
    }

    try {
        const response = await axios.get(redditUrl, {
            headers: { 'User-Agent': MOBILE_UA }
        });
        res.json(response.data);
    } catch (error) {
        res.status(400).json({ error: "Failed to fetch Reddit data. Check the URL." });
    }
});

/**
 * @route POST /create-community
 * @desc Creates a new Lemmy community based on Reddit subreddit URL.
 * @param {Request} req - Express request with body.redditUrl
 * @param {Response} res - Express response
 */
app.post('/create-community', async (req: Request, res: Response): Promise<void> => {
    const { redditUrl }: { redditUrl: string } = req.body;

    console.log('Raw redditUrl received:', redditUrl);

    try {
        // Login to Lemmy
        const jwt = await loginLemmy();

        // Extract subreddit name for response
        const subredditMatch = redditUrl.match(/\/r\/([^\/]+)/);
        const subredditName = subredditMatch ? subredditMatch[1].toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'unknown';
        const communityName = `${subredditName}_lemmy`;

        // Create community from Reddit URL
        const communityId = await createLemmyCommunity(jwt, redditUrl, redditUrl, '');

        res.json({ success: true, communityId, communityName });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * @route POST /import-to-lemmy
 * @desc Imports a Reddit post to an existing Lemmy community.
 * @param {Request} req - Express request with body.redditData and communityId
 * @param {Response} res - Express response
 */
app.post('/import-to-lemmy', async (req: Request, res: Response): Promise<void> => {
    const { redditData, communityId }: { redditData: any; communityId: number } = req.body;

    try {
        // Login to Lemmy
        const jwt = await loginLemmy();

        // Create post (example: use title and selftext)
        const post = await createLemmyPost(jwt, communityId, redditData.title, redditData.selftext, redditData.url);

        res.json({ success: true, post });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));