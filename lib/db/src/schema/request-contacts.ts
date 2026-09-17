import { sql } from "drizzle-orm";
import { check, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { requestsTable } from "./requests";
import { usersTable } from "./users";

export const requestContactsTable = pgTable(
  "request_contacts",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").notNull().references(() => requestsTable.id, {
      onDelete: "cascade",
    }),
    helperId: integer("helper_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    customerId: integer("customer_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    helperNameSnapshot: text("helper_name_snapshot"),
    customerNameSnapshot: text("customer_name_snapshot"),
    customerPhoneSnapshot: text("customer_phone_snapshot"),
    contactMethod: text("contact_method").notNull(),
    contactPhone: text("contact_phone").notNull(),
    firstContactedAt: timestamp("first_contacted_at", { withTimezone: true }).notNull().defaultNow(),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("request_contacts_request_helper_unique").on(
      table.requestId,
      table.helperId,
    ),
    check("request_contacts_contact_method_check", sql`contact_method IN ('phone', 'whatsapp')`),
    check("request_contacts_contact_phone_check", sql`btrim(contact_phone) <> ''`),
  ],
);

export type RequestContact = typeof requestContactsTable.$inferSelect;
