import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  ListUsersQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return { ...safe, createdAt: safe.createdAt.toISOString() };
}

// GET /users
router.get("/users", async (req, res): Promise<void> => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const rows = params.userType
    ? await db.select().from(usersTable).where(eq(usersTable.userType, params.userType))
    : await db.select().from(usersTable);

  res.json(rows.map(safeUser));
});

// GET /users/:id
router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id));

  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  res.json(safeUser(user));
});

// PATCH /users/:id
router.patch("/users/:id", async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  res.json(safeUser(user));
});

export default router;
