import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  decideRequestPermission,
  isVisibleInDefaultRequestList,
} from "./request-security.ts";
import { sanitizeLifecycleMetadata } from "./request-audit-safety.ts";

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

test("request visibility uses customer ownership and keeps helper areas out of default access", async () => {
  const source = await readFile(new URL("../routes/requests.ts", import.meta.url), "utf8");
  const listStart = source.indexOf('router.get("/requests"');
  const listEnd = source.indexOf('router.post("/requests"', listStart);
  const listRoute = source.slice(listStart, listEnd);
  assert.match(listRoute, /conditions\.push\(eq\(requestsTable\.customerId, actor\.id\)\)/);
  assert.match(listRoute, /isCustomerOwnedRequestQuery/);
  assert.match(listRoute, /inArray\(requestsTable\.area, params\.area\)/);
  assert.doesNotMatch(listRoute, /actorVisibleRows\s*=\s*rows\.filter/);
  assert.doesNotMatch(listRoute, /helperServesArea\(helper\?\.preferredAreas, row\.area\)/);
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