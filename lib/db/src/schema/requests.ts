import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const requestsTable = pgTable("requests", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  helperId: integer("helper_id"),
  category: text("category").notNull(),
  details: text("details").notNull(),
  area: text("area").notNull(),
  timeType: text("time_type").notNull().default("now"),
  scheduledDateTime: text("scheduled_date_time"),
  offeredAmount: real("offered_amount").notNull(),
  status: text("status").notNull().default("available"),
  helpCompleted: boolean("help_completed"),                               // true/false/null (null = no feedback yet)
  completedAt: timestamp("completed_at", { withTimezone: true }),        // when customer pressed إنهاء الطلب
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRequestSchema = createInsertSchema(requestsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requestsTable.$inferSelect;
