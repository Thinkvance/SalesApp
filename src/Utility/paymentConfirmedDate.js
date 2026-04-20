import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const DISPLAY_FORMAT = "DD-MM-YYYY h:mm:ss A";

// Legacy records stored a string like "18-04-2026 11:06:11 AM".
// New records store a Firebase Timestamp ({seconds, nanoseconds} or a Timestamp instance).
// This helper accepts either and returns a Date, or null if unparseable.
export function parsePaymentConfirmedDate(value) {
  if (value == null || value === "") return null;

  if (typeof value === "object") {
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    return null;
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = dayjs(trimmed, DISPLAY_FORMAT, true);
    if (parsed.isValid()) return parsed.toDate();
    const native = new Date(trimmed);
    return isNaN(native.getTime()) ? null : native;
  }

  return null;
}

export function paymentConfirmedDateMs(value) {
  const date = parsePaymentConfirmedDate(value);
  return date ? date.getTime() : 0;
}

export function formatPaymentConfirmedDate(value) {
  const date = parsePaymentConfirmedDate(value);
  if (!date) return "";
  return dayjs(date).format(DISPLAY_FORMAT);
}
