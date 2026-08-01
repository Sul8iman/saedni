import { Router, type IRouter } from "express";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import { db, requestsTable, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  CreateRequestBody,
  UpdateRequestBody,
  UpdateRequestParams,
  GetRequestParams,
  DeleteRequestParams,
  AcceptRequestBody,
  AcceptRequestParams,
  CancelRequestParams,
  ListRequestsQueryParams,
  UpdateRequestStatusBody,
  UpdateRequestStatusParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── Arabic category labels for push notification body ────────────────────────
const CATEGORY_AR: Record<string, string> = {
  transport:     "نقل وتحميل",
  delivery:      "مشاوير وتوصيل",
  government:    "معاملات ومراجعات",
  shopping:      "شراء أغراض",
  home_services: "خدمات منزلية",
  labor:         "أخرى",
};

// ── Idempotency guard — prevents double-dispatch for the same requestId ───────
// In-memory; intentionally resets on server restart (each request is new after restart).
const notifiedRequestIds = new Set<number>();

// ── Send push notifications to matching active helpers ───────────────────────
async function sendNewRequestNotifications(
  requestId: number,
  category: string,
  area: string,
): Promise<void> {
  // Idempotency: skip if already dispatched for this requestId
  if (notifiedRequestIds.has(requestId)) {
    logger.warn({ requestId }, "push: duplicate call suppressed by idempotency guard");
    return;
  }
  notifiedRequestIds.add(requestId);

  try {
    const rows = await db
      .select({
        id:              usersTable.id,
        userType:        usersTable.userType,
        roles:           usersTable.roles,
        expoPushToken:   usersTable.expoPushToken,
        helperInterests: usersTable.helperInterests,
        preferredAreas:  usersTable.preferredAreas,
      })
      .from(usersTable)
      .where(and(eq(usersTable.isBlocked, false), isNotNull(usersTable.expoPushToken)));

    const catLabel = CATEGORY_AR[category] ?? category;

    // Deduplicate by expo_push_token — same physical device may be registered
    // under multiple user accounts; only send one notification per unique token.
    const seenTokens = new Set<string>();
    let matchedHelpers = 0;

    for (const h of rows) {
      // Must carry the helper role
      let roles: string[];
      try { roles = h.roles ? JSON.parse(h.roles) : [h.userType]; } catch { roles = [h.userType]; }
      if (!roles.includes("helper")) continue;

      // Category filter (only if helper has stored interests)
      if (h.helperInterests) {
        try {
          const interests: string[] = JSON.parse(h.helperInterests);
          if (interests.length > 0 && !interests.includes(category)) continue;
        } catch {}
      }

      // Area filter (only if helper has stored preferred areas)
      if (h.preferredAreas) {
        try {
          const areas: string[] = JSON.parse(h.preferredAreas);
          if (areas.length > 0 && !areas.includes(area)) continue;
        } catch {}
      }

      matchedHelpers++;
      if (h.expoPushToken) seenTokens.add(h.expoPushToken);
    }

    const uniqueTokens = [...seenTokens];

    logger.info(
      { requestId, category, area, matchedHelpers, uniqueTokens: uniqueTokens.length },
      "push: dispatching new-request notifications",
    );

    if (uniqueTokens.length === 0) return;

    const messages = uniqueTokens.map(to => ({
      to,
      title: "طلب جديد متاح",
      body:  `طلب جديد في ${area}\n${catLabel}`,
      data:  { type: "new_request", requestId, category, area },
      sound: "default",
    }));

    // Expo push API allows max 100 messages per batch
    let sentCount = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(batch),
      });
      const json = await res.json().catch(() => null);
      sentCount += batch.length;
      logger.info({ requestId, batchStart: i, batchSize: batch.length, status: res.status, response: json }, "push: expo batch sent");
    }

    logger.info({ requestId, matchedHelpers, uniqueTokens: uniqueTokens.length, sentCount }, "push: dispatch complete");
  } catch (err) {
    logger.warn({ requestId, err }, "push: notification dispatch failed");
  }
}

async function enrichRequest(req: typeof requestsTable.$inferSelect) {
  const ids = [req.customerId, req.helperId].filter(Boolean) as number[];
  const users =
    ids.length > 0
      ? await db
          .select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone })
          .from(usersTable)
          .where(inArray(usersTable.id, ids))
      : [];

  const userMap = Object.fromEntries(users.map((u: typeof users[number]) => [u.id, u]));

  return {
    ...req,
    createdAt: req.createdAt.toISOString(),
    completedAt: req.completedAt?.toISOString() ?? null,
    customerName: userMap[req.customerId]?.name ?? null,
    customerPhone: userMap[req.customerId]?.phone ?? null,
    helperName: req.helperId ? (userMap[req.helperId]?.name ?? null) : null,
    helperPhone: req.helperId ? (userMap[req.helperId]?.phone ?? null) : null,
  };
}

// GET /requests
router.get("/requests", async (req, res): Promise<void> => {
  const parsed = ListRequestsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const conditions = [];
  if (params.category) conditions.push(eq(requestsTable.category, params.category));
  if (params.area) conditions.push(eq(requestsTable.area, params.area));
  if (params.status) conditions.push(eq(requestsTable.status, params.status));
  if (params.customerId) conditions.push(eq(requestsTable.customerId, Number(params.customerId)));
  if (params.helperId) conditions.push(eq(requestsTable.helperId, Number(params.helperId)));

  const rows =
    conditions.length > 0
      ? await db.select().from(requestsTable).where(and(...conditions)).orderBy(requestsTable.createdAt)
      : await db.select().from(requestsTable).orderBy(requestsTable.createdAt);

  const enriched = await Promise.all(rows.map(enrichRequest));
  res.json(enriched);
});

// POST /requests
router.post("/requests", async (req, res): Promise<void> => {
  const parsed = CreateRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [customer] = await db
    .select({ isBlocked: usersTable.isBlocked })
    .from(usersTable)
    .where(eq(usersTable.id, parsed.data.customerId));

  if (!customer) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  if (customer.isBlocked) {
    res.status(403).json({ error: "تم تعطيل حسابك، يرجى التواصل مع الإدارة" });
    return;
  }

  const [row] = await db
    .insert(requestsTable)
    .values({ ...parsed.data, status: "available" })
    .returning();

  const enriched = await enrichRequest(row);
  res.status(201).json(enriched);

  // Fire push notifications asynchronously — never block the response
  sendNewRequestNotifications(row.id, row.category, row.area).catch(() => {});
});

// GET /requests/:id
router.get("/requests/:id", async (req, res): Promise<void> => {
  const params = GetRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }

  res.json(await enrichRequest(row));
});

// PATCH /requests/:id
router.patch("/requests/:id", async (req, res): Promise<void> => {
  const params = UpdateRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .update(requestsTable)
    .set(parsed.data)
    .where(eq(requestsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }

  res.json(await enrichRequest(row));
});

// DELETE /requests/:id
router.delete("/requests/:id", async (req, res): Promise<void> => {
  const params = DeleteRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(requestsTable)
    .where(eq(requestsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }

  res.sendStatus(204);
});

// PATCH /requests/:id/status — helper advances status
router.patch("/requests/:id/status", async (req, res): Promise<void> => {
  const params = UpdateRequestStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRequestStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }

  const allowed: Record<string, string[]> = {
    accepted: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
  };
  if (!allowed[existing.status]?.includes(parsed.data.status)) {
    res.status(400).json({ error: "تحويل الحالة غير مسموح" });
    return;
  }

  const [row] = await db
    .update(requestsTable)
    .set({ status: parsed.data.status })
    .where(eq(requestsTable.id, params.data.id))
    .returning();

  res.json(await enrichRequest(row));
});

// PATCH /requests/:id/accept — helper accepts an available request
router.patch("/requests/:id/accept", async (req, res): Promise<void> => {
  const params = AcceptRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AcceptRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }

  if (existing.status !== "available") {
    res.status(400).json({ error: "هذا الطلب غير متاح للقبول" });
    return;
  }

  const [row] = await db
    .update(requestsTable)
    .set({ helperId: parsed.data.helperId, status: "accepted" })
    .where(eq(requestsTable.id, params.data.id))
    .returning();

  res.json(await enrichRequest(row));
});

// PATCH /requests/:id/complete — customer ends request, with optional help feedback
router.patch("/requests/:id/complete", async (req, res): Promise<void> => {
  const params = CancelRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }

  // Accept optional helpCompleted boolean from request body
  const rawBody = req.body as Record<string, unknown> | undefined;
  const helpCompleted: boolean | null =
    rawBody && typeof rawBody.helpCompleted === "boolean" ? rawBody.helpCompleted : null;

  const [row] = await db
    .update(requestsTable)
    .set({
      status: "completed",
      completedAt: new Date(),
      ...(helpCompleted !== null ? { helpCompleted } : {}),
    })
    .where(eq(requestsTable.id, params.data.id))
    .returning();

  res.json(await enrichRequest(row));
});

// PATCH /requests/:id/cancel — customer cancels a request
router.patch("/requests/:id/cancel", async (req, res): Promise<void> => {
  const params = CancelRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }

  const [row] = await db
    .update(requestsTable)
    .set({ status: "cancelled" })
    .where(eq(requestsTable.id, params.data.id))
    .returning();

  res.json(await enrichRequest(row));
});

export default router;
