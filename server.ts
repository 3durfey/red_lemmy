 /**
 * @fileoverview Server for Reddit to Lemmy data extraction and import.
 * Provides endpoints to fetch Reddit data and import posts to Lemmy communities.
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import { loginLemmy } from './lemmy/login.js';
import { createLemmyPost } from './lemmy/createPost.js';
import { createLemmyCommunity } from './lemmy/createCommunity.js';
import { fetchReddit } from './reddit.js';

const app = express();

app.use(express.json());
app.use(express.static('frontend'));

app.get('/login-status', async (req: Request, res: Response): Promise<void> => {
    try {
        const jwt = await loginLemmy();
        res.json({ success: true, message: 'Login successful', jwt });
    } catch (error) {
        res.status(401).json({ success: false, message: (error as Error).message });
    }
});

/**
 * @route POST /fetch
 * @desc Fetches Reddit data from a given URL by appending .json.
 * @param {Request} req - Express request with body.url
 * @param {Response} res - Express response
 */
app.post('/fetch', async (req: Request, res: Response): Promise<void> => {
    try {
        const data = await fetchReddit(req.body.url);
        res.json(data);
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
        const jwt = await loginLemmy();
        const communityId = await createLemmyCommunity(jwt, redditUrl, redditUrl, '');
        res.json({ success: true, communityId });
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
        const jwt = await loginLemmy();
        const post = await createLemmyPost(jwt, communityId, redditData.title, redditData.selftext, redditData.url);
        res.json({ success: true, post });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));