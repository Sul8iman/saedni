import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, requestsTable, usersTable } from "@workspace/db";
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
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichRequest(req: typeof requestsTable.$inferSelect) {
  const ids = [req.customerId, req.helperId].filter(Boolean) as number[];
  const users =
    ids.length > 0
      ? await db
          .select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone })
          .from(usersTable)
          .where(inArray(usersTable.id, ids))
      : [];

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return {
    ...req,
    createdAt: req.createdAt.toISOString(),
    customerName: userMap[req.customerId]?.name ?? null,
    customerPhone: userMap[req.customerId]?.phone ?? null,
    helperName: req.helperId ? (userMap[req.helperId]?.name ?? null) : null,
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

  const [row] = await db
    .insert(requestsTable)
    .values({ ...parsed.data, status: "available" })
    .returning();

  const enriched = await enrichRequest(row);
  res.status(201).json(enriched);
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

// PATCH /requests/:id/accept
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

// PATCH /requests/:id/cancel
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
