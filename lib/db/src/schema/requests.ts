import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Help requests table
export const requestsTable = pgTable("requests", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  helperId: integer("helper_id"),
  category: text("category").notNull(), // transport | delivery | government | shopping | home_services | labor
  details: text("details").notNull(),
  area: text("area").notNull(),
  timeType: text("time_type").notNull().default("now"), // now | scheduled
  scheduledDateTime: text("scheduled_date_time"),
  offeredAmount: real("offered_amount").notNull(),
  status: text("status").notNull().default("available"), // available | accepted | in_progress | completed | cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRequestSchema = createInsertSchema(requestsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requestsTable.$inferSelect;
