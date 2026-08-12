import type { Request, Response } from 'express';
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');

dotenv.config();

const authRoutes = require('./authRoutes').default; // 👈 1. Import your auth router after env loads

const app = express();
const PORT = process.env.PORT || 3000;
const KATANA_BASE_URL = 'https://api.katanamrp.com/v1';

// Middleware to parse incoming JSON bodies for POST/PUT/PATCH requests
app.use(express.json());

app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use('/api/auth', authRoutes);

// Dynamic proxy function handling all HTTP methods & body payloads
async function forwardToKatana(req: Request, targetPath: string) {
    const apiKey = process.env.KATANA_KEY;

    if (!apiKey) {
        throw new Error('KATANA_KEY is missing in server environment variables.');
    }

    // Preserve query parameters (e.g., /api/sales_orders?limit=10)
    const queryString = Object.keys(req.query).length
        ? `?${new URLSearchParams(req.query as Record<string, string>).toString()}`
        : '';

    const url = `${KATANA_BASE_URL}${targetPath}${queryString}`;

    console.log(`[${req.method}] Proxying to Katana: ${url}`);

    const options: RequestInit = {
        method: req.method,
        headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
    };

    // Attach request body for state-changing methods (POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        options.body = typeof req.body === 'string'
            ? req.body
            : JSON.stringify(req.body);
    }
    console.log(options);
    const response = await fetch(url, options);

    if (!response.ok) {
        const errorText = await response.text();
        throw { status: response.status, message: errorText };
    }

    // Handle 204 No Content responses safely
    if (response.status === 204) {
        return {};
    }

    return response.json();
}

// 👈 3. The Katana catch-all wildcard proxy handles any other /api/* route
app.all('/api/*splat', async (req: Request, res: Response) => {
    console.log("----------------------------------------");
    if (req.body) {
        console.log("req body", req.body);
    } else console.log("No body in request");

    // Extract everything that comes after '/api' (e.g., '/inventory', '/products/123')
    const targetPath = req.path.replace(/^\/api/, '');
    console.log(targetPath);
    try {
        const data = await forwardToKatana(req, targetPath);
        res.json(data);
    } catch (error: any) {
        console.error(`Katana Proxy Error on [${req.method} /api${targetPath}]:`, error);

        const statusCode = error.status || 500;
        res.status(statusCode).json({
            error: `Failed to execute ${req.method} on Katana endpoint`,
            details: error.message || String(error)
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});