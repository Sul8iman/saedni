import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, usersTable, requestsTable } from "@workspace/db";
import { VerifyHelperParams, VerifyHelperBody } from "@workspace/api-zod";

const router: IRouter = Router();

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

  const { passwordHash: _, ...safeUser } = user;
  res.json({ ...safeUser, createdAt: safeUser.createdAt.toISOString() });
});

export default router;
