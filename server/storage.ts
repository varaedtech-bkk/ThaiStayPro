import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import memorystore from "memorystore";
import session from "express-session";
import connectPg from "connect-pg-simple";
import {
  users, User, InsertUser,
  reminders, Reminder, InsertReminder,
  visaReminders, InsertVisaReminder,
  notifications, Notification, InsertNotification,
  payments, Payment, InsertPayment
} from "@shared/schema";
import { eq, and, desc, lt, gte, sql, inArray } from "drizzle-orm"; // Added inArray

dotenv.config();
// Create memory store for sessions

// 1. Database Configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'sunny',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'neondb',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
};

// 2. Create Pool and Drizzle Instance
export const pool = new Pool(dbConfig);
export const db = drizzle(pool, { schema });

// 3. Verify Connection Immediately
(async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT current_database()');
    console.log(`✅ Connected to database: ${res.rows[0].current_database}`);
    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
})();
// 4. Session Store Configuration
const PostgresSessionStore = connectPg(session);
const sessionStore = new PostgresSessionStore({
  pool,
  createTableIfMissing: true,
  pruneSessionInterval: 60
});
const MemoryStore = memorystore(session);

// Properly typed VisaReminder interface matching schema
interface VisaReminder {
  id: number;
  reminderId: number;
  visaType: 'work' | 'tourist' | 'student' | 'business' | 'other';
  country: string;
  expiryDate: Date;
  notes: string | null;
}

interface ReminderWithVisa extends Reminder {
  visaData?: VisaReminder;
}
// Storage interface
export interface IStorage {
  // Session store
  sessionStore: session.Store;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  updateStripeCustomerId(
    userId: number,
    customerId: string
  ): Promise<User | undefined>;
  updateUserStripeInfo(
    userId: number,
    stripeInfo: { stripeCustomerId: string; stripeSubscriptionId: string }
  ): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getProUsers(): Promise<User[]>;
  getFreeUsers(): Promise<User[]>;

  // Reminder methods
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  getReminderById(id: number): Promise<Reminder | undefined>;
  getRemindersByUserId(userId: number): Promise<Reminder[]>;
  getRemindersByType(userId: number, type: string): Promise<Reminder[]>;
  updateReminder(
    id: number,
    updates: Partial<Reminder>
  ): Promise<Reminder | undefined>;
  deleteReminder(id: number): Promise<boolean>;
  countRemindersByUserId(userId: number): Promise<number>;
  getAllReminders(): Promise<Reminder[]>;

  // Visa reminder methods
  createVisaReminder(visaReminder: InsertVisaReminder): Promise<VisaReminder>;
  getVisaReminderByReminderId(
    reminderId: number
  ): Promise<VisaReminder | undefined>;
  updateVisaReminder(
    id: number,
    updates: Partial<VisaReminder>
  ): Promise<VisaReminder | undefined>;
  getVisaRemindersByUserId(
    userId: number
  ): Promise<{ reminder: Reminder; visaReminder: VisaReminder }[]>;
  countVisaRemindersByType(): Promise<{ visaType: string; count: number }[]>;
  getUpcomingExpirations(days: number): Promise<number>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByReminderId(reminderId: number): Promise<Notification[]>;
  updateNotification(
    id: number,
    updates: Partial<Notification>
  ): Promise<Notification | undefined>;

  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByUserId(userId: number): Promise<Payment[]>;
  updatePayment(
    id: number,
    updates: Partial<Payment>
  ): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>;
  getMonthlyRevenue(): Promise<number>;
  getNewSubscriptions(): Promise<number>;
  getRenewals(): Promise<number>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private usersStore: Map<number, User>;
  private remindersStore: Map<number, Reminder>;
  private visaRemindersStore: Map<number, VisaReminder>;
  private notificationsStore: Map<number, Notification>;
  private paymentsStore: Map<number, Payment>;
  sessionStore: session.Store;

  private userIdCounter: number;
  private reminderIdCounter: number;
  private visaReminderIdCounter: number;
  private notificationIdCounter: number;
  private paymentIdCounter: number;

  constructor() {
    this.usersStore = new Map();
    this.remindersStore = new Map();
    this.visaRemindersStore = new Map();
    this.notificationsStore = new Map();
    this.paymentsStore = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });

    this.userIdCounter = 1;
    this.reminderIdCounter = 1;
    this.visaReminderIdCounter = 1;
    this.notificationIdCounter = 1;
    this.paymentIdCounter = 1;

    // Create admin user
    this.createUser({
      username: "admin",
      email: "admin@reminderpro.com",
      password: "$2b$10$WYUyXXvtxbZ/Wk5UUqpV2e.KQGKWgw1jlkBiPL5cSJHbkktUFY56q", // 'password'
      fullName: "Admin User",
      planType: "pro",
    }).then((user) => {
      this.updateUser(user.id, { isAdmin: true });
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersStore.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersStore.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersStore.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = {
      id,
      ...userData,
      planType: userData.planType || "free",
      reminderLimit: userData.planType === "pro" ? 100 : 10,
      isAdmin: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: now,
    };
    this.usersStore.set(id, user);
    return user;
  }

  async updateUser(
    id: number,
    updates: Partial<User>
  ): Promise<User | undefined> {
    const user = this.usersStore.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.usersStore.set(id, updatedUser);
    return updatedUser;
  }

  async updateStripeCustomerId(
    userId: number,
    customerId: string
  ): Promise<User | undefined> {
    return this.updateUser(userId, { stripeCustomerId: customerId });
  }

  async updateUserStripeInfo(
    userId: number,
    stripeInfo: { stripeCustomerId: string; stripeSubscriptionId: string }
  ): Promise<User | undefined> {
    return this.updateUser(userId, {
      stripeCustomerId: stripeInfo.stripeCustomerId,
      stripeSubscriptionId: stripeInfo.stripeSubscriptionId,
      planType: "pro",
      reminderLimit: 100,
    });
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.usersStore.values());
  }

  async getProUsers(): Promise<User[]> {
    return Array.from(this.usersStore.values()).filter(
      (user) => user.planType === "pro"
    );
  }
  

  async getFreeUsers(): Promise<User[]> {
    return Array.from(this.usersStore.values()).filter(
      (user) => user.planType === "free"
    );
  }

  // Reminder methods
  async createReminder(reminderData: InsertReminder & { visaData?: InsertVisaReminder }): Promise<Reminder> {
    return db.transaction(async (tx) => {
      const [reminder] = await tx
        .insert(reminders)
        .values(reminderData)
        .returning();
  
      if (reminderData.reminderType === 'visa' && reminderData.visaData) {
        await tx
          .insert(visaReminders)
          .values({
            ...reminderData.visaData,
            reminderId: reminder.id
          });
      }
  
      return reminder;
    });
  }
  async getReminderById(id: number): Promise<Reminder | undefined> {
    return this.remindersStore.get(id);
  }

  async getRemindersByUserId(userId: number): Promise<Reminder[]> {
    return Array.from(this.remindersStore.values()).filter(
      (reminder) => reminder.userId === userId
    );
  }

  async getRemindersByType(userId: number, type: string): Promise<Reminder[]> {
    return Array.from(this.remindersStore.values()).filter(
      (reminder) => reminder.userId === userId && reminder.reminderType === type
    );
  }

  // Fixed updateReminder with proper transaction handling
  async updateReminder(
    id: number,
    updates: Partial<Reminder & { visaData?: Partial<VisaReminder> }>
  ): Promise<ReminderWithVisa | undefined> {
    return db.transaction(async (tx) => {
      // Update base reminder
      const [updatedReminder] = await tx
        .update(reminders)
        .set({
          title: updates.title,
          description: updates.description,
          reminderType: updates.reminderType,
          reminderDate: updates.reminderDate
        })
        .where(eq(reminders.id, id))
        .returning();
  
      if (!updatedReminder) return undefined;
  
      // Handle visa data
      if (updates.reminderType === 'visa' && updates.visaData) {
        const existingVisa = await tx
          .select()
          .from(visaReminders)
          .where(eq(visaReminders.reminderId, id));
  
        if (existingVisa.length > 0) {
          // Update existing visa reminder
          const [visaReminder] = await tx
            .update(visaReminders)
            .set({
              visaType: updates.visaData.visaType,
              country: updates.visaData.country,
              expiryDate: updates.visaData.expiryDate,
              notes: updates.visaData.notes
            })
            .where(eq(visaReminders.reminderId, id))
            .returning();
          return { ...updatedReminder, visaData: visaReminder };
        } else {
          // Create new visa reminder
          const [visaReminder] = await tx
            .insert(visaReminders)
            .values({
              ...updates.visaData,
              reminderId: id
            })
            .returning();
          return { ...updatedReminder, visaData: visaReminder };
        }
      } else if (updatedReminder.reminderType !== 'visa') {
        // Remove visa data if changing from visa to non-visa
        await tx
          .delete(visaReminders)
          .where(eq(visaReminders.reminderId, id));
        return updatedReminder;
      }
      
      return updatedReminder;
    });
  }
  async deleteReminder(id: number): Promise<boolean> {
    // First delete associated visa reminders if they exist
    const visaReminder = await this.getVisaReminderByReminderId(id);
    if (visaReminder) {
      this.visaRemindersStore.delete(visaReminder.id);
    }

    // Delete notifications associated with the reminder
    const notifications = await this.getNotificationsByReminderId(id);
    for (const notification of notifications) {
      this.notificationsStore.delete(notification.id);
    }

    // Delete the reminder
    return this.remindersStore.delete(id);
  }

  async countRemindersByUserId(userId: number): Promise<number> {
    return (await this.getRemindersByUserId(userId)).length;
  }

  async getAllReminders(): Promise<Reminder[]> {
    return Array.from(this.remindersStore.values());
  }

  // Visa reminder methods
  async createVisaReminder(
    visaReminderData: InsertVisaReminder
  ): Promise<VisaReminder> {
    const id = this.visaReminderIdCounter++;
    const visaReminder: VisaReminder = {
      id,
      ...visaReminderData,
      notes: visaReminderData.notes || null,
    };
    this.visaRemindersStore.set(id, visaReminder);
    return visaReminder;
  }

  async getVisaReminderByReminderId(
    reminderId: number
  ): Promise<VisaReminder | undefined> {
    return Array.from(this.visaRemindersStore.values()).find(
      (visaReminder) => visaReminder.reminderId === reminderId
    );
  }

  async updateVisaReminder(
    id: number,
    updates: Partial<VisaReminder>
  ): Promise<VisaReminder | undefined> {
    const visaReminder = this.visaRemindersStore.get(id);
    if (!visaReminder) return undefined;

    const updatedVisaReminder = { ...visaReminder, ...updates };
    this.visaRemindersStore.set(id, updatedVisaReminder);
    return updatedVisaReminder;
  }

  async getVisaRemindersByUserId(
    userId: number
  ): Promise<{ reminder: Reminder; visaReminder: VisaReminder }[]> {
    const results = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          eq(reminders.reminderType, 'visa')
        )
      )
      .leftJoin(
        visaReminders,
        eq(reminders.id, visaReminders.reminderId)
      );
  
    return results
      .filter(({ visa_reminders }) => visa_reminders !== null)
      .map(({ reminders, visa_reminders }) => ({
        reminder: reminders,
        visaReminder: {
          id: visa_reminders.id,
          reminderId: visa_reminders.reminderId,
          visaType: visa_reminders.visaType,
          country: visa_reminders.country,
          expiryDate: visa_reminders.expiryDate,
          notes: visa_reminders.notes
        }
      }));
  }
  async countVisaRemindersByType(): Promise<
    { visaType: string; count: number }[]
  > {
    const visaTypes = new Map<string, number>();

    // Initialize with all visa types
    visaTypes.set("work", 0);
    visaTypes.set("tourist", 0);
    visaTypes.set("student", 0);
    visaTypes.set("business", 0);
    visaTypes.set("other", 0);

    // Count visa reminders by type
    for (const visaReminder of this.visaRemindersStore.values()) {
      const count = visaTypes.get(visaReminder.visaType) || 0;
      visaTypes.set(visaReminder.visaType, count + 1);
    }

    // Convert to array of objects
    return Array.from(visaTypes.entries()).map(([visaType, count]) => ({
      visaType,
      count,
    }));
  }

  async getUpcomingExpirations(days: number): Promise<number> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    let count = 0;
    for (const visaReminder of this.visaRemindersStore.values()) {
      const expiryDate = new Date(visaReminder.expiryDate);
      if (expiryDate >= now && expiryDate <= future) {
        count++;
      }
    }

    return count;
  }

  // Notification methods
  async createNotification(
    notificationData: InsertNotification
  ): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const notification: Notification = {
      id,
      ...notificationData,
    };
    this.notificationsStore.set(id, notification);
    return notification;
  }

  async getNotificationsByReminderId(
    reminderId: number
  ): Promise<Notification[]> {
    return Array.from(this.notificationsStore.values()).filter(
      (notification) => notification.reminderId === reminderId
    );
  }

  async updateNotification(
    id: number,
    updates: Partial<Notification>
  ): Promise<Notification | undefined> {
    const notification = this.notificationsStore.get(id);
    if (!notification) return undefined;

    const updatedNotification = { ...notification, ...updates };
    this.notificationsStore.set(id, updatedNotification);
    return updatedNotification;
  }

  // Payment methods
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const id = this.paymentIdCounter++;
    const now = new Date();
    const payment: Payment = {
      id,
      ...paymentData,
      paymentDate: paymentData.paymentDate || now,
    };
    this.paymentsStore.set(id, payment);
    return payment;
  }

  async getPaymentsByUserId(userId: number): Promise<Payment[]> {
    return Array.from(this.paymentsStore.values()).filter(
      (payment) => payment.userId === userId
    );
  }

  async updatePayment(
    id: number,
    updates: Partial<Payment>
  ): Promise<Payment | undefined> {
    const payment = this.paymentsStore.get(id);
    if (!payment) return undefined;

    const updatedPayment = { ...payment, ...updates };
    this.paymentsStore.set(id, updatedPayment);
    return updatedPayment;
  }

  async getAllPayments(): Promise<Payment[]> {
    return Array.from(this.paymentsStore.values());
  }

  async getMonthlyRevenue(): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let revenue = 0;
    for (const payment of this.paymentsStore.values()) {
      const paymentDate = new Date(payment.paymentDate);
      if (paymentDate >= monthStart && payment.isPaid) {
        revenue += payment.amount;
      }
    }

    return revenue;
  }

  async getNewSubscriptions(): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Find new pro users this month
    const newSubs = Array.from(this.paymentsStore.values()).filter(
      (payment) => {
        const paymentDate = new Date(payment.paymentDate);
        return (
          paymentDate >= monthStart &&
          payment.isPaid &&
          !this.isRenewal(payment)
        );
      }
    );

    return newSubs.length;
  }

  async getRenewals(): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Find renewal payments this month
    const renewals = Array.from(this.paymentsStore.values()).filter(
      (payment) => {
        const paymentDate = new Date(payment.paymentDate);
        return (
          paymentDate >= monthStart && payment.isPaid && this.isRenewal(payment)
        );
      }
    );

    return renewals.length;
  }

  // Helper method to determine if a payment is a renewal
  private isRenewal(payment: Payment): boolean {
    // Check if there's an earlier payment for the same user
    const earlierPayments = Array.from(this.paymentsStore.values()).filter(
      (p) =>
        p.userId === payment.userId &&
        new Date(p.paymentDate) < new Date(payment.paymentDate)
    );

    return earlierPayments.length > 0;
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = sessionStore;
    this.testConnection().catch(err => {
      console.error("❌ Database connection failed:", err);
      process.exit(1);
    });
  }

  private async testConnection() {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(
    id: number,
    updates: Partial<User>
  ): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateStripeCustomerId(
    userId: number,
    customerId: string
  ): Promise<User | undefined> {
    return this.updateUser(userId, { stripeCustomerId: customerId });
  }

  async updateUserStripeInfo(
    userId: number,
    stripeInfo: { stripeCustomerId: string; stripeSubscriptionId: string }
  ): Promise<User | undefined> {
    return this.updateUser(userId, {
      stripeCustomerId: stripeInfo.stripeCustomerId,
      stripeSubscriptionId: stripeInfo.stripeSubscriptionId,
      planType: "pro",
      reminderLimit: 100,
    });
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getProUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.planType, "pro"));
  }

  async getFreeUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.planType, "free"));
  }

  // Fixed createReminder with proper transaction handling
  async createReminder(reminderData: InsertReminder & { visaData?: InsertVisaReminder }): Promise<Reminder> {
    return db.transaction(async (tx) => {
      const [reminder] = await tx
        .insert(reminders)
        .values(reminderData)
        .returning();
  
      if (reminderData.reminderType === 'visa' && reminderData.visaData) {
        await tx
          .insert(visaReminders)
          .values({
            ...reminderData.visaData,
            reminderId: reminder.id
          });
      }
  
      return reminder;
    });
  }

// Fixed getReminderById with proper typing
async getReminderById(id: number): Promise<ReminderWithVisa | undefined> {
  const [reminder] = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, id));

  if (!reminder) return undefined;

  if (reminder.reminderType === 'visa') {
    const [visaReminder] = await db
      .select()
      .from(visaReminders)
      .where(eq(visaReminders.reminderId, id));
    
    return {
      ...reminder,
      visaData: visaReminder ? {
        id: visaReminder.id,
        reminderId: visaReminder.reminderId,
        visaType: visaReminder.visaType,
        country: visaReminder.country,
        expiryDate: visaReminder.expiryDate,
        notes: visaReminder.notes
      } : undefined
    };
  }
  
  return reminder;
}
  
  async getRemindersByUserId(userId: number): Promise<Reminder[]> {
    return db.select().from(reminders).where(eq(reminders.userId, userId));
  }

  async getRemindersByType(userId: number, type: string): Promise<Reminder[]> {
    return db
      .select()
      .from(reminders)
      .where(
        and(eq(reminders.userId, userId), eq(reminders.reminderType, type))
      );
  }


  async updateReminder(
    id: number,
    updates: Partial<Reminder & { visaData?: Partial<VisaReminder> }>
  ): Promise<(Reminder & { visaData?: VisaReminder }) | undefined> {
    return db.transaction(async (tx) => {
      // Update base reminder
      const [updatedReminder] = await tx
        .update(reminders)
        .set({
          title: updates.title,
          description: updates.description,
          reminderType: updates.reminderType,
          reminderDate: updates.reminderDate
        })
        .where(eq(reminders.id, id))
        .returning();
  
      if (!updatedReminder) return undefined;
  
      // Handle visa data
      if (updates.reminderType === 'visa' && updates.visaData) {
        const existingVisa = await tx
          .select()
          .from(visaReminders)
          .where(eq(visaReminders.reminderId, id));
  
        if (existingVisa.length > 0) {
          // Update existing visa reminder
          const [visaReminder] = await tx
            .update(visaReminders)
            .set({
              visa_type: updates.visaData.visaType,
              country: updates.visaData.country,
              expiry_date: updates.visaData.expiryDate,
              notes: updates.visaData.notes
            })
            .where(eq(visaReminders.reminderId, id))
            .returning();
          return { ...updatedReminder, visaData: visaReminder };
        } else {
          // Create new visa reminder
          const [visaReminder] = await tx
            .insert(visaReminders)
            .values({
              visa_type: updates.visaData.visaType,
              country: updates.visaData.country,
              expiry_date: updates.visaData.expiryDate,
              notes: updates.visaData.notes,
              reminder_id: id
            })
            .returning();
          return { ...updatedReminder, visaData: visaReminder };
        }
      } else if (updates.reminderType !== 'visa') {
        // Remove visa data if changing from visa to non-visa
        await tx
          .delete(visaReminders)
          .where(eq(visaReminders.reminderId, id));
        return updatedReminder;
      }
      
      return updatedReminder;
    });
  }
  async deleteReminder(id: number): Promise<boolean> {
    return db.transaction(async (tx) => {
      // Delete associated visa reminder
      await tx
        .delete(visaReminders)
        .where(eq(visaReminders.reminderId, id));

      // Delete notifications
      await tx
        .delete(notifications)
        .where(eq(notifications.reminderId, id));

      // Delete reminder
      const [deletedReminder] = await tx
        .delete(reminders)
        .where(eq(reminders.id, id))
        .returning();

      return !!deletedReminder;
    });
  }


  async countRemindersByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(reminders)
      .where(eq(reminders.userId, userId));
    return Number(result[0].count);
  }

  async getAllReminders(): Promise<Reminder[]> {
    return db.select().from(reminders);
  }

  // Visa reminder methods
  async createVisaReminder(
    visaReminderData: InsertVisaReminder
  ): Promise<VisaReminder> {
    const [visaReminder] = await db
      .insert(visaReminders)
      .values(visaReminderData)
      .returning();
    return visaReminder;
  }
  

  async getVisaReminderByReminderId(
    reminderId: number
  ): Promise<VisaReminder | undefined> {
    const [visaReminder] = await db
      .select()
      .from(visaReminders)
      .where(eq(visaReminders.reminderId, reminderId));
    return visaReminder;
  }

  async updateVisaReminder(
    id: number,
    updates: Partial<VisaReminder>
  ): Promise<VisaReminder | undefined> {
    const [updatedVisaReminder] = await db
      .update(visaReminders)
      .set(updates)
      .where(eq(visaReminders.id, id))
      .returning();
    return updatedVisaReminder;
  }

  async getVisaRemindersByUserId(
    userId: number
  ): Promise<{ reminder: Reminder; visaReminder: VisaReminder }[]> {
    const visaRemindersList: {
      reminder: Reminder;
      visaReminder: VisaReminder;
    }[] = [];

    // Get all reminders by user with type visa
    const userVisaReminders = await this.getRemindersByType(userId, "visa");

    for (const reminder of userVisaReminders) {
      const visaReminder = await this.getVisaReminderByReminderId(reminder.id);
      if (visaReminder) {
        visaRemindersList.push({ reminder, visaReminder });
      }
    }

    return visaRemindersList;
  }

  async countVisaRemindersByType(): Promise<
    { visaType: string; count: number }[]
  > {
    const result = await db
      .select({
        visaType: visaReminders.visaType,
        count: sql`count(*)`,
      })
      .from(visaReminders)
      .groupBy(visaReminders.visaType);

    // Add missing visa types with count 0
    const allVisaTypes = ["work", "tourist", "student", "business", "other"];
    const resultMap = new Map(result.map((r) => [r.visaType, Number(r.count)]));

    return allVisaTypes.map((visaType) => ({
      visaType,
      count: resultMap.get(visaType as any) || 0,
    }));
  }

  async getUpcomingExpirations(days: number): Promise<number> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const result = await db
      .select({ count: sql`count(*)` })
      .from(visaReminders)
      .where(
        and(
          gte(visaReminders.expiryDate, now),
          lt(visaReminders.expiryDate, future)
        )
      );

    return Number(result[0].count);
  }

  // Notification methods
  async createNotification(
    notificationData: InsertNotification
  ): Promise<Notification> {
    // Make sure isEnabled has a default value
    const finalData = {
      ...notificationData,
      isEnabled: notificationData.isEnabled ?? true,
    };

    const [notification] = await db
      .insert(notifications)
      .values(finalData)
      .returning();
    return notification;
  }

  async getNotificationsByReminderId(
    reminderId: number
  ): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.reminderId, reminderId));
  }

  async updateNotification(
    id: number,
    updates: Partial<Notification>
  ): Promise<Notification | undefined> {
    const [updatedNotification] = await db
      .update(notifications)
      .set(updates)
      .where(eq(notifications.id, id))
      .returning();
    return updatedNotification;
  }

  // Payment methods
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    // Make sure isPaid has a default value
    const finalData = {
      ...paymentData,
      isPaid: paymentData.isPaid ?? false,
    };

    const [payment] = await db.insert(payments).values(finalData).returning();
    return payment;
  }

  async getPaymentsByUserId(userId: number): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.userId, userId));
  }

  async updatePayment(
    id: number,
    updates: Partial<Payment>
  ): Promise<Payment | undefined> {
    const [updatedPayment] = await db
      .update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();
    return updatedPayment;
  }

// In your storage.ts file
async getRemindersByUserIdWithVisa(userId: number): Promise<ReminderWithVisa[]> {
  const reminders = await this.getRemindersByUserId(userId);
  
  // Get all visa reminders for these reminders in one query
  const reminderIds = reminders.map(r => r.id);
  const visaReminders = await db.select()
    .from(visaReminders)
    .where(inArray(visaReminders.reminderId, reminderIds));
  
  // Create a map for quick lookup
  const visaMap = new Map(visaReminders.map(vr => [vr.reminderId, vr]));
  
  // Combine the data
  return reminders.map(reminder => ({
    ...reminder,
    visaData: visaMap.get(reminder.id)
  }));
}


  async getAllPayments(): Promise<Payment[]> {
    return db.select().from(payments);
  }

  async getMonthlyRevenue(): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await db
      .select({
        sum: sql`sum(amount)`,
      })
      .from(payments)
      .where(
        and(gte(payments.paymentDate, monthStart), eq(payments.isPaid, true))
      );

    return Number(result[0].sum) || 0;
  }

  async getNewSubscriptions(): Promise<number> {
    // This is a simplified implementation - in a real app, we'd need more
    // complex logic to determine new vs renewal subscriptions
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Use a subquery to find all users who had their first payment this month
    const result = await db
      .select({ count: sql`count(DISTINCT user_id)` })
      .from(payments)
      .where(
        and(
          gte(payments.paymentDate, monthStart),
          eq(payments.isPaid, true),
          sql`NOT EXISTS (
            SELECT 1 FROM payments p2 
            WHERE p2.user_id = payments.user_id 
            AND p2.payment_date < ${monthStart}
          )`
        )
      );

    return Number(result[0].count) || 0;
  }

  async getRenewals(): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count users who had previous payments before this month
    const result = await db
      .select({ count: sql`count(DISTINCT user_id)` })
      .from(payments)
      .where(
        and(
          gte(payments.paymentDate, monthStart),
          eq(payments.isPaid, true),
          sql`EXISTS (
            SELECT 1 FROM payments p2 
            WHERE p2.user_id = payments.user_id 
            AND p2.payment_date < ${monthStart}
          )`
        )
      );

    return Number(result[0].count) || 0;
  }
}

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();
