import { pgTable, text, serial, integer, boolean, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const reminderTypeEnum = pgEnum('reminder_type', ['general', 'visa', 'bill', 'task']);
export const visaTypeEnum = pgEnum('visa_type', ['work', 'tourist', 'student', 'business', 'other']);
export const planTypeEnum = pgEnum('plan_type', ['free', 'pro']);
export const notificationTypeEnum = pgEnum('notification_type', ['email', 'push', 'sms']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  planType: planTypeEnum("plan_type").notNull().default('free'),
  reminderLimit: integer("reminder_limit").notNull().default(10),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reminders table
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  reminderType: reminderTypeEnum("reminder_type").notNull().default('general'),
  reminderDate: timestamp("reminder_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Visa reminders table
export const visaReminders = pgTable("visa_reminders", {
  id: serial("id").primaryKey(),
  reminderId: integer("reminder_id").notNull().references(() => reminders.id),
  visaType: visaTypeEnum("visa_type").notNull(),
  country: text("country").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  notes: text("notes"),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  reminderId: integer("reminder_id").notNull().references(() => reminders.id),
  notificationType: notificationTypeEnum("notification_type").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: real("amount").notNull(),
  planType: planTypeEnum("plan_type").notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  stripePaymentId: text("stripe_payment_id"),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  reminderLimit: true,
  isAdmin: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
});

export const insertVisaReminderSchema = createInsertSchema(visaReminders).omit({
  id: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  paymentDate: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type VisaReminder = typeof visaReminders.$inferSelect;
export type InsertVisaReminder = z.infer<typeof insertVisaReminderSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Extended schemas for frontend usage
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginData = z.infer<typeof loginSchema>;

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
