import { sql } from "drizzle-orm";
import { check, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { requestsTable } from "./requests";
import { usersTable } from "./users";

export const helperRatingsTable = pgTable(
  "helper_ratings",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").notNull().unique().references(() => requestsTable.id, {
      onDelete: "cascade",
    }),
    customerId: integer("customer_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    helperId: integer("helper_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    helperNameSnapshot: text("helper_name_snapshot"),
    customerNameSnapshot: text("customer_name_snapshot"),
    stars: integer("stars").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("helper_ratings_stars_check", sql`${table.stars} BETWEEN 1 AND 5`),
  ],
);

export type HelperRating = typeof helperRatingsTable.$inferSelect;
