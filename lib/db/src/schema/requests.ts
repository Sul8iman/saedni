import { boolean, integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

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
  completedHelperId: integer("completed_helper_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  customerNameSnapshot: text("customer_name_snapshot"),
  customerPhoneSnapshot: text("customer_phone_snapshot"),
  completedHelperNameSnapshot: text("completed_helper_name_snapshot"),
  completedHelperPhoneSnapshot: text("completed_helper_phone_snapshot"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedByUserId: integer("deleted_by_user_id"),
  deletedReason: text("deleted_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRequestSchema = createInsertSchema(requestsTable).omit({
  id: true,
  createdAt: true,
  deletedAt: true,
  deletedByUserId: true,
  deletedReason: true,
});

export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requestsTable.$inferSelect;
