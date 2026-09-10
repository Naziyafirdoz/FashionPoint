/**
 * Compatibility alias for already-sent Delivery Assigned emails that used
 * `/api/order-actions/mark_delivery` (underscore).
 * Reuses the hyphen route handlers — no duplicated auth/token/OTP logic.
 */
export { GET, POST } from "../mark-delivery/route";
