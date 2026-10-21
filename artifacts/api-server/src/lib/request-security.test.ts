import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  decideRequestPermission,
  isVisibleInDefaultRequestList,
} from "./request-security.ts";
import { sanitizeLifecycleMetadata } from "./request-audit-safety.ts";
import { CompleteRequestBody } from "../../../../lib/api-zod/src/generated/api.ts";

const customer = { id: 11, userType: "customer", roles: ["customer"], isVerified: true };
const otherCustomer = { id: 12, userType: "customer", roles: ["customer"], isVerified: true };
const helper = { id: 21, userType: "helper", roles: ["helper"], isVerified: true };
const otherHelper = { id: 22, userType: "helper", roles: ["helper"], isVerified: true };
const admin = { id: 1, userType: "admin", roles: ["admin"], isVerified: true };
const dualRoleUser = {
  id: 31,
  userType: "customer",
  roles: ["customer", "helper"],
  isVerified: true,
};

const availableRequest = {
  customerId: customer.id,
  helperId: null,
  status: "available",
  deletedAt: null,
};

test("anonymous callers cannot archive a request", () => {
  const result = decideRequestPermission({ action: "archive", actor: null, request: availableRequest });
  assert.deepEqual(result, {
    allowed: false,
    status: 401,
    error: "يلزم تسجيل الدخول لإجراء هذه العملية",
  });
});

test("customers cannot act on another customer's request", () => {
  const result = decideRequestPermission({
    action: "cancel",
    actor: otherCustomer,
    request: availableRequest,
  });
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.status, 403);
});

test("only the assigned helper can advance a request", () => {
  const assignedRequest = { ...availableRequest, helperId: helper.id, status: "accepted" };
  assert.equal(
    decideRequestPermission({ action: "advance_status", actor: helper, request: assignedRequest }).allowed,
    true,
  );
  assert.equal(
    decideRequestPermission({ action: "advance_status", actor: otherHelper, request: assignedRequest }).allowed,
    false,
  );
});

test("a dual-role account retains helper authorization despite a customer primary role", () => {
  const assignedRequest = { ...availableRequest, helperId: dualRoleUser.id, status: "accepted" };
  assert.equal(
    decideRequestPermission({ action: "advance_status", actor: dualRoleUser, request: assignedRequest }).allowed,
    true,
  );
});

test("administrators can archive requests while customers cannot archive active work", () => {
  const activeRequest = { ...availableRequest, helperId: helper.id, status: "in_progress" };
  assert.equal(
    decideRequestPermission({ action: "archive", actor: admin, request: activeRequest }).allowed,
    true,
  );
  const ownerResult = decideRequestPermission({
    action: "archive",
    actor: customer,
    request: activeRequest,
  });
  assert.equal(ownerResult.allowed, false);
  if (!ownerResult.allowed) assert.equal(ownerResult.status, 400);
});

test("soft-deleted requests are hidden from default listings", () => {
  assert.equal(isVisibleInDefaultRequestList({ deletedAt: null }), true);
  assert.equal(isVisibleInDefaultRequestList({ deletedAt: new Date() }), false);
});

test("available helper visibility is independent of notification preferences and keeps customer ownership", async () => {
  const [source, areaQuerySource, adminSource] = await Promise.all([
    readFile(new URL("../routes/requests.ts", import.meta.url), "utf8"),
    readFile(new URL("./request-area-query.ts", import.meta.url), "utf8"),
    readFile(new URL("../routes/admin.ts", import.meta.url), "utf8"),
  ]);
  const listStart = source.indexOf('router.get("/requests"');
  const listEnd = source.indexOf('router.post("/requests"', listStart);
  const listRoute = source.slice(listStart, listEnd);
  assert.match(listRoute, /conditions\.push\(eq\(requestsTable\.customerId, actor\.id\)\)/);
  assert.match(listRoute, /isCustomerOwnedRequestQuery/);
  assert.match(listRoute, /availability\?\.isHelperAvailable/);
  assert.match(listRoute, /eq\(requestsTable\.isPaused, false\)/);
  assert.doesNotMatch(listRoute, /preferredAreas/);
  assert.match(listRoute, /buildRequestAreaCondition\(params\.area\)/);
  assert.doesNotMatch(listRoute, /actorVisibleRows\s*=\s*rows\.filter/);
  assert.doesNotMatch(listRoute, /helperServesArea\(helper\?\.preferredAreas, row\.area\)/);
  assert.match(areaQuerySource, /requestsTable\.fromArea/);
  assert.match(areaQuerySource, /requestsTable\.toArea/);
  assert.match(areaQuerySource, /isNull\(requestsTable\.fromArea\)/);
  assert.match(areaQuerySource, /requestsTable\.area/);
  assert.match(adminSource, /buildRequestAreaCondition\(f\.areas\)/);
});

test("helper accept and contact authorization do not depend on profile areas", async () => {
  const source = await readFile(new URL("../routes/requests.ts", import.meta.url), "utf8");
  const acceptStart = source.indexOf('router.patch("/requests/:id/accept"');
  const contactStart = source.indexOf('router.post("/requests/:id/contact"');
  const contactEnd = source.indexOf('router.get("/requests/:id/contacted-helpers"', contactStart);
  assert.ok(acceptStart >= 0 && contactStart > acceptStart && contactEnd > contactStart);
  const acceptRoute = source.slice(acceptStart, contactStart);
  const contactRoute = source.slice(contactStart, contactEnd);
  assert.doesNotMatch(acceptRoute, /helperServesArea/);
  assert.doesNotMatch(contactRoute, /helperServesArea/);
  assert.match(contactRoute, /actorHasRole\(actor, "helper"\)/);
  assert.match(contactRoute, /onConflictDoUpdate/);
});

test("pause, helper availability, and notification eligibility are enforced server-side", async () => {
  const source = await readFile(new URL("../routes/requests.ts", import.meta.url), "utf8");
  const notificationStart = source.indexOf("async function sendNewRequestNotifications");
  const notificationEnd = source.indexOf("router.get(\"/requests\"", notificationStart);
  const notifications = source.slice(notificationStart, notificationEnd);
  const pauseStart = source.indexOf("async function setRequestPaused");
  const pauseEnd = source.indexOf("router.delete(\"/requests/:id\"", pauseStart);
  const pauseRoutes = source.slice(pauseStart, pauseEnd);
  const acceptStart = source.indexOf('router.patch("/requests/:id/accept"');
  const contactStart = source.indexOf('router.post("/requests/:id/contact"');
  const contactEnd = source.indexOf('router.get("/requests/:id/contacted-helpers"', contactStart);
  const acceptRoute = source.slice(acceptStart, contactStart);
  const contactRoute = source.slice(contactStart, contactEnd);

  assert.match(notifications, /request\.status !== "available"/);
  assert.match(notifications, /request\.isPaused/);
  assert.match(notifications, /helper\.isHelperAvailable/);
  assert.match(notifications, /helperServesArea/);
  assert.match(pauseRoutes, /eq\(requestsTable\.isPaused, !isPaused\)/);
  assert.match(pauseRoutes, /action: isPaused \? "paused" : "resumed"/);
  assert.doesNotMatch(pauseRoutes, /notifiedRequestIds\.delete/);
  assert.match(acceptRoute, /existing\.isPaused/);
  assert.match(acceptRoute, /helperAvailability\?\.isHelperAvailable/);
  assert.match(contactRoute, /existing\.isPaused/);
  assert.match(contactRoute, /helper\.isHelperAvailable/);
});

test("legacy non-completion payloads remain valid and admin breakdown uses its date filter", async () => {
  const [requestSource, adminSource] = await Promise.all([
    readFile(new URL("../routes/requests.ts", import.meta.url), "utf8"),
    readFile(new URL("../routes/admin.ts", import.meta.url), "utf8"),
  ]);
  const legacyPayload = CompleteRequestBody.safeParse({ helpCompleted: false });
  assert.equal(legacyPayload.success, true);
  const invalidReasonPayload = CompleteRequestBody.safeParse({ helpCompleted: false, helpNotCompletedReason: "invalid" });
  assert.equal(invalidReasonPayload.success, false);
  const completionStart = requestSource.indexOf('router.patch("/requests/:id/complete"');
  const completionEnd = requestSource.indexOf('router.patch("/requests/:id/status"', completionStart);
  const completionRoute = requestSource.slice(completionStart, completionEnd);
  assert.equal(completionRoute.includes("helpCompleted === false && !parsed.data.helpNotCompletedReason"), false);
  assert.ok(completionRoute.includes("helpNotCompletedReason: helpCompleted === false"));
  assert.ok(completionRoute.includes("parsed.data.helpNotCompletedReason ?? null"));
  assert.match(completionRoute, /helpNotCompletedReason:/);
  assert.match(completionRoute, /helpNotCompletedComment:/);
  const reasonQueryStart = adminSource.indexOf("const notHelpedReasons =");
  const reasonQueryEnd = adminSource.indexOf("const retentionRows", reasonQueryStart);
  const reasonQuery = adminSource.slice(reasonQueryStart, reasonQueryEnd);
  assert.match(reasonQuery, /requestsTable\.helpNotCompletedReason/);
  assert.match(reasonQuery, /\.\.\.base/);
  assert.match(reasonQuery, /eq\(requestsTable\.helpCompleted, false\)/);
});

test("account deletion removes only the user and never mutates request rows", async () => {
  const [requestSource, adminSource] = await Promise.all([
    readFile(new URL("../routes/requests.ts", import.meta.url), "utf8"),
    readFile(new URL("../routes/admin.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(requestSource, /\.delete\(requestsTable\)/);
  assert.match(requestSource, /\.update\(requestsTable\)/);
  assert.match(requestSource, /soft_deleted/);
  const deleteStart = adminSource.indexOf("// DELETE /admin/users/:id/delete");
  const deleteEnd = adminSource.indexOf("// GET /admin/notifications", deleteStart);
  assert.ok(deleteStart >= 0 && deleteEnd > deleteStart);
  const deleteSource = adminSource.slice(deleteStart, deleteEnd);
  assert.match(deleteSource, /\.delete\(usersTable\)/);
  assert.match(deleteSource, /requestsTable/);
  assert.match(deleteSource, /requestContactsTable/);
  assert.match(deleteSource, /helperRatingsTable/);
  assert.doesNotMatch(deleteSource, /\.delete\(requestsTable\)/);
  assert.doesNotMatch(deleteSource, /status:\s*["']/);
  assert.match(deleteSource, /userType === "admin"/);
  assert.match(adminSource, /code === "23503"/);
  assert.match(deleteSource, /postgresForeignKeyViolation/);
  assert.match(deleteSource, /لا يمكن حذف هذا الحساب لوجود سجلات تواصل أو تقييمات مرتبطة به/);
});

test("audit metadata strips authentication secrets and OTPs", () => {
  assert.deepEqual(
    sanitizeLifecycleMetadata({
      status: "completed",
      authToken: "secret-token",
      otpCode: "123456",
      passwordHash: "hashed",
    }),
    { status: "completed" },
  );
});