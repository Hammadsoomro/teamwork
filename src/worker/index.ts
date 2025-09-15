import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import {
  CreateUserSchema,
  UpdateUserSchema,
  SendMessageSchema,
  AddScrapperDataSchema,
  UpdateScrapperSettingsSchema,
  UpdateSalesSchema,
  UserRole,
} from '@/shared/types';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

const LOCAL_SESSION_COOKIE = 'LOCAL_SESSION';

async function ensureAuthSchema(c: any) {
  await c.env.DB.exec(`
    CREATE TABLE IF NOT EXISTS auth_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await c.env.DB.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(password + ':' + salt);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getSessionUser(c: any) {
  await ensureAuthSchema(c);
  const token = getCookie(c, LOCAL_SESSION_COOKIE);
  if (!token) return null;
  const session = await c.env.DB.prepare(
    'SELECT * FROM sessions WHERE token = ? AND expires_at > CURRENT_TIMESTAMP'
  )
    .bind(token)
    .first();
  if (!session) return null;
  const user = await c.env.DB.prepare('SELECT * FROM app_users WHERE id = ?')
    .bind(session.user_id)
    .first();
  return user || null;
}

function localAuth(): any {
  return async (c: any, next: any) => {
    const user = await getSessionUser(c);
    if (!user) return c.json({ error: 'Not authenticated' }, 401);
    c.set('user', user);
    await next();
  };
}

// CORS middleware
app.use('/*',
  cors({
    origin: '*',
    credentials: true,
  })
);

// Email/Password Auth Endpoints
app.post('/api/auth/signup', async (c) => {
  await ensureAuthSchema(c);
  const body = await c.req.json();
  const { first_name, last_name, phone, email, password, confirm_password } = body || {};
  if (!first_name || !last_name || !phone || !email || !password || !confirm_password) {
    return c.json({ error: 'All fields are required' }, 400);
  }
  if (password !== confirm_password) {
    return c.json({ error: 'Passwords do not match' }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT 1 FROM auth_credentials WHERE email = ?')
    .bind(email)
    .first();
  if (existing) return c.json({ error: 'Email already registered' }, 400);

  const countRow = await c.env.DB.prepare('SELECT COUNT(*) as count FROM app_users').first();
  const isFirst = countRow && (countRow.count as number) === 0;
  const role: UserRole = isFirst ? 'admin' : 'user';

  const name = `${first_name} ${last_name}`.trim();
  const result = await c.env.DB.prepare(
    'INSERT INTO app_users (mocha_user_id, email, name, role, is_active) VALUES (?, ?, ?, ?, 1)'
  )
    .bind('local-' + Date.now(), email, name, role)
    .run();
  const userId = result.meta.last_row_id;

  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const password_hash = await hashPassword(password, salt);
  await c.env.DB.prepare(
    'INSERT INTO auth_credentials (user_id, email, password_hash, salt) VALUES (?, ?, ?, ?)'
  )
    .bind(userId, email, password_hash, salt)
    .run();

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await c.env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, expiresAt)
    .run();

  setCookie(c, LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: true,
    maxAge: 30 * 24 * 60 * 60,
  });

  const appUser = await c.env.DB.prepare('SELECT * FROM app_users WHERE id = ?')
    .bind(userId)
    .first();
  return c.json({ app_user: appUser });
});

app.post('/api/auth/login', async (c) => {
  await ensureAuthSchema(c);
  const body = await c.req.json();
  const { email, password } = body || {};
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

  const cred = await c.env.DB.prepare('SELECT * FROM auth_credentials WHERE email = ?')
    .bind(email)
    .first();
  if (!cred) return c.json({ error: 'Invalid credentials' }, 401);
  const hash = await hashPassword(password, cred.salt);
  if (hash !== cred.password_hash) return c.json({ error: 'Invalid credentials' }, 401);

  const appUser = await c.env.DB.prepare('SELECT * FROM app_users WHERE id = ?')
    .bind(cred.user_id)
    .first();
  if (!appUser) return c.json({ error: 'User not found' }, 404);

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await c.env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, cred.user_id, expiresAt)
    .run();

  setCookie(c, LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: true,
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.json({ app_user: appUser });
});

app.get('/api/users/me', localAuth(), async (c) => {
  const currentUser = c.get('user');
  await c.env.DB.prepare('UPDATE app_users SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(currentUser.id)
    .run();
  return c.json({ app_user: currentUser });
});

app.get('/api/logout', async (c) => {
  const token = getCookie(c, LOCAL_SESSION_COOKIE);
  if (token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }
  setCookie(c, LOCAL_SESSION_COOKIE, '', { httpOnly: true, path: '/', sameSite: 'lax', secure: true, maxAge: 0 });
  return c.json({ success: true });
});

// User management endpoints (admin only)
app.get('/api/users', localAuth(), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: 'Access denied' }, 403);
  }

  const users = await c.env.DB.prepare('SELECT * FROM app_users ORDER BY created_at DESC').all();
  return c.json({ users: users.results });
});

app.post('/api/users', localAuth(), zValidator('json', CreateUserSchema), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: 'Access denied' }, 403);
  }

  const { email, name, role } = c.req.valid('json');

  if (role === 'manager') {
    const managerCount = await c.env.DB.prepare("SELECT COUNT(*) as count FROM app_users WHERE role = 'manager'").first();
    if (managerCount && (managerCount.count as number) >= 1) {
      return c.json({ error: 'Manager limit reached (max 1)' }, 400);
    }
  }

  if (role === 'scrapper') {
    const scrapperCount = await c.env.DB.prepare("SELECT COUNT(*) as count FROM app_users WHERE role = 'scrapper'").first();
    if (scrapperCount && (scrapperCount.count as number) >= 3) {
      return c.json({ error: 'Scrapper limit reached (max 3)' }, 400);
    }
  }

  if (role === 'admin') {
    return c.json({ error: 'Cannot create admin users' }, 400);
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO app_users (mocha_user_id, email, name, role) VALUES (?, ?, ?, ?)'
  )
    .bind('pending-' + Date.now(), email, name || null, role)
    .run();

  const newUser = await c.env.DB.prepare('SELECT * FROM app_users WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return c.json({ user: newUser });
});

// Update user endpoint (admin only)
app.put('/api/users/:id', localAuth(), zValidator('json', UpdateUserSchema), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: 'Access denied' }, 403);
  }

  const userId = parseInt(c.req.param('id'));
  const updates = c.req.valid('json');

  if (userId === currentUser.id) {
    return c.json({ error: 'Cannot modify your own account' }, 400);
  }

  const updateFields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    updateFields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.role !== undefined) {
    updateFields.push('role = ?');
    values.push(updates.role);
  }
  if (updates.is_active !== undefined) {
    updateFields.push('is_active = ?');
    values.push(updates.is_active ? 1 : 0);
  }

  if (updateFields.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  await c.env.DB.prepare(`
    UPDATE app_users 
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `)
    .bind(...values)
    .run();

  const updatedUser = await c.env.DB.prepare('SELECT * FROM app_users WHERE id = ?')
    .bind(userId)
    .first();

  return c.json({ user: updatedUser });
});

// Delete user endpoint (admin only)
app.delete('/api/users/:id', localAuth(), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: 'Access denied' }, 403);
  }

  const userId = parseInt(c.req.param('id'));
  if (userId === currentUser.id) {
    return c.json({ error: 'Cannot delete your own account' }, 400);
  }

  const userToDelete = await c.env.DB.prepare('SELECT * FROM app_users WHERE id = ?')
    .bind(userId)
    .first();
  if (!userToDelete) {
    return c.json({ error: 'User not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM chat_messages WHERE sender_id = ?').bind(userId).run();
  await c.env.DB.prepare('DELETE FROM scrapper_data WHERE scrapper_id = ?').bind(userId).run();
  await c.env.DB.prepare('DELETE FROM scrapper_settings WHERE scrapper_id = ?').bind(userId).run();
  await c.env.DB.prepare('DELETE FROM distribution_logs WHERE scrapper_id = ? OR recipient_id = ?').bind(userId, userId).run();

  await c.env.DB.prepare('DELETE FROM app_users WHERE id = ?').bind(userId).run();

  return c.json({ success: true });
});

// Chat endpoints
app.get('/api/chat/messages', localAuth(), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  const messages = await c.env.DB.prepare(`
    SELECT 
      cm.*,
      au.name as sender_name,
      au.email as sender_email,
      au.role as sender_role
    FROM chat_messages cm
    JOIN app_users au ON cm.sender_id = au.id
    ORDER BY cm.created_at ASC
    LIMIT 100
  `).all();

  const formattedMessages = messages.results.map((msg: any) => ({
    id: msg.id,
    sender_id: msg.sender_id,
    message: msg.message,
    created_at: msg.created_at,
    updated_at: msg.updated_at,
    sender: {
      name: msg.sender_name,
      email: msg.sender_email,
      role: msg.sender_role,
    },
  }));

  return c.json({ messages: formattedMessages });
});

app.post('/api/chat/messages', localAuth(), zValidator('json', SendMessageSchema), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  const { message } = c.req.valid('json');

  const result = await c.env.DB.prepare(
    'INSERT INTO chat_messages (sender_id, message) VALUES (?, ?)'
  )
    .bind(currentUser.id, message)
    .run();

  const newMessage = await c.env.DB.prepare(`
    SELECT 
      cm.*,
      au.name as sender_name,
      au.email as sender_email,
      au.role as sender_role
    FROM chat_messages cm
    JOIN app_users au ON cm.sender_id = au.id
    WHERE cm.id = ?
  `)
    .bind(result.meta.last_row_id)
    .first();

  if (!newMessage) {
    return c.json({ error: 'Failed to retrieve message' }, 500);
  }

  return c.json({
    message: {
      id: newMessage.id,
      sender_id: newMessage.sender_id,
      message: newMessage.message,
      created_at: newMessage.created_at,
      updated_at: newMessage.updated_at,
      sender: {
        name: newMessage.sender_name,
        email: newMessage.sender_email,
        role: newMessage.sender_role,
      },
    },
  });
});

// Scrapper data endpoints
app.get('/api/scrapper/data', localAuth(), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser || currentUser.role !== 'scrapper') {
    return c.json({ error: 'Access denied' }, 403);
  }

  const data = await c.env.DB.prepare(
    'SELECT * FROM scrapper_data WHERE scrapper_id = ? AND is_processed = 0 ORDER BY created_at ASC'
  )
    .bind(currentUser.id)
    .all();

  return c.json({ data: data.results });
});

app.post('/api/scrapper/data', localAuth(), zValidator('json', AddScrapperDataSchema), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser || currentUser.role !== 'scrapper') {
    return c.json({ error: 'Access denied' }, 403);
  }

  const { data_lines } = c.req.valid('json');
  const uniqueLines = [...new Set(data_lines)].sort();

  const insertPromises = uniqueLines.map((line) =>
    c.env.DB.prepare('INSERT INTO scrapper_data (scrapper_id, data_line) VALUES (?, ?)')
      .bind(currentUser.id, line)
      .run()
  );
  await Promise.all(insertPromises);

  return c.json({ success: true, added_count: uniqueLines.length });
});

// Scrapper settings endpoints
app.get('/api/scrapper/settings', localAuth(), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser || currentUser.role !== 'scrapper') {
    return c.json({ error: 'Access denied' }, 403);
  }

  let settings = await c.env.DB.prepare('SELECT * FROM scrapper_settings WHERE scrapper_id = ?')
    .bind(currentUser.id)
    .first();

  if (!settings) {
    const result = await c.env.DB.prepare(
      'INSERT INTO scrapper_settings (scrapper_id, lines_per_user, selected_users, timer_interval, is_active) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(currentUser.id, 1, '[]', 180, 0)
      .run();

    settings = await c.env.DB.prepare('SELECT * FROM scrapper_settings WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();
  }

  return c.json({ settings });
});

app.put('/api/scrapper/settings', localAuth(), zValidator('json', UpdateScrapperSettingsSchema), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser || currentUser.role !== 'scrapper') {
    return c.json({ error: 'Access denied' }, 403);
  }

  const { lines_per_user, selected_users, timer_interval, is_active } = c.req.valid('json');

  await c.env.DB.prepare(
    'UPDATE scrapper_settings SET lines_per_user = ?, selected_users = ?, timer_interval = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE scrapper_id = ?'
  )
    .bind(lines_per_user, JSON.stringify(selected_users), timer_interval, is_active ? 1 : 0, currentUser.id)
    .run();

  const settings = await c.env.DB.prepare('SELECT * FROM scrapper_settings WHERE scrapper_id = ?')
    .bind(currentUser.id)
    .first();

  return c.json({ settings });
});

// Sales endpoints
app.get('/api/sales', localAuth(), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  const currentMonthYear = new Date().toISOString().slice(0, 7);

  const salesQuery = await c.env.DB.prepare(`
    SELECT 
      au.id as user_id,
      au.name as user_name,
      au.email as user_email,
      au.role as user_role,
      COALESCE(sd.today_sales, 0) as today_sales,
      COALESCE(sd.total_sales, 0) as total_sales,
      COALESCE(sd.silver_sales, 0) as silver_sales,
      COALESCE(sd.gold_sales, 0) as gold_sales,
      COALESCE(sd.platinum_sales, 0) as platinum_sales,
      COALESCE(sd.diamond_sales, 0) as diamond_sales,
      COALESCE(sd.ruby_sales, 0) as ruby_sales,
      COALESCE(sd.sapphire_sales, 0) as sapphire_sales,
      sd.updated_at
    FROM app_users au
    LEFT JOIN sales_data sd ON au.id = sd.user_id AND sd.month_year = ?
    ORDER BY au.name, au.email
  `)
    .bind(currentMonthYear)
    .all();

  return c.json({ sales: salesQuery.results });
});

app.put('/api/sales', localAuth(), zValidator('json', UpdateSalesSchema), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: 'Access denied - admin only' }, 403);
  }

  const {
    user_id,
    today_sales,
    total_sales,
    silver_sales,
    gold_sales,
    platinum_sales,
    diamond_sales,
    ruby_sales,
    sapphire_sales,
  } = c.req.valid('json');

  if (!user_id) {
    return c.json({ error: 'Missing user_id' }, 400);
  }

  const currentMonthYear = new Date().toISOString().slice(0, 7);

  const existing = await c.env.DB.prepare('SELECT id FROM sales_data WHERE user_id = ? AND month_year = ?')
    .bind(user_id, currentMonthYear)
    .first();

  if (existing) {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (today_sales !== undefined) { updateFields.push('today_sales = ?'); values.push(today_sales); }
    if (total_sales !== undefined) { updateFields.push('total_sales = ?'); values.push(total_sales); }
    if (silver_sales !== undefined) { updateFields.push('silver_sales = ?'); values.push(silver_sales); }
    if (gold_sales !== undefined) { updateFields.push('gold_sales = ?'); values.push(gold_sales); }
    if (platinum_sales !== undefined) { updateFields.push('platinum_sales = ?'); values.push(platinum_sales); }
    if (diamond_sales !== undefined) { updateFields.push('diamond_sales = ?'); values.push(diamond_sales); }
    if (ruby_sales !== undefined) { updateFields.push('ruby_sales = ?'); values.push(ruby_sales); }
    if (sapphire_sales !== undefined) { updateFields.push('sapphire_sales = ?'); values.push(sapphire_sales); }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(user_id, currentMonthYear);

    await c.env.DB.prepare(`
      UPDATE sales_data 
      SET ${updateFields.join(', ')}
      WHERE user_id = ? AND month_year = ?
    `)
      .bind(...values)
      .run();
  } else {
    await c.env.DB.prepare(`
      INSERT INTO sales_data (
        user_id, today_sales, total_sales, silver_sales, gold_sales, 
        platinum_sales, diamond_sales, ruby_sales, sapphire_sales, month_year
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        user_id,
        today_sales || 0,
        total_sales || 0,
        silver_sales || 0,
        gold_sales || 0,
        platinum_sales || 0,
        diamond_sales || 0,
        ruby_sales || 0,
        sapphire_sales || 0,
        currentMonthYear
      )
      .run();
  }

  return c.json({ success: true });
});

app.post('/api/sales/reset', localAuth(), async (c) => {
  const currentUser = c.get('user');
  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: 'Access denied - admin only' }, 403);
  }

  const currentMonthYear = new Date().toISOString().slice(0, 7);
  await c.env.DB.prepare(
    'UPDATE sales_data SET total_sales = 0, silver_sales = 0, gold_sales = 0, platinum_sales = 0, diamond_sales = 0, ruby_sales = 0, sapphire_sales = 0, updated_at = CURRENT_TIMESTAMP WHERE month_year = ?'
  )
    .bind(currentMonthYear)
    .run();

  return c.json({ success: true });
});

export default app;
