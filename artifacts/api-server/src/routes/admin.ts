import { Router, type IRouter } from "express";
import { eq, count, desc } from "drizzle-orm";
import { db, usersTable, requestsTable, adminNotificationsTable } from "@workspace/db";
import { VerifyHelperParams, VerifyHelperBody, DeleteUserParams } from "@workspace/api-zod";

const router: IRouter = Router();

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return {
    ...safe,
    isActive: !safe.isBlocked,
    createdAt: safe.createdAt.toISOString(),
    lastLogin: safe.lastLogin?.toISOString() ?? null,
    otpCreatedAt: safe.otpCreatedAt?.toISOString() ?? null,
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
  const [totalRequestsResult] = await db.select({ count: count() }).from(requestsTable);
  const [activeRequestsResult] = await db
    .select({ count: count() })
    .from(requestsTable)
    .where(eq(requestsTable.status, "available"));
  const [completedRequestsResult] = await db
    .select({ count: count() })
    .from(requestsTable)
    .where(eq(requestsTable.status, "completed"));
  const [cancelledRequestsResult] = await db
    .select({ count: count() })
    .from(requestsTable)
    .where(eq(requestsTable.status, "cancelled"));

  res.json({
    totalUsers: totalUsersResult.count,
    totalHelpers: totalHelpersResult.count,
    totalCustomers: totalCustomersResult.count,
    totalRequests: totalRequestsResult.count,
    activeRequests: activeRequestsResult.count,
    completedRequests: completedRequestsResult.count,
    cancelledRequests: cancelledRequestsResult.count,
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
      : { isBlocked: true, isVerified: false };

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

// DELETE /admin/users/:id/delete
router.delete("/admin/users/:id/delete", async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Prevent admin from deleting themselves
  const currentUserId = (req as any).session?.userId;
  if (currentUserId === params.data.id) {
    res.status(403).json({ error: "لا يمكنك حذف حساب المدير" });
    return;
  }

  // Cascade: delete all requests created by this user
  await db.delete(requestsTable).where(eq(requestsTable.customerId, params.data.id));

  const [user] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  res.sendStatus(204);
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

export default router;
