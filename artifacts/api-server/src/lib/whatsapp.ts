import { logger } from "./logger";

const GRAPH_API_VERSION = "v20.0";
const GRAPH_API_BASE = "https://graph.facebook.com";

function maskPhone(phone: string): string {
  if (phone.length <= 6) return "***";
  return phone.slice(0, 3) + "****" + phone.slice(-3);
}

export interface WhatsAppOtpResult {
  success: boolean;
  messageId?: string;
  metaStatus?: number;
  metaResponseBody?: string;
  error?: string;
}

/**
 * Send a 6-digit OTP via the Meta Cloud API using the saedni_otp authentication template.
 * Never logs the OTP value itself.
 * Returns full Meta HTTP status and raw response body for diagnostic DB writes.
 */
export async function sendWhatsAppOtp(
  phone: string,
  otp: string,
  userType: string,
  platform = "unknown",
): Promise<WhatsAppOtpResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    logger.warn(
      { platform, maskedPhone: maskPhone(phone), userType },
      "whatsapp: env vars missing — WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set",
    );
    return { success: false, error: "WhatsApp configuration missing" };
  }

  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: "saedni_otp",
      language: { code: "ar" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: otp }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: otp }],
        },
      ],
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const metaStatus = res.status;
    const rawBody = await res.text().catch(() => "");
    let body: unknown = null;
    try { body = JSON.parse(rawBody); } catch {}

    if (res.ok) {
      const messageId =
        typeof body === "object" && body !== null && "messages" in body
          ? String(
              (
                (body as Record<string, unknown>).messages as
                  | Array<Record<string, unknown>>
                  | undefined
              )?.[0]?.id ?? "no-id",
            )
          : "no-id";

      logger.info(
        { platform, maskedPhone: maskPhone(phone), userType, httpStatus: metaStatus, messageId },
        "whatsapp: OTP sent successfully",
      );
      return { success: true, messageId, metaStatus, metaResponseBody: rawBody };
    }

    logger.warn(
      { platform, maskedPhone: maskPhone(phone), userType, httpStatus: metaStatus, metaErrorBody: rawBody },
      "whatsapp: OTP delivery failed",
    );

    const errMsg =
      typeof body === "object" && body !== null && "error" in body
        ? JSON.stringify((body as Record<string, unknown>).error)
        : `HTTP ${metaStatus}`;

    return { success: false, error: errMsg, metaStatus, metaResponseBody: rawBody };
  } catch (err) {
    logger.warn(
      { platform, maskedPhone: maskPhone(phone), userType, err },
      "whatsapp: network error sending OTP",
    );
    return { success: false, error: "Network error" };
  }
}
