import { Router, type IRouter } from "express";
import { eq, count, desc, and, inArray, isNull, isNotNull, or, ilike, gte, lte, sql } from "drizzle-orm";
import { createHmac } from "crypto";
import {
  adminNotificationsTable,
  db,
  requestLifecycleEventsTable,
  requestsTable,
  usersTable,
  helperRatingsTable,
  requestContactsTable,
} from "@workspace/db";
import { VerifyHelperParams, VerifyHelperBody, DeleteUserParams } from "@workspace/api-zod";
import { sendAdminOtpPush } from "../lib/push";
import { logger } from "../lib/logger";
import { enrichRequest } from "./requests";

const router: IRouter = Router();

const ACTIVE_STATUSES = ["available", "accepted", "in_progress"] as const;
type AdminFilters = { areas: string[]; category?: string; search?: string; from?: Date; to?: Date };

function postgresForeignKeyViolation(error: unknown): { constraint?: string } | null {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (candidate.code === "23503") {
      return {
        constraint: typeof candidate.constraint === "string" ? candidate.constraint : undefined,
      };
    }
    current = candidate.cause;
  }
  return null;
}

function queryValues(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim()).slice(0, 50);
}
function adminFilters(req: import("express").Request): { filters?: AdminFilters; error?: string } {
  const q = req.query;
  const from = typeof q.from === "string" ? new Date(q.from) : undefined;
  const to = typeof q.to === "string" ? new Date(q.to) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) return { error: "Invalid date filter" };
  if (from && to && from > to) return { error: "from must be before to" };
  const category = typeof q.category === "string" ? q.category.trim().slice(0, 100) : undefined;
  const search = typeof q.search === "string" ? q.search.trim().slice(0, 120) : undefined;
  return { filters: { areas: queryValues(q.area), category, search, from, to } };
}
function filterConditions(f: AdminFilters, customer?: typeof usersTable) {
  const conditions: any[] = [];
  if (f.areas.length) conditions.push(or(...f.areas.map((area) => eq(requestsTable.area, area))));
  if (f.category) conditions.push(eq(requestsTable.category, f.category));
  if (f.from) conditions.push(gte(requestsTable.createdAt, f.from));
  if (f.to) conditions.push(lte(requestsTable.createdAt, f.to));
  if (f.search && customer) {
    const pattern = `%${f.search.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(or(ilike(customer.name, pattern), ilike(customer.phone, pattern), ilike(requestsTable.details, pattern)));
  }
  return conditions;
}

router.use("/admin", async (req, res, next): Promise<void> => {
  const userId = (req as any).session?.userId;
  if (!userId) {
    res.status(401).json({ error: "يلزم تسجيل دخول المدير" });
    return;
  }

  const [user] = await db
    .select({
      userType: usersTable.userType,
      isVerified: usersTable.isVerified,
      isBlocked: usersTable.isBlocked,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user || user.userType !== "admin" || !user.isVerified || user.isBlocked) {
    res.status(403).json({ error: "هذه العملية متاحة للمدير فقط" });
    return;
  }

  next();
});

function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashHelperCode(code: string): string {
  const secret = process.env.SESSION_SECRET ?? "dev-secret-change-me";
  return createHmac("sha256", secret).update(code).digest("hex");
}

function safeUser(user: typeof usersTable.$inferSelect) {
  const {
    passwordHash: _,
    helperActivationCodeHash: __,   // never expose hash
    helperWelcomeMessageLeaseId: ___,
    helperWelcomeMessageLeaseExpiresAt: ____,
    ...safe
  } = user;
  return {
    ...safe,
    isActive: !safe.isBlocked,
    createdAt: safe.createdAt.toISOString(),
    lastLogin: safe.lastLogin?.toISOString() ?? null,
    otpCreatedAt: safe.otpCreatedAt?.toISOString() ?? null,
    helperActivationCodeCreatedAt: safe.helperActivationCodeCreatedAt?.toISOString() ?? null,
    helperActivationCodeUsedAt: safe.helperActivationCodeUsedAt?.toISOString() ?? null,
  };
}

function safeNotification(n: typeof adminNotificationsTable.$inferSelect) {
  return {
    ...n,
    createdAt: n.createdAt.toISOString(),
  };
}

// GET /admin/stats
router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [totalUsersResult] = await db.select({ count: count() }).from(usersTable);
  const [totalHelpersResult] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.userType, "helper"));
  const [totalCustomersResult] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.userType, "customer"));
  const [totalRequestsResult] = await db
    .select({ count: count() })
    .from(requestsTable)
    .where(isNull(requestsTable.deletedAt));
  const [activeRequestsResult] = await db
    .select({ count: count() })
    .from(requestsTable)
    .where(and(inArray(requestsTable.status, [...ACTIVE_STATUSES]), isNull(requestsTable.deletedAt)));
  const [completedRequestsResult] = await db
    .select({ count: count() })
    .from(requestsTable)
    .where(and(eq(requestsTable.status, "completed"), isNull(requestsTable.deletedAt)));
  const [cancelledRequestsResult] = await db
    .select({ count: count() })
    .from(requestsTable)
    .where(and(eq(requestsTable.status, "cancelled"), isNull(requestsTable.deletedAt)));

  // Feedback stats
  const [helpCompletedResult] = await db
    .select({ count: count() })
    .from(requestsTable)
    .where(and(
      eq(requestsTable.status, "completed"),
      eq(requestsTable.helpCompleted, true),
      isNull(requestsTable.deletedAt),
    ));
  const [helpNotCompletedResult] = await db
    .select({ count: count() })
    .from(requestsTable)
    .where(and(
      eq(requestsTable.status, "completed"),
      eq(requestsTable.helpCompleted, false),
      isNull(requestsTable.deletedAt),
    ));

  const helpYes = helpCompletedResult.count;
  const helpNo  = helpNotCompletedResult.count;
  const successRate = (helpYes + helpNo) > 0
    ? Math.round((helpYes / (helpYes + helpNo)) * 100)
    : 0;

  res.json({
    totalUsers: totalUsersResult.count,
    totalHelpers: totalHelpersResult.count,
    totalCustomers: totalCustomersResult.count,
    totalRequests: totalRequestsResult.count,
    activeRequests: activeRequestsResult.count,
    completedRequests: completedRequestsResult.count,
    cancelledRequests: cancelledRequestsResult.count,
    helpCompleted: helpYes,
    helpNotCompleted: helpNo,
    successRate,
  });
});

// PATCH /admin/helpers/:id/verify
router.patch("/admin/helpers/:id/verify", async (req, res): Promise<void> => {
  const params = VerifyHelperParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = VerifyHelperBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates =
    parsed.data.action === "verify"
      ? { isVerified: true, isBlocked: false }
      : {
          isBlocked: true,
          isVerified: false,
          // Disable any active code when the account is blocked
          helperActivationCodeActive: false,
        };

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  res.json(safeUser(user));
});

// POST /admin/helpers/:id/regenerate-code
// Generates a new non-expiring activation code for an unverified helper.
// The plain code is sent to the admin via push notification only — never in the response.
router.post("/admin/helpers/:id/regenerate-code", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "معرف غير صالح" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  if (user.userType !== "helper" && user.userType !== "customer") {
    res.status(400).json({ error: "هذا الإجراء مخصص للمساعدين فقط" });
    return;
  }

  if (user.isBlocked) {
    res.status(400).json({ error: "لا يمكن إنشاء رمز لحساب محظور" });
    return;
  }

  const code = generate6DigitCode();

  const [updated] = await db
    .update(usersTable)
    .set({
      helperActivationCodeHash: hashHelperCode(code),
      helperActivationCodeCreatedAt: new Date(),
      helperActivationCodeUsedAt: null,
      helperActivationCodeActive: true,
    })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(500).json({ error: "فشل إنشاء الرمز" });
    return;
  }

  logger.info({ userId: id }, "admin: helper activation code regenerated");

  // Notify admin via push (plain code in notification body — never in logs)
  try {
    const [notifRow] = await db.insert(adminNotificationsTable).values({
      type: "otp_request",
      title: "تم إنشاء رمز تفعيل جديد للمساعد",
      userId: id,
      userName: user.name,
      phone: user.phone,
      userType: user.userType,
      isRead: false,
    }).returning({ id: adminNotificationsTable.id });

    if (notifRow?.id != null) {
      void sendAdminOtpPush(notifRow.id, id, user.phone, new Date().toISOString(), code);
    }
  } catch (err) {
    logger.error({ err }, "admin: failed to create regenerate-code notification");
    // Non-fatal — code was saved, continue
  }

  // Return the plain code exactly once in this authenticated admin response.
  // It is never stored in plaintext, never logged, and never returned by any GET endpoint.
  res.json({
    message: "تم إنشاء رمز تفعيل جديد وإلغاء الرمز السابق.",
    activationCode: code,
  });
});

// DELETE /admin/users/:id/delete
// Deletes only the selected user row. Historical rows are preserved; their
// nullable user references are detached by the reviewed ON DELETE SET NULL
// migration after missing identity snapshots are filled in this transaction.
router.delete("/admin/users/:id/delete", async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const currentUserId = (req as any).session?.userId as number | undefined;

  try {
    const result = await db.transaction(async (tx) => {
      const [actor] = await tx
        .select({
          id: usersTable.id,
          userType: usersTable.userType,
          isVerified: usersTable.isVerified,
          isBlocked: usersTable.isBlocked,
        })
        .from(usersTable)
        .where(eq(usersTable.id, currentUserId ?? -1))
        .for("update");
      if (!actor || actor.userType !== "admin" || !actor.isVerified || actor.isBlocked) {
        return { kind: "forbidden" as const };
      }

      const [target] = await tx
        .select({
          id: usersTable.id,
          userType: usersTable.userType,
          name: usersTable.name,
          phone: usersTable.phone,
        })
        .from(usersTable)
        .where(eq(usersTable.id, params.data.id))
        .for("update");
      if (!target) return { kind: "not_found" as const };
      if (actor.id === target.id) return { kind: "self" as const };
      if (target.userType === "admin") return { kind: "admin" as const };

      await tx
        .update(requestsTable)
        .set({ customerNameSnapshot: target.name })
        .where(and(eq(requestsTable.customerId, target.id), isNull(requestsTable.customerNameSnapshot)));
      await tx
        .update(requestsTable)
        .set({ customerPhoneSnapshot: target.phone })
        .where(and(eq(requestsTable.customerId, target.id), isNull(requestsTable.customerPhoneSnapshot)));
      await tx
        .update(requestsTable)
        .set({ completedHelperNameSnapshot: target.name })
        .where(and(eq(requestsTable.completedHelperId, target.id), isNull(requestsTable.completedHelperNameSnapshot)));
      await tx
        .update(requestsTable)
        .set({ completedHelperPhoneSnapshot: target.phone })
        .where(and(eq(requestsTable.completedHelperId, target.id), isNull(requestsTable.completedHelperPhoneSnapshot)));

      await tx
        .update(requestContactsTable)
        .set({ helperNameSnapshot: target.name })
        .where(and(eq(requestContactsTable.helperId, target.id), isNull(requestContactsTable.helperNameSnapshot)));
      await tx
        .update(requestContactsTable)
        .set({ customerNameSnapshot: target.name })
        .where(and(eq(requestContactsTable.customerId, target.id), isNull(requestContactsTable.customerNameSnapshot)));
      await tx
        .update(requestContactsTable)
        .set({ customerPhoneSnapshot: target.phone })
        .where(and(eq(requestContactsTable.customerId, target.id), isNull(requestContactsTable.customerPhoneSnapshot)));

      await tx
        .update(helperRatingsTable)
        .set({ helperNameSnapshot: target.name })
        .where(and(eq(helperRatingsTable.helperId, target.id), isNull(helperRatingsTable.helperNameSnapshot)));
      await tx
        .update(helperRatingsTable)
        .set({ customerNameSnapshot: target.name })
        .where(and(eq(helperRatingsTable.customerId, target.id), isNull(helperRatingsTable.customerNameSnapshot)));

      const [deleted] = await tx
        .delete(usersTable)
        .where(eq(usersTable.id, target.id))
        .returning({ id: usersTable.id });
      if (!deleted) return { kind: "not_found" as const };
      return { kind: "deleted" as const, target };
    });

    if (result.kind === "forbidden") {
      res.status(403).json({ error: "هذه العملية متاحة للمدير فقط" });
      return;
    }
    if (result.kind === "not_found") {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    if (result.kind === "self") {
      res.status(403).json({ error: "لا يمكنك حذف حسابك" });
      return;
    }
    if (result.kind === "admin") {
      res.status(403).json({ error: "لا يمكنك حذف حساب مدير آخر" });
      return;
    }

    req.log.info({ userId: result.target.id }, "admin: account deleted; historical rows preserved");
    res.sendStatus(204);
    return;
  } catch (error: unknown) {
    const databaseError = postgresForeignKeyViolation(error);
    if (databaseError) {
      req.log.warn(
        { userId: params.data.id, constraint: databaseError.constraint },
        "admin: account deletion blocked by a foreign-key constraint",
      );
      res.status(409).json({
        error: "لا يمكن حذف هذا الحساب لوجود سجلات تواصل أو تقييمات مرتبطة به",
      });
      return;
    }
    throw error;
  }
});

// GET /admin/notifications
router.get("/admin/notifications", async (_req, res): Promise<void> => {
  const notifications = await db
    .select()
    .from(adminNotificationsTable)
    .orderBy(desc(adminNotificationsTable.createdAt));

  res.json(notifications.map(safeNotification));
});

// PATCH /admin/notifications/:id/read
router.patch("/admin/notifications/:id/read", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "معرف غير صالح" });
    return;
  }

  const [notification] = await db
    .update(adminNotificationsTable)
    .set({ isRead: true })
    .where(eq(adminNotificationsTable.id, id))
    .returning();

  if (!notification) {
    res.status(404).json({ error: "الإشعار غير موجود" });
    return;
  }

  res.json(safeNotification(notification));
});

// Aggregate-only admin dashboard API. Every metric is computed in PostgreSQL;
// request/user detail rows are never used as a substitute for aggregation.
router.get("/admin/statistics", async (req, res): Promise<void> => {
  const parsed = adminFilters(req);
  if (parsed.error || !parsed.filters) { res.status(400).json({ error: parsed.error }); return; }
  const f = parsed.filters;
  const period = typeof req.query.period === "string" ? req.query.period : "all";
  if (!["7d", "30d", "month", "all"].includes(period)) { res.status(400).json({ error: "Invalid period" }); return; }
  if (!f.from && period !== "all") {
    const start = new Date();
    if (period === "7d") start.setDate(start.getDate() - 7);
    else if (period === "30d") start.setDate(start.getDate() - 30);
    else { start.setDate(1); start.setHours(0, 0, 0, 0); }
    f.from = start;
  }
  const base = [isNull(requestsTable.deletedAt), ...filterConditions(f)];
  const periodUsers = f.from && f.to
    ? and(gte(usersTable.createdAt, f.from), lte(usersTable.createdAt, f.to))
    : f.from
      ? gte(usersTable.createdAt, f.from)
      : f.to
        ? lte(usersTable.createdAt, f.to)
        : undefined;
  const requestCounts = await db.select({
    total: count(),
    active: sql<number>`count(*) filter (where ${inArray(requestsTable.status, [...ACTIVE_STATUSES])})`,
    completed: sql<number>`count(*) filter (where ${eq(requestsTable.status, "completed")})`,
    cancelled: sql<number>`count(*) filter (where ${eq(requestsTable.status, "cancelled")})`,
    helped: sql<number>`count(*) filter (where ${and(eq(requestsTable.status, "completed"), eq(requestsTable.helpCompleted, true))})`,
    notHelped: sql<number>`count(*) filter (where ${and(eq(requestsTable.status, "completed"), eq(requestsTable.helpCompleted, false))})`,
    noFeedback: sql<number>`count(*) filter (where ${and(eq(requestsTable.status, "completed"), isNull(requestsTable.helpCompleted))})`,
    value: sql<number>`coalesce(sum(${requestsTable.offeredAmount}) filter (where ${and(eq(requestsTable.status, "completed"), eq(requestsTable.helpCompleted, true))}), 0)`,
    avgValue: sql<number>`coalesce(avg(${requestsTable.offeredAmount}) filter (where ${and(eq(requestsTable.status, "completed"), eq(requestsTable.helpCompleted, true))}), 0)`,
    newInPeriod: f.from && f.to
      ? sql<number>`count(*) filter (where ${and(gte(requestsTable.createdAt, f.from), lte(requestsTable.createdAt, f.to))})`
      : f.from
        ? sql<number>`count(*) filter (where ${gte(requestsTable.createdAt, f.from)})`
        : f.to
          ? sql<number>`count(*) filter (where ${lte(requestsTable.createdAt, f.to)})`
          : sql<number>`0`,
  }).from(requestsTable).where(and(...base));
  const [users] = await db.select({
    total: count(),
    customers: sql<number>`count(*) filter (where ${eq(usersTable.userType, "customer")} or ${sql`${usersTable.roles} like '%"customer"%'`})`,
    helpers: sql<number>`count(*) filter (where ${eq(usersTable.userType, "helper")} or ${sql`${usersTable.roles} like '%"helper"%'`})`,
    active: sql<number>`count(*) filter (where not ${usersTable.isBlocked})`,
    blocked: sql<number>`count(*) filter (where ${usersTable.isBlocked})`,
    newInPeriod: periodUsers ? sql<number>`count(*) filter (where ${periodUsers})` : sql<number>`0`,
  }).from(usersTable);
  const [rc] = requestCounts;
  const [rating] = await db.select({
    averageStars: sql<number>`coalesce(avg(${helperRatingsTable.stars}), 0)`,
    totalRatings: count(),
    helpersWithRatings: sql<number>`count(distinct ${helperRatingsTable.helperId})`,
  }).from(helperRatingsTable).innerJoin(requestsTable, eq(requestsTable.id, helperRatingsTable.requestId))
    .where(and(...base));
  const [contact] = await db.select({
    contactedRequests: sql<number>`count(distinct ${requestContactsTable.requestId})`,
    contactedHelpers: sql<number>`count(distinct (${requestContactsTable.requestId}, ${requestContactsTable.helperId}))`,
    averageFirstContactMinutes: sql<number>`coalesce(avg(extract(epoch from (${requestContactsTable.firstContactedAt} - ${requestsTable.createdAt})) / 60), 0)`,
  }).from(requestContactsTable).innerJoin(requestsTable, eq(requestsTable.id, requestContactsTable.requestId))
    .where(and(...base));
  const areas = await db.select({
    area: requestsTable.area, total: count(),
    active: sql<number>`count(*) filter (where ${inArray(requestsTable.status, [...ACTIVE_STATUSES])})`,
    helped: sql<number>`count(*) filter (where ${and(eq(requestsTable.status, "completed"), eq(requestsTable.helpCompleted, true))})`,
    notHelped: sql<number>`count(*) filter (where ${and(eq(requestsTable.status, "completed"), eq(requestsTable.helpCompleted, false))})`,
  }).from(requestsTable).where(and(...base)).groupBy(requestsTable.area);
  const categories = await db.select({
    category: requestsTable.category, total: count(),
    active: sql<number>`count(*) filter (where ${inArray(requestsTable.status, [...ACTIVE_STATUSES])})`,
    helped: sql<number>`count(*) filter (where ${and(eq(requestsTable.status, "completed"), eq(requestsTable.helpCompleted, true))})`,
    notHelped: sql<number>`count(*) filter (where ${and(eq(requestsTable.status, "completed"), eq(requestsTable.helpCompleted, false))})`,
  }).from(requestsTable).where(and(...base)).groupBy(requestsTable.category);
  const retentionRows = await db
    .select({ customerId: requestsTable.customerId, requestCount: count() })
    .from(requestsTable)
    .where(and(...base))
    .groupBy(requestsTable.customerId);
  const [mismatch] = await db.select({
    cancelledWithCompletionData: sql<number>`count(*) filter (where ${eq(requestsTable.status, "cancelled")} and (${requestsTable.completedAt} is not null or ${requestsTable.helpCompleted} is not null))`,
    completedWithoutCompletedAt: sql<number>`count(*) filter (where ${eq(requestsTable.status, "completed")} and ${requestsTable.completedAt} is null)`,
    legacyMismatches: sql<number>`count(*) filter (where ${eq(requestsTable.status, "completed")} and ${requestsTable.completedHelperId} is null and ${requestsTable.helperId} is not null)`,
  }).from(requestsTable).where(and(...base));
  const oneRequest = retentionRows.filter((row) => Number(row.requestCount) === 1).length;
  const repeatCustomers = retentionRows.filter((row) => Number(row.requestCount) > 1).length;
  const helped = Number(rc?.helped ?? 0), notHelped = Number(rc?.notHelped ?? 0);
  const contacted = Number(contact?.contactedRequests ?? 0), total = Number(rc?.total ?? 0);
  res.json({
    users: { total: Number(users.total), customers: Number(users.customers), helpers: Number(users.helpers), active: Number(users.active), blocked: Number(users.blocked), newInPeriod: Number(users.newInPeriod) },
    requests: { total, active: Number(rc?.active ?? 0), completed: Number(rc?.completed ?? 0), cancelled: Number(rc?.cancelled ?? 0), newInPeriod: Number(rc?.newInPeriod ?? 0) },
    completion: { helped, notHelped, noFeedback: Number(rc?.noFeedback ?? 0), successRate: helped + notHelped ? helped / (helped + notHelped) : 0 },
    successfulValueOman: Number(rc?.value ?? 0), averageSuccessfulValueOman: Number(rc?.avgValue ?? 0),
    contacts: { contactedRequests: contacted, contactRate: total ? contacted / total : 0, averageHelpersPerRequest: total ? Number(contact?.contactedHelpers ?? 0) / total : 0, averageFirstContactMinutes: Number(contact?.averageFirstContactMinutes ?? 0), notContactedRequests: Math.max(0, total - contacted) },
    ratings: { averageStars: Number(rating?.averageStars ?? 0), totalRatings: Number(rating?.totalRatings ?? 0), helpersWithRatings: Number(rating?.helpersWithRatings ?? 0), helpersWithoutRatings: Math.max(0, Number(users.helpers) - Number(rating?.helpersWithRatings ?? 0)) },
    breakdowns: { area: areas.map((x) => ({ ...x, total: Number(x.total), successRate: Number(x.helped) + Number(x.notHelped) ? Number(x.helped) / (Number(x.helped) + Number(x.notHelped)) : 0 })), category: categories.map((x) => ({ ...x, total: Number(x.total), successRate: Number(x.helped) + Number(x.notHelped) ? Number(x.helped) / (Number(x.helped) + Number(x.notHelped)) : 0 })) },
    retention: { oneRequest, repeatCustomers, repeatRate: oneRequest + repeatCustomers ? repeatCustomers / (oneRequest + repeatCustomers) : 0 },
    period: { period, from: f.from?.toISOString() ?? null, to: f.to?.toISOString() ?? null }, filters: { areas: f.areas, category: f.category ?? null },
    meta: { currency: "OMR", activeStatuses: ACTIVE_STATUSES },
    consistency: { cancelledWithCompletionData: Number(mismatch?.cancelledWithCompletionData ?? 0), completedWithoutCompletedAt: Number(mismatch?.completedWithoutCompletedAt ?? 0), legacyMismatches: Number(mismatch?.legacyMismatches ?? 0) },
  });
});

async function adminRequestPage(req: import("express").Request, res: import("express").Response, archive: boolean): Promise<void> {
  const parsed = adminFilters(req);
  if (parsed.error || !parsed.filters) { res.status(400).json({ error: parsed.error }); return; }
  const f = parsed.filters; const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const result = typeof req.query.result === "string" ? req.query.result : undefined;
  if (archive && result && !["helped", "not_helped", "all"].includes(result)) {
    res.status(400).json({ error: "Invalid archive result" });
    return;
  }
  const commonConditions = [
    isNull(requestsTable.deletedAt),
    ...(archive
      ? [eq(requestsTable.status, "completed"), isNotNull(requestsTable.helpCompleted)]
      : [inArray(requestsTable.status, [...ACTIVE_STATUSES])]),
    ...filterConditions(f, usersTable),
  ];
  const resultConditions = archive && result === "helped"
    ? [eq(requestsTable.helpCompleted, true)]
    : archive && result === "not_helped"
      ? [eq(requestsTable.helpCompleted, false)]
      : [];
  const conditions = [...commonConditions, ...resultConditions];
  const rows = await db.select().from(requestsTable).leftJoin(usersTable, eq(usersTable.id, requestsTable.customerId)).where(and(...conditions))
    .orderBy(desc(archive ? requestsTable.completedAt : requestsTable.createdAt), desc(requestsTable.id)).limit(pageSize).offset((page - 1) * pageSize);
  const [totals] = await db.select({ total: count() }).from(requestsTable).leftJoin(usersTable, eq(usersTable.id, requestsTable.customerId)).where(and(...conditions));
  const items = await Promise.all(rows.map((row) => enrichRequest(row.requests, { includeContact: true })));
  if (!archive) res.json({ items, total: Number(totals.total), page, pageSize, activeCount: Number(totals.total) });
  else {
    const [archiveTotal] = await db.select({ count: count() }).from(requestsTable).leftJoin(usersTable, eq(usersTable.id, requestsTable.customerId)).where(and(...commonConditions));
    const [helpedRow] = await db.select({ count: count() }).from(requestsTable).leftJoin(usersTable, eq(usersTable.id, requestsTable.customerId)).where(and(...commonConditions, eq(requestsTable.helpCompleted, true)));
    const [notRow] = await db.select({ count: count() }).from(requestsTable).leftJoin(usersTable, eq(usersTable.id, requestsTable.customerId)).where(and(...commonConditions, eq(requestsTable.helpCompleted, false)));
    res.json({ items, total: Number(totals.total), helpedCount: Number(helpedRow.count), notHelpedCount: Number(notRow.count), archiveCount: Number(archiveTotal.count), page, pageSize });
  }
}
router.get("/admin/requests/active", (req, res) => void adminRequestPage(req, res, false));
router.get("/admin/requests/archive", (req, res) => void adminRequestPage(req, res, true));

export default router;
