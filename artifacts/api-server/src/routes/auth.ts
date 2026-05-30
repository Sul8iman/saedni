import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, adminNotificationsTable } from "@workspace/db";
import { RegisterBody, LoginBody, VerifyOtpBody, AdminLoginBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

const ADMIN_PHONE = "98584898";
const ADMIN_PIN   = "2724";

function generate4DigitOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
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

async function createOtpNotification(opts: {
  userId?: number;
  userName?: string;
  phone: string;
  userType?: string;
}) {
  try {
    await db.insert(adminNotificationsTable).values({
      type: "otp_request",
      title: "طلب رمز تحقق جديد",
      userId: opts.userId ?? null,
      userName: opts.userName ?? null,
      phone: opts.phone,
      userType: opts.userType ?? null,
      isRead: false,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create OTP notification");
  }
}

// POST /auth/register — creates account (inactive+unverified), generates OTP, does NOT log in
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, phone, userType } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (existing.length > 0) {
    res.status(400).json({ error: "رقم الهاتف مسجل مسبقاً" });
    return;
  }

  const otp = generate4DigitOtp();

  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      phone,
      passwordHash: "",
      userType,
      isVerified: false,
      isBlocked: false,
      otpCode: otp,
      otpCreatedAt: new Date(),
    })
    .returning();

  req.log.info({ userId: user.id, userType }, "User registered (unverified)");

  // Create admin notification for OTP request
  await createOtpNotification({ userId: user.id, userName: name, phone, userType });

  res.status(201).json({
    message: "تم إنشاء الحساب. يرجى التواصل مع الإدارة للحصول على رمز التحقق",
    otp,
    isVerified: false,
  });
});

// POST /auth/login — generates OTP for regular users; signals admin-PIN flow for admin phone
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone } = parsed.data;

  // Admin phone → skip OTP, signal the frontend to show PIN field
  if (phone === ADMIN_PHONE) {
    res.json({
      message: "أدخل رمز المدير للمتابعة",
      isAdmin: true,
    });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (!user) {
    res.status(404).json({ error: "رقم الهاتف غير مسجل" });
    return;
  }

  // Blocked users cannot even request OTP (unless unverified — they need to verify first)
  if (user.isBlocked && user.isVerified) {
    res.status(403).json({ error: "تم تعطيل حسابك، يرجى التواصل مع الإدارة" });
    return;
  }

  const otp = generate4DigitOtp();

  await db
    .update(usersTable)
    .set({ otpCode: otp, otpCreatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  req.log.info({ userId: user.id, isVerified: user.isVerified }, "OTP generated");

  // Create admin notification for OTP request
  await createOtpNotification({ userId: user.id, userName: user.name, phone, userType: user.userType });

  res.json({
    message: user.isVerified
      ? "تم إنشاء رمز تحقق، يرجى التواصل مع الإدارة للحصول عليه"
      : "حسابك غير مفعل. يرجى إدخال رمز التحقق من الإدارة",
    otp,
    isVerified: user.isVerified,
  });
});

// POST /auth/admin-login — validates admin phone + PIN, creates session directly
router.post("/auth/admin-login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, pin } = parsed.data;

  if (phone !== ADMIN_PHONE) {
    res.status(404).json({ error: "رقم الهاتف غير مسجل" });
    return;
  }

  if (pin !== ADMIN_PIN) {
    res.status(403).json({ error: "رمز المدير غير صحيح" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (!user) {
    res.status(404).json({ error: "رقم الهاتف غير مسجل" });
    return;
  }

  // Always enforce admin role, active state, and verified on PIN login
  const [updated] = await db
    .update(usersTable)
    .set({ userType: "admin", isBlocked: false, isVerified: true, lastLogin: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();

  (req as any).session = (req as any).session || {};
  (req as any).session.userId = updated.id;

  req.log.info({ userId: updated.id }, "Admin logged in via PIN");

  res.json({ user: safeUser(updated) });
});

// POST /auth/verify-otp — validate OTP; activates account if first-time verification
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, otp } = parsed.data;

  // Admin phone must log in via PIN only — never via OTP
  if (phone === ADMIN_PHONE) {
    res.status(403).json({ error: "يرجى استخدام رمز المدير للدخول" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (!user) {
    res.status(404).json({ error: "رقم الهاتف غير مسجل" });
    return;
  }

  // Blocked verified users cannot log in
  if (user.isBlocked && user.isVerified) {
    res.status(403).json({ error: "تم تعطيل حسابك، يرجى التواصل مع الإدارة" });
    return;
  }

  if (!user.otpCode || user.otpCode !== otp) {
    res.status(400).json({ error: "رمز التحقق غير صحيح" });
    return;
  }

  if (!user.otpCreatedAt || Date.now() - user.otpCreatedAt.getTime() > OTP_EXPIRY_MS) {
    res.status(400).json({ error: "انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد من الإدارة" });
    return;
  }

  // First-time verification: activate the account
  const updates: Partial<typeof usersTable.$inferInsert> = {
    otpCode: null,
    otpCreatedAt: null,
    lastLogin: new Date(),
  };
  if (!user.isVerified) {
    updates.isVerified = true;
    updates.isBlocked = false; // ensure active
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, user.id))
    .returning();

  (req as any).session = (req as any).session || {};
  (req as any).session.userId = user.id;

  req.log.info({ userId: user.id, wasVerified: user.isVerified }, "User logged in via OTP");

  res.json({ user: safeUser(updated) });
});

// GET /auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = (req as any).session?.userId;
  if (!userId) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
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

export default router;
