import express, {type  Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();


const router = express.Router();
console.log(process.env.SUPABASE_URL)

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!
);

const getEmailFromUsername = (username: string) =>
  username.includes('@') ? username : `${username}@example.com`;

async function findEmailForUsername(username: string): Promise<string | null> {
  if (username.includes('@')) return username;

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error || !data?.users) {
    console.error('Error listing users for username lookup', error);
    return null;
  }

  const found = data.users.find((user) => user.user_metadata?.username === username);
  return found?.email ?? null;
}

router.post('/register', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const email = getEmailFromUsername(username);

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (error) {
      const message =
        error.message || 'Unable to create user account. Please try again.';
      const conflict = message.toLowerCase().includes('already');
      return res.status(conflict ? 409 : 400).json({ error: message });
    }

    return res
      .status(201)
      .json({ message: 'User created successfully', user: data.user });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const email = username.includes('@')
      ? username
      : await findEmailForUsername(username);

    if (!email) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user || !data.session) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = data.user;
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not set in environment');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        username: user.user_metadata?.username ?? user.email,
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.user_metadata?.username ?? user.email,
      },
      token,
    });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
