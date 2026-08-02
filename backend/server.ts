import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const KATANA_BASE_URL = 'https://api.katanamrp.com/v1';

// Completely open CORS for testing
app.use(cors());

// Helper function to fetch from Katana securely
async function fetchFromKatana(endpoint: string, options: RequestInit = {}) {
    const apiKey = process.env.KATANA_KEY;

    console.log(apiKey)
    if (!apiKey) {
        throw new Error('KATANA_KEY is missing in server environment variables.');
    }

    const response = await fetch(`${KATANA_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,

            // 2. Exact headers expected by Katana / Cloudflare
            'Accept': 'application/json',
            'Content-Type': 'application/json',

            // 3. User-Agent string resembling a browser or standard client
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...options.headers,
        },
    });
    console.log(response)
    if (!response.ok) {
        console.log("Response not ok")
        const errorText = await response.text();
        throw new Error(`Katana API Error (${response.status}): ${errorText}`);
    }

    return response.json();
}

// 📦 Test endpoint for Inventory
app.get('/api/inventory', async (req: Request, res: Response) => {
    console.log("----------------------------------------");
    console.log("📦 Fetching inventory from Katana...");

    try {
        // Katana's API endpoint for inventory balances
        const data = await fetchFromKatana('/inventory');

        console.log(`✅ Success! Fetched ${data.data?.length || 0} inventory items.`);
        res.json(data);
    } catch (error) {
        console.error("❌ Inventory Fetch Error:", error);
        res.status(500).json({
            error: "Failed to fetch inventory",
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

app.get('/api', (req: Request, res: Response) => {
    console.log("----------------------------------------");
    console.log("⚡ Pinged local /api endpoint!");

    // Explicitly send a response back to Chrome!
    res.json({ status: "ok", message: "Express server is active" });
});


app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});