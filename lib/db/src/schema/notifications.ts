import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const adminNotificationsTable = pgTable("admin_notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("otp_request"),
  title: text("title").notNull(),
  userId: integer("user_id"),
  userName: text("user_name"),
  phone: text("phone").notNull(),
  userType: text("user_type"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminNotification = typeof adminNotificationsTable.$inferSelect;
