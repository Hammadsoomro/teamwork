import { Hono } from "hono";
import { cors } from "hono/cors";
import { 
  getOAuthRedirectUrl, 
  exchangeCodeForSessionToken, 
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME 
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { 
  CreateUserSchema,
  UpdateUserSchema,
  SendMessageSchema,
  AddScrapperDataSchema,
  UpdateScrapperSettingsSchema,
  UpdateSalesSchema,
  UserRole
} from "@/shared/types";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// Auth middleware configured for this app
app.use('/api/users/me', authMiddleware);
app.use('/api/users', authMiddleware);
app.use('/api/chat/*', authMiddleware);
app.use('/api/scrapper/*', authMiddleware);
app.use('/api/sales/*', authMiddleware);
app.use('/api/sales', authMiddleware);

// CORS middleware
app.use("/*", cors({
  origin: "*",
  credentials: true,
}));

// OAuth endpoints
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl });
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true });
});

app.get("/api/users/me", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  // Get or create app user
  let appUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    // Check if this is the first user (admin)
    const userCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM app_users"
    ).first();

    const role: UserRole = userCount && (userCount.count as number) === 0 ? 'admin' : 'user';

    // Create new app user
    const result = await c.env.DB.prepare(`
      INSERT INTO app_users (mocha_user_id, email, name, role) 
      VALUES (?, ?, ?, ?)
    `).bind(
      mochaUser.id, 
      mochaUser.email, 
      mochaUser.google_user_data.name || null,
      role
    ).run();

    appUser = await c.env.DB.prepare(
      "SELECT * FROM app_users WHERE id = ?"
    ).bind(result.meta.last_row_id).first();
  }

  if (!appUser) {
    return c.json({ error: "Failed to create user profile" }, 500);
  }

  // Update last activity
  await c.env.DB.prepare(
    "UPDATE app_users SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(appUser.id).run();

  return c.json({
    mocha_user: mochaUser,
    app_user: appUser
  });
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true });
});

// User management endpoints (admin only)
app.get('/api/users', authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: "Access denied" }, 403);
  }

  const users = await c.env.DB.prepare(
    "SELECT * FROM app_users ORDER BY created_at DESC"
  ).all();

  return c.json({ users: users.results });
});

app.post('/api/users', authMiddleware, zValidator('json', CreateUserSchema), async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: "Access denied" }, 403);
  }

  const { email, name, role } = c.req.valid('json');

  // Check role limits
  if (role === 'manager') {
    const managerCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM app_users WHERE role = 'manager'"
    ).first();
    if (managerCount && (managerCount.count as number) >= 1) {
      return c.json({ error: "Manager limit reached (max 1)" }, 400);
    }
  }

  if (role === 'scrapper') {
    const scrapperCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM app_users WHERE role = 'scrapper'"
    ).first();
    if (scrapperCount && (scrapperCount.count as number) >= 3) {
      return c.json({ error: "Scrapper limit reached (max 3)" }, 400);
    }
  }

  if (role === 'admin') {
    return c.json({ error: "Cannot create admin users" }, 400);
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO app_users (mocha_user_id, email, name, role) 
    VALUES (?, ?, ?, ?)
  `).bind('pending-' + Date.now(), email, name || null, role).run();

  const newUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE id = ?"
  ).bind(result.meta.last_row_id).first();

  return c.json({ user: newUser });
});

// Update user endpoint (admin only)
app.put('/api/users/:id', authMiddleware, zValidator('json', UpdateUserSchema), async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: "Access denied" }, 403);
  }

  const userId = parseInt(c.req.param('id'));
  const updates = c.req.valid('json');

  // Prevent admin from modifying themselves
  if (userId === currentUser.id) {
    return c.json({ error: "Cannot modify your own account" }, 400);
  }

  const updateFields = [];
  const values = [];

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
    return c.json({ error: "No fields to update" }, 400);
  }

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  await c.env.DB.prepare(`
    UPDATE app_users 
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `).bind(...values).run();

  const updatedUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE id = ?"
  ).bind(userId).first();

  return c.json({ user: updatedUser });
});

// Delete user endpoint (admin only)
app.delete('/api/users/:id', authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: "Access denied" }, 403);
  }

  const userId = parseInt(c.req.param('id'));

  // Prevent admin from deleting themselves
  if (userId === currentUser.id) {
    return c.json({ error: "Cannot delete your own account" }, 400);
  }

  // Check if user exists
  const userToDelete = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE id = ?"
  ).bind(userId).first();

  if (!userToDelete) {
    return c.json({ error: "User not found" }, 404);
  }

  // Delete related data first
  await c.env.DB.prepare("DELETE FROM chat_messages WHERE sender_id = ?").bind(userId).run();
  await c.env.DB.prepare("DELETE FROM scrapper_data WHERE scrapper_id = ?").bind(userId).run();
  await c.env.DB.prepare("DELETE FROM scrapper_settings WHERE scrapper_id = ?").bind(userId).run();
  await c.env.DB.prepare("DELETE FROM distribution_logs WHERE scrapper_id = ? OR recipient_id = ?").bind(userId, userId).run();

  // Delete the user
  await c.env.DB.prepare("DELETE FROM app_users WHERE id = ?").bind(userId).run();

  return c.json({ success: true });
});

// Chat endpoints
app.get('/api/chat/messages', authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser) {
    return c.json({ error: "User not found" }, 404);
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

  const formattedMessages = messages.results.map(msg => ({
    id: msg.id,
    sender_id: msg.sender_id,
    message: msg.message,
    created_at: msg.created_at,
    updated_at: msg.updated_at,
    sender: {
      name: msg.sender_name,
      email: msg.sender_email,
      role: msg.sender_role
    }
  }));

  return c.json({ messages: formattedMessages });
});

app.post('/api/chat/messages', authMiddleware, zValidator('json', SendMessageSchema), async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const { message } = c.req.valid('json');

  const result = await c.env.DB.prepare(`
    INSERT INTO chat_messages (sender_id, message) 
    VALUES (?, ?)
  `).bind(currentUser.id, message).run();

  const newMessage = await c.env.DB.prepare(`
    SELECT 
      cm.*,
      au.name as sender_name,
      au.email as sender_email,
      au.role as sender_role
    FROM chat_messages cm
    JOIN app_users au ON cm.sender_id = au.id
    WHERE cm.id = ?
  `).bind(result.meta.last_row_id).first();

  if (!newMessage) {
    return c.json({ error: "Failed to retrieve message" }, 500);
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
        role: newMessage.sender_role
      }
    }
  });
});

// Scrapper data endpoints
app.get('/api/scrapper/data', authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser || currentUser.role !== 'scrapper') {
    return c.json({ error: "Access denied" }, 403);
  }

  const data = await c.env.DB.prepare(
    "SELECT * FROM scrapper_data WHERE scrapper_id = ? AND is_processed = 0 ORDER BY created_at ASC"
  ).bind(currentUser.id).all();

  return c.json({ data: data.results });
});

app.post('/api/scrapper/data', authMiddleware, zValidator('json', AddScrapperDataSchema), async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser || currentUser.role !== 'scrapper') {
    return c.json({ error: "Access denied" }, 403);
  }

  const { data_lines } = c.req.valid('json');

  // Remove duplicates and sort
  const uniqueLines = [...new Set(data_lines)].sort();

  // Insert each line
  const insertPromises = uniqueLines.map(line => 
    c.env.DB.prepare(
      "INSERT INTO scrapper_data (scrapper_id, data_line) VALUES (?, ?)"
    ).bind(currentUser.id, line).run()
  );

  await Promise.all(insertPromises);

  return c.json({ success: true, added_count: uniqueLines.length });
});

// Scrapper settings endpoints
app.get('/api/scrapper/settings', authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser || currentUser.role !== 'scrapper') {
    return c.json({ error: "Access denied" }, 403);
  }

  let settings = await c.env.DB.prepare(
    "SELECT * FROM scrapper_settings WHERE scrapper_id = ?"
  ).bind(currentUser.id).first();

  if (!settings) {
    // Create default settings
    const result = await c.env.DB.prepare(`
      INSERT INTO scrapper_settings (scrapper_id, lines_per_user, selected_users, timer_interval, is_active) 
      VALUES (?, ?, ?, ?, ?)
    `).bind(currentUser.id, 1, '[]', 180, 0).run();

    settings = await c.env.DB.prepare(
      "SELECT * FROM scrapper_settings WHERE id = ?"
    ).bind(result.meta.last_row_id).first();
  }

  return c.json({ settings });
});

app.put('/api/scrapper/settings', authMiddleware, zValidator('json', UpdateScrapperSettingsSchema), async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser || currentUser.role !== 'scrapper') {
    return c.json({ error: "Access denied" }, 403);
  }

  const { lines_per_user, selected_users, timer_interval, is_active } = c.req.valid('json');

  await c.env.DB.prepare(`
    UPDATE scrapper_settings 
    SET lines_per_user = ?, selected_users = ?, timer_interval = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE scrapper_id = ?
  `).bind(lines_per_user, JSON.stringify(selected_users), timer_interval, is_active ? 1 : 0, currentUser.id).run();

  const settings = await c.env.DB.prepare(
    "SELECT * FROM scrapper_settings WHERE scrapper_id = ?"
  ).bind(currentUser.id).first();

  return c.json({ settings });
});

// Sales endpoints
app.get('/api/sales', authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const currentMonthYear = new Date().toISOString().slice(0, 7);

  // Get all users and their sales data for current month
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
  `).bind(currentMonthYear).all();

  return c.json({ sales: salesQuery.results });
});

app.put('/api/sales', authMiddleware, zValidator('json', UpdateSalesSchema), async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: "Access denied - admin only" }, 403);
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
    sapphire_sales
  } = c.req.valid('json');

  if (!user_id) {
    return c.json({ error: "Missing user_id" }, 400);
  }

  const currentMonthYear = new Date().toISOString().slice(0, 7);

  // Check if record exists for this user and month
  const existing = await c.env.DB.prepare(
    "SELECT id FROM sales_data WHERE user_id = ? AND month_year = ?"
  ).bind(user_id, currentMonthYear).first();

  if (existing) {
    // Update existing record
    const updateFields = [];
    const values = [];
    
    if (today_sales !== undefined) {
      updateFields.push('today_sales = ?');
      values.push(today_sales);
    }
    if (total_sales !== undefined) {
      updateFields.push('total_sales = ?');
      values.push(total_sales);
    }
    if (silver_sales !== undefined) {
      updateFields.push('silver_sales = ?');
      values.push(silver_sales);
    }
    if (gold_sales !== undefined) {
      updateFields.push('gold_sales = ?');
      values.push(gold_sales);
    }
    if (platinum_sales !== undefined) {
      updateFields.push('platinum_sales = ?');
      values.push(platinum_sales);
    }
    if (diamond_sales !== undefined) {
      updateFields.push('diamond_sales = ?');
      values.push(diamond_sales);
    }
    if (ruby_sales !== undefined) {
      updateFields.push('ruby_sales = ?');
      values.push(ruby_sales);
    }
    if (sapphire_sales !== undefined) {
      updateFields.push('sapphire_sales = ?');
      values.push(sapphire_sales);
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(user_id, currentMonthYear);

    await c.env.DB.prepare(`
      UPDATE sales_data 
      SET ${updateFields.join(', ')}
      WHERE user_id = ? AND month_year = ?
    `).bind(...values).run();
  } else {
    // Create new record
    await c.env.DB.prepare(`
      INSERT INTO sales_data (
        user_id, today_sales, total_sales, silver_sales, gold_sales, 
        platinum_sales, diamond_sales, ruby_sales, sapphire_sales, month_year
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
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
    ).run();
  }

  return c.json({ success: true });
});

app.post('/api/sales/reset', authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const currentUser = await c.env.DB.prepare(
    "SELECT * FROM app_users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: "Access denied - admin only" }, 403);
  }

  const currentMonthYear = new Date().toISOString().slice(0, 7);

  // Reset all sales data to 0 for current month
  await c.env.DB.prepare(`
    UPDATE sales_data 
    SET total_sales = 0, silver_sales = 0, gold_sales = 0, platinum_sales = 0, 
        diamond_sales = 0, ruby_sales = 0, sapphire_sales = 0, updated_at = CURRENT_TIMESTAMP
    WHERE month_year = ?
  `).bind(currentMonthYear).run();

  return c.json({ success: true });
});

export default app;
