import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase with Service Role Key (allows backend to bypass RLS safely)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- 1. REGISTER USER ---
router.post('/register', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    // Hash password before saving
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const { data, error } = await supabase
      .from('app_users')
      .insert([{ username, password_hash: hashedPassword }])
      .select('id, username, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Username already taken' });
      }
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ message: 'User created successfully', user: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- 2. LOGIN USER ---
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    // Fetch user by username
    const { data: user, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare provided password with hashed password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    return res.status(200).json({
      message: 'Login successful',
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;