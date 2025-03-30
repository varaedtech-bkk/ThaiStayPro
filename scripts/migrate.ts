// scripts/migrate.ts
import { db } from '../server/storage';
import { users, reminders, visaReminders, notifications, payments } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Running migrations...');

    // Create tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${users} (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        plan_type TEXT NOT NULL DEFAULT 'free',
        reminder_limit INTEGER NOT NULL DEFAULT 10,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        is_admin BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${reminders} (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES ${users}(id),
        title TEXT NOT NULL,
        description TEXT,
        reminder_type TEXT NOT NULL DEFAULT 'general',
        reminder_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${visaReminders} (
        id SERIAL PRIMARY KEY,
        reminder_id INTEGER NOT NULL REFERENCES ${reminders}(id),
        visa_type TEXT NOT NULL,
        country TEXT NOT NULL,
        expiry_date TIMESTAMP NOT NULL,
        notes TEXT
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${notifications} (
        id SERIAL PRIMARY KEY,
        reminder_id INTEGER NOT NULL REFERENCES ${reminders}(id),
        notification_type TEXT NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT true
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${payments} (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES ${users}(id),
        amount REAL NOT NULL,
        plan_type TEXT NOT NULL,
        is_paid BOOLEAN NOT NULL DEFAULT false,
        stripe_payment_id TEXT,
        payment_date TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log('✅ Migrations completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

migrate();