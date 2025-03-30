import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertReminderSchema, insertVisaReminderSchema, insertNotificationSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";

// Initialize Stripe if secret key exists
let stripe: Stripe | undefined;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
}

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Not authorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // User API endpoints
  app.get("/api/users", isAdmin, async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error) {
      next(error);
    }
  });

  // Reminders API endpoints
  app.get("/api/reminders", isAuthenticated, async (req, res, next) => {
    try {
      const reminders = await storage.getRemindersByUserId(req.user.id);
      res.json(reminders);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/reminders/:id", isAuthenticated, async (req, res, next) => {
    try {
      const reminderId = Number(req.params.id);
      const reminder = await storage.getReminderById(reminderId);
      
      if (!reminder || reminder.userId !== req.user.id) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      let visaData;
      if (reminder.reminderType === 'visa') {
        visaData = await storage.getVisaReminderByReminderId(reminder.id);
      }

      res.json({
        ...reminder,
        visaData
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/reminders/type/:type", isAuthenticated, async (req, res, next) => {
    try {
      const { type } = req.params;
      const reminders = await storage.getRemindersByType(req.user.id, type);
      res.json(reminders);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/reminders", isAuthenticated, async (req, res, next) => {
    try {
      // Validate reminder data
      const reminderData = insertReminderSchema.parse({
        ...req.body,
        userId: req.user.id,
        reminderDate: new Date(req.body.reminderDate)
      });

      // Check reminder limit for free users
      if (req.user.planType === 'free') {
        const count = await storage.countRemindersByUserId(req.user.id);
        if (count >= req.user.reminderLimit) {
          return res.status(403).json({ 
            message: "Reminder limit reached. Upgrade to Pro for unlimited reminders." 
          });
        }
      }

      // Create reminder
      const reminder = await storage.createReminder(reminderData);

      // Handle visa reminder if needed
      if (reminder.reminderType === 'visa' && req.body.visaData) {
        const visaData = insertVisaReminderSchema.parse({
          ...req.body.visaData,
          reminderId: reminder.id,
          expiryDate: new Date(req.body.visaData.expiryDate)
        });
        await storage.createVisaReminder(visaData);
      }

      // Handle notifications
      for (const notificationType of req.body.notifications || ['email', 'push']) {
        if (notificationType === 'sms' && req.user.planType === 'free') continue;
        
        await storage.createNotification({
          reminderId: reminder.id,
          notificationType,
          isEnabled: true
        });
      }

      // Return the complete reminder with visa data if applicable
      const completeReminder = await storage.getReminderById(reminder.id);
      if (completeReminder?.reminderType === 'visa') {
        const visaReminder = await storage.getVisaReminderByReminderId(reminder.id);
        return res.status(201).json({
          ...completeReminder,
          visaData: visaReminder
        });
      }

      res.status(201).json(completeReminder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  app.put("/api/reminders/:id", isAuthenticated, async (req, res, next) => {
    try {
      const reminderId = Number(req.params.id);
      const existingReminder = await storage.getReminderById(reminderId);

      if (!existingReminder || existingReminder.userId !== req.user.id) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      // Process base reminder updates
      const updates: any = {
        title: req.body.title,
        description: req.body.description,
        reminderType: req.body.reminderType,
        reminderDate: new Date(req.body.reminderDate)
      };

      // Handle visa data updates if this is a visa reminder
      if (req.body.reminderType === 'visa') {
        updates.visaData = {
          visaType: req.body.visaData?.visaType,
          country: req.body.visaData?.country,
          expiryDate: req.body.visaData?.expiryDate ? new Date(req.body.visaData.expiryDate) : undefined,
          notes: req.body.visaData?.notes
        };
      }

      // Update the reminder (this will handle visa data internally)
      const updatedReminder = await storage.updateReminder(reminderId, updates);

      // Handle notifications
      if (req.body.notifications) {
        const currentNotifications = await storage.getNotificationsByReminderId(reminderId);
        
        // Update existing or create new notifications
        for (const type of req.body.notifications) {
          if (type === 'sms' && req.user.planType === 'free') continue;

          const existing = currentNotifications.find(n => n.notificationType === type);
          if (existing) {
            await storage.updateNotification(existing.id, { isEnabled: true });
          } else {
            await storage.createNotification({
              reminderId: reminderId,
              notificationType: type,
              isEnabled: true
            });
          }
        }

        // Disable unchecked notifications
        for (const notification of currentNotifications) {
          if (!req.body.notifications.includes(notification.notificationType)) {
            await storage.updateNotification(notification.id, { isEnabled: false });
          }
        }
      }

      // Return complete updated reminder with visa data if applicable
      const completeReminder = await storage.getReminderById(reminderId);
      if (completeReminder?.reminderType === 'visa') {
        const visaReminder = await storage.getVisaReminderByReminderId(reminderId);
        return res.json({
          ...completeReminder,
          visaData: visaReminder
        });
      }

      res.json(completeReminder);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/reminders/:id", isAuthenticated, async (req, res, next) => {
    try {
      const reminderId = Number(req.params.id);
      const reminder = await storage.getReminderById(reminderId);

      if (!reminder || reminder.userId !== req.user.id) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      await storage.deleteReminder(reminderId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Visa Reminders API endpoints
  app.get("/api/visa-reminders", isAuthenticated, async (req, res, next) => {
    try {
      const visaReminders = await storage.getVisaRemindersByUserId(req.user.id);
      res.json(visaReminders);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/visa-reminders/:id", isAuthenticated, async (req, res, next) => {
    try {
      const reminderId = Number(req.params.id);
      const visaReminder = await storage.getVisaReminderByReminderId(reminderId);

      if (!visaReminder) {
        return res.status(404).json({ message: "Visa reminder not found" });
      }

      // Verify the reminder belongs to the user
      const reminder = await storage.getReminderById(reminderId);
      if (!reminder || reminder.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      res.json(visaReminder);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/visa-reminders/:id", isAuthenticated, async (req, res, next) => {
    try {
      const reminderId = Number(req.params.id);
      const reminder = await storage.getReminderById(reminderId);

      if (!reminder || reminder.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (reminder.reminderType !== 'visa') {
        return res.status(400).json({ message: "Not a visa reminder" });
      }

      const visaReminder = await storage.getVisaReminderByReminderId(reminderId);
      if (!visaReminder) {
        return res.status(404).json({ message: "Visa reminder not found" });
      }

      const updatedVisaReminder = await storage.updateVisaReminder(
        visaReminder.id,
        {
          visaType: req.body.visaType,
          country: req.body.country,
          expiryDate: new Date(req.body.expiryDate),
          notes: req.body.notes
        }
      );

      res.json(updatedVisaReminder);
    } catch (error) {
      next(error);
    }
  });

  // Admin API endpoints
  app.get("/api/admin/stats", isAdmin, async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      const proUsers = await storage.getProUsers();
      const freeUsers = await storage.getFreeUsers();
      const reminders = await storage.getAllReminders();
      const visaRemindersByType = await storage.countVisaRemindersByType();
      const upcomingExpirations7Days = await storage.getUpcomingExpirations(7);
      const upcomingExpirations30Days = await storage.getUpcomingExpirations(30);
      const upcomingExpirations90Days = await storage.getUpcomingExpirations(90);
      const monthlyRevenue = await storage.getMonthlyRevenue();
      const newSubscriptions = await storage.getNewSubscriptions();
      const renewals = await storage.getRenewals();

      res.json({
        users: {
          total: users.length,
          pro: proUsers.length,
          free: freeUsers.length
        },
        reminders: {
          total: reminders.length,
          visa: visaRemindersByType.reduce((acc, curr) => acc + curr.count, 0),
          byType: visaRemindersByType
        },
        expirations: {
          next7Days: upcomingExpirations7Days,
          next30Days: upcomingExpirations30Days,
          next90Days: upcomingExpirations90Days
        },
        revenue: {
          monthly: monthlyRevenue,
          newSubscriptions,
          renewals
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Stripe integration (if configured)
  if (stripe) {
    app.post("/api/create-subscription", isAuthenticated, async (req, res, next) => {
      try {
        const user = req.user;

        if (user.stripeSubscriptionId && user.planType === 'pro') {
          return res.status(200).json({
            message: "Already subscribed",
            isSubscribed: true
          });
        }

        let customerId = user.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.fullName,
            metadata: { userId: user.id.toString() }
          });
          customerId = customer.id;
          await storage.updateStripeCustomerId(user.id, customerId);
        }

        const priceId = process.env.STRIPE_PRICE_ID;
        if (!priceId) {
          return res.status(500).json({ message: "Stripe price ID not configured" });
        }

        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        await storage.updateUserStripeInfo(user.id, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id
        });

        const invoice = subscription.latest_invoice as Stripe.Invoice;
        const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

        await storage.createPayment({
          userId: user.id,
          amount: invoice.amount_due / 100,
          planType: 'pro',
          isPaid: false,
          stripePaymentId: paymentIntent.id
        });

        res.json({
          subscriptionId: subscription.id,
          clientSecret: paymentIntent.client_secret
        });
      } catch (error) {
        next(error);
      }
    });

    app.post('/api/webhook', async (req, res) => {
      let event;
      try {
        const signature = req.headers['stripe-signature'] as string;
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!endpointSecret) {
          return res.status(400).json({ message: "Webhook secret not configured" });
        }

        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          endpointSecret
        );
      } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      switch (event.type) {
        case 'invoice.paid':
          const invoice = event.data.object as Stripe.Invoice;
          const payment = await storage.getAllPayments().then(
            payments => payments.find(p => p.stripePaymentId === invoice.payment_intent)
          );
          if (payment) {
            await storage.updatePayment(payment.id, { isPaid: true });
          }
          break;

        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          const users = await storage.getAllUsers();
          const user = users.find(u => u.stripeSubscriptionId === subscription.id);
          if (user) {
            await storage.updateUser(user.id, {
              planType: 'free',
              reminderLimit: 10,
              stripeSubscriptionId: null
            });
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}