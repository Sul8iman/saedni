const OMAN_COUNTRY_CODE = "968";
const OMAN_LOCAL_LENGTH = 8;

/**
 * Return the canonical Oman phone representation used for new writes and
 * provider calls. Historical values are matched by compacting their digits
 * during lookup; this function never rewrites an existing database value.
 */
export function normalizeOmanPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let localNumber = digits;

  if (digits.startsWith("00968")) {
    localNumber = digits.slice(5);
  } else if (digits.startsWith(OMAN_COUNTRY_CODE)) {
    localNumber = digits.slice(OMAN_COUNTRY_CODE.length);
  }

  if (localNumber.length !== OMAN_LOCAL_LENGTH) return null;
  return `${OMAN_COUNTRY_CODE}${localNumber}`;
}
