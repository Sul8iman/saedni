import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  RegisterBody,
  LoginBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Simple password hashing (in production use bcrypt - keeping simple for MVP)
function hashPassword(password: string): string {
  // Simple hash for demo - in production use bcrypt
  return Buffer.from(password + "saidni_salt_2024").toString("base64");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, phone, password, userType, area } = parsed.data;

  // Check if phone already exists
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone));

  if (existing.length > 0) {
    res.status(400).json({ error: "رقم الهاتف مسجل مسبقاً" });
    return;
  }

  const passwordHash = hashPassword(password);

  const [user] = await db
    .insert(usersTable)
    .values({ name, phone, passwordHash, userType, area })
    .returning();

  // Store session
  (req as any).session = (req as any).session || {};
  (req as any).session.userId = user.id;

  req.log.info({ userId: user.id, userType }, "User registered");

  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({ user: { ...safeUser, isVerified: user.isVerified, isBlocked: user.isBlocked } });
});

// POST /auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone));

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
    return;
  }

  if (user.isBlocked) {
    res.status(403).json({ error: "تم حظر هذا الحساب" });
    return;
  }

  req.log.info({ userId: user.id }, "User logged in");

  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// GET /auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = (req as any).session?.userId;

  if (!userId) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

// POST /auth/logout
router.post("/auth/logout", async (req, res): Promise<void> => {
  if ((req as any).session) {
    (req as any).session.userId = null;
  }
  res.json({ success: true });
});

export default router;
