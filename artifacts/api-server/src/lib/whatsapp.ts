import { logger } from "./logger";

const GRAPH_API_VERSION = "v20.0";
const GRAPH_API_BASE = "https://graph.facebook.com";

function maskPhone(phone: string): string {
  if (phone.length <= 6) return "***";
  return phone.slice(0, 3) + "****" + phone.slice(-3);
}

/** Shows enough of the number to diagnose format issues without exposing it fully. */
function phoneFormatHint(phone: string): string {
  // e.g. "96891XXXXXX" → length=11, starts_with=968, ends_with=XXX
  return `len=${phone.length} starts=${phone.slice(0, 3)} ends=${phone.slice(-3)} hasPlus=${phone.startsWith("+")}`;
}

export interface WhatsAppOtpResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a 6-digit OTP via the Meta Cloud API using the saedni_otp authentication template.
 * Never logs the OTP value itself.
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
      { platform, maskedPhone: maskPhone(phone), phoneFormat: phoneFormatHint(phone), userType },
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

  // DIAGNOSTIC: log exactly what we send to Meta so iOS vs Android can be compared
  logger.info(
    {
      platform,
      maskedPhone: maskPhone(phone),
      phoneFormat: phoneFormatHint(phone),
      userType,
      metaUrl: url,
      metaTo: phone, // full value intentionally for one release — remove after diagnosis
    },
    "whatsapp: sending OTP to Meta API",
  );

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    // Always parse the full response body for diagnostics
    const body: unknown = await res.json().catch(() => null);

    if (res.ok) {
      // Extract message_id from Meta success response
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
        {
          platform,
          maskedPhone: maskPhone(phone),
          phoneFormat: phoneFormatHint(phone),
          userType,
          httpStatus: res.status,
          messageId,
          metaResponseBody: JSON.stringify(body),
        },
        "whatsapp: OTP sent successfully",
      );
      return { success: true, messageId };
    }

    // Failure — log the FULL Meta error body
    logger.warn(
      {
        platform,
        maskedPhone: maskPhone(phone),
        phoneFormat: phoneFormatHint(phone),
        userType,
        httpStatus: res.status,
        metaErrorBody: JSON.stringify(body),
      },
      "whatsapp: OTP delivery failed",
    );

    const errMsg =
      typeof body === "object" && body !== null && "error" in body
        ? JSON.stringify((body as Record<string, unknown>).error)
        : `HTTP ${res.status}`;

    return { success: false, error: errMsg };
  } catch (err) {
    logger.warn(
      { platform, maskedPhone: maskPhone(phone), phoneFormat: phoneFormatHint(phone), userType, err },
      "whatsapp: network error sending OTP",
    );
    return { success: false, error: "Network error" };
  }
}
