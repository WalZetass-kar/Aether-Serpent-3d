import dotenv from 'dotenv';
import express from 'express';
import { registerApiRoutes } from '../shared/mpServerCore.ts';

dotenv.config();

const app = express();
app.use(express.json({ limit: '512kb' }));

registerApiRoutes(app);

export default app;
