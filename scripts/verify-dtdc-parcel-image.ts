import assert from "node:assert/strict";
import { FULFILLMENT_META_KEY } from "../src/lib/orders/rapido-delivery-metadata.ts";
import { validateDtdcParcelImageUpload } from "../src/lib/orders/dtdc-parcel-image.ts";
import {
  buildShippingAddressWithDtdcParcel,
  getDtdcParcelDetails,
  hasSavedDtdcParcelImage,
  isCloudinaryHttpsImageUrl
} from "../src/lib/orders/dtdc-parcel-metadata.ts";
import { isLocalFulfillmentOrder } from "../src/lib/orders/fulfillment-workflow.ts";

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50
]);
const gif = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>");

assert.equal(validateDtdcParcelImageUpload({
  fileName: "parcel.jpg",
  mimeType: "image/jpeg",
  sizeBytes: jpeg.length,
  bytes: jpeg
}).ok, true);

assert.equal(validateDtdcParcelImageUpload({
  fileName: "parcel.png",
  mimeType: "image/png",
  sizeBytes: png.length,
  bytes: png
}).ok, true);

assert.equal(validateDtdcParcelImageUpload({
  fileName: "parcel.webp",
  mimeType: "image/webp",
  sizeBytes: webp.length,
  bytes: webp
}).ok, true);

assert.equal(validateDtdcParcelImageUpload({
  fileName: "label.pdf",
  mimeType: "application/pdf",
  sizeBytes: pdf.length,
  bytes: pdf
}).ok, false);

assert.equal(validateDtdcParcelImageUpload({
  fileName: "anim.gif",
  mimeType: "image/gif",
  sizeBytes: gif.length,
  bytes: gif
}).ok, false);

assert.equal(validateDtdcParcelImageUpload({
  fileName: "icon.svg",
  mimeType: "image/svg+xml",
  sizeBytes: svg.length,
  bytes: svg
}).ok, false);

assert.equal(validateDtdcParcelImageUpload({
  fileName: "huge.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 10 * 1024 * 1024 + 1,
  bytes: jpeg
}).ok, false);

assert.equal(isCloudinaryHttpsImageUrl("https://res.cloudinary.com/demo/image/upload/v1/fashionpoint/dtdc/a.jpg"), true);
assert.equal(isCloudinaryHttpsImageUrl("data:image/jpeg;base64,aaaa"), false);
assert.equal(isCloudinaryHttpsImageUrl("blob:https://example.com/1"), false);
assert.equal(isCloudinaryHttpsImageUrl("http://res.cloudinary.com/demo/image/upload/a.jpg"), false);
assert.equal(isCloudinaryHttpsImageUrl("https://localhost/photo.jpg"), false);

const merged = buildShippingAddressWithDtdcParcel(
  {
    city: "Hyderabad",
    [FULFILLMENT_META_KEY]: {
      rapido_delivery: { courier_name: "Rapido Parcel", rider_name: "Ravi" }
    }
  },
  {
    image_url: "https://res.cloudinary.com/demo/image/upload/v1/fashionpoint/dtdc/b.jpg",
    uploaded_at: "2026-08-20T12:00:00.000Z"
  }
);

const meta = merged[FULFILLMENT_META_KEY] as {
  rapido_delivery?: { rider_name?: string };
  dtdc_parcel?: { image_url?: string };
};
assert.equal(meta.rapido_delivery?.rider_name, "Ravi");
assert.equal(meta.dtdc_parcel?.image_url?.startsWith("https://res.cloudinary.com/"), true);

const order = { shipping_address: merged as never };
assert.equal(hasSavedDtdcParcelImage(order), true);
assert.equal(getDtdcParcelDetails(order)?.image_url.includes("dtdc/b.jpg"), true);

assert.equal(isLocalFulfillmentOrder({ fulfillment_zone: "local" }), true);
assert.equal(isLocalFulfillmentOrder({ fulfillment_zone: "outstation" }), false);
assert.equal(isLocalFulfillmentOrder({ fulfillment_zone: null }), false);
assert.equal(isLocalFulfillmentOrder({}), false);

console.log("dtdc parcel image checks passed");
