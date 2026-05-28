import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  RegisterBody,
  LoginBody,
  ForgotPasswordBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return Buffer.from(password + "saidni_salt_2024").toString("base64");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, phone, password, userType } = parsed.data;

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
    .values({ name, phone, passwordHash, userType })
    .returning();

  (req as any).session = (req as any).session || {};
  (req as any).session.userId = user.id;

  req.log.info({ userId: user.id, userType }, "User registered");

  res.status(201).json({ user: safeUser(user) });
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
    res.status(403).json({ error: "تم تعطيل حسابك، يرجى التواصل مع الإدارة" });
    return;
  }

  // Update lastLogin
  const [updated] = await db
    .update(usersTable)
    .set({ lastLogin: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();

  req.log.info({ userId: user.id }, "User logged in");

  res.json({ user: safeUser(updated) });
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

  res.json(safeUser(user));
});

// POST /auth/logout
router.post("/auth/logout", async (req, res): Promise<void> => {
  if ((req as any).session) {
    (req as any).session.userId = null;
  }
  res.json({ success: true });
});

// POST /auth/forgot-password
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone));

  if (!user) {
    res.status(404).json({ error: "رقم الهاتف غير مسجل" });
    return;
  }

  const otp = generateOtp();

  await db
    .update(usersTable)
    .set({ otpCode: otp, otpCreatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  req.log.info({ userId: user.id }, "OTP generated for password reset");

  // In MVP: OTP is stored in DB and shown to admin. No real SMS.
  res.json({ success: true });
});

export default router;
