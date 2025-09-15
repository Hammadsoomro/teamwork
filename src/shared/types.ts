import z from "zod";

// User role schema
export const UserRoleSchema = z.enum(['admin', 'manager', 'scrapper', 'user']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// App user schema
export const AppUserSchema = z.object({
  id: z.number(),
  mocha_user_id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: UserRoleSchema,
  is_active: z.boolean(),
  daily_numbers_sent: z.number(),
  total_numbers_sent: z.number(),
  last_activity_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AppUser = z.infer<typeof AppUserSchema>;

// Chat message schema
export const ChatMessageSchema = z.object({
  id: z.number(),
  sender_id: z.number(),
  message: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  sender: z.object({
    name: z.string().nullable(),
    email: z.string(),
    role: UserRoleSchema,
  }).optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Scrapper data schema
export const ScrapperDataSchema = z.object({
  id: z.number(),
  scrapper_id: z.number(),
  data_line: z.string(),
  is_processed: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ScrapperData = z.infer<typeof ScrapperDataSchema>;

// Sales data schema with individual sales types
export const SalesDataSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  today_sales: z.number(),
  total_sales: z.number(),
  silver_sales: z.number(),
  gold_sales: z.number(),
  platinum_sales: z.number(),
  diamond_sales: z.number(),
  ruby_sales: z.number(),
  sapphire_sales: z.number(),
  month_year: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SalesData = z.infer<typeof SalesDataSchema>;

// Scrapper settings schema
export const ScrapperSettingsSchema = z.object({
  id: z.number(),
  scrapper_id: z.number(),
  lines_per_user: z.number(),
  selected_users: z.string().nullable(), // JSON string
  timer_interval: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ScrapperSettings = z.infer<typeof ScrapperSettingsSchema>;

// Distribution log schema
export const DistributionLogSchema = z.object({
  id: z.number(),
  scrapper_id: z.number(),
  recipient_id: z.number(),
  data_lines: z.string(), // JSON string
  distributed_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DistributionLog = z.infer<typeof DistributionLogSchema>;

// API request schemas
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: UserRoleSchema,
  password: z.string().min(6),
});

export const UpdateUserSchema = z.object({
  name: z.string().optional(),
  role: UserRoleSchema.optional(),
  is_active: z.boolean().optional(),
});

export const SendMessageSchema = z.object({
  message: z.string().min(1).max(1000),
});

export const AddScrapperDataSchema = z.object({
  data_lines: z.array(z.string()),
});

export const UpdateScrapperSettingsSchema = z.object({
  lines_per_user: z.number().min(1).max(100),
  selected_users: z.array(z.number()),
  timer_interval: z.number().min(60).max(3600), // 1 minute to 1 hour
  is_active: z.boolean(),
});

export const UpdateSalesSchema = z.object({
  user_id: z.number(),
  today_sales: z.number().optional(),
  total_sales: z.number().optional(),
  silver_sales: z.number().optional(),
  gold_sales: z.number().optional(),
  platinum_sales: z.number().optional(),
  diamond_sales: z.number().optional(),
  ruby_sales: z.number().optional(),
  sapphire_sales: z.number().optional(),
});
