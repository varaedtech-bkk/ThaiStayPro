import { db } from '../server/storage'; // Import from storage.ts instead
import { users } from '@shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Check if admin already exists
    const [existingAdmin] = await db.select()
      .from(users)
      .where(eq(users.username, 'admin'))
      .limit(1);
    
    if (existingAdmin) {
      console.log('Admin user already exists.');
      return;
    }
    
    // Hash the password
    const hashedPassword = await hashPassword('admin123');
    
    // Create admin user
    await db.insert(users).values({
      username: 'admin',
      email: 'admin@reminderpro.com',
      password: hashedPassword,
      fullName: 'Admin User',
      planType: 'pro',
      reminderLimit: 100,
      isAdmin: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date()
    });
    
    console.log('✅ Admin user created successfully.');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

// Run the script
createAdminUser()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));