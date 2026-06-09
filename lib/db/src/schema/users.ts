import { pgTable, text, serial, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  userType: text("user_type").notNull().default("customer"),
  area: text("area"),
  rating: real("rating"),
  isVerified: boolean("is_verified").notNull().default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
  lastLogin: timestamp("last_login", { withTimezone: true }),
  otpCode: text("otp_code"),
  otpCreatedAt: timestamp("otp_created_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Helper interest preferences for future notification targeting
  helperInterests: text("helper_interests"),   // JSON: string[] of category values
  preferredAreas:  text("preferred_areas"),    // JSON: string[] of area names
  // Persistent auth token — generated on login, cleared on logout
  authToken: text("auth_token").unique(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
