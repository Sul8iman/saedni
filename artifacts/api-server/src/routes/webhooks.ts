/**
 * WhatsApp Business API webhook — captures Meta delivery status callbacks.
 *
 * Setup required in Meta Developer Console (one-time, by admin):
 *   Callback URL : https://saedni.onrender.com/api/webhooks/whatsapp
 *   Verify Token : value of WHATSAPP_WEBHOOK_VERIFY_TOKEN env var
 *   Subscriptions: messages (to get statuses: sent, delivered, read, failed)
 *
 * Delivery events are written to the otp_diagnostics table, keyed by wamid,
 * so they can be queried from the production DB after a test.
 */

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql as drizzleSql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /api/webhooks/whatsapp — Meta verification challenge
router.get("/webhooks/whatsapp", (req, res): void => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "saedni_diag_verify";

  if (mode === "subscribe" && token === verifyToken) {
    logger.info("whatsapp webhook: verification challenge accepted");
    res.status(200).send(challenge);
    return;
  }
  res.status(403).json({ error: "Verification failed" });
});

// POST /api/webhooks/whatsapp — Meta delivery status callbacks
router.post("/webhooks/whatsapp", async (req, res): Promise<void> => {
  // Always respond 200 immediately — Meta retries if we don't
  res.status(200).send("EVENT_RECEIVED");

  try {
    const body = req.body as Record<string, unknown>;
    const entries = (body?.entry as Array<Record<string, unknown>>) ?? [];

    for (const entry of entries) {
      const changes = (entry?.changes as Array<Record<string, unknown>>) ?? [];
      for (const change of changes) {
        const value = change?.value as Record<string, unknown> | undefined;
        if (!value) continue;

        const statuses = (value?.statuses as Array<Record<string, unknown>>) ?? [];
        for (const status of statuses) {
          const wamid          = String(status?.id ?? "");
          const deliveryStatus = String(status?.status ?? "");
          const errors         = (status?.errors as Array<Record<string, unknown>>) ?? [];
          const errorCode      = errors[0]?.code != null ? Number(errors[0].code) : null;
          const errorMsg       = errors[0]?.message != null ? String(errors[0].message) : null;

          logger.info(
            { wamid, deliveryStatus, errorCode, errorMsg },
            "whatsapp webhook: delivery status received",
          );

          if (!wamid) continue;

          // Write to otp_diagnostics — update the row matching this wamid
          try {
            await db.execute(drizzleSql`
              UPDATE otp_diagnostics
              SET
                delivery_status     = ${deliveryStatus},
                delivery_error_code = ${errorCode},
                delivery_error_msg  = ${errorMsg}
              WHERE meta_wamid = ${wamid}
            `);
          } catch (dbErr) {
            logger.warn({ wamid, dbErr }, "whatsapp webhook: failed to update otp_diagnostics");
          }
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, "whatsapp webhook: failed to process event");
  }
});

export default router;
