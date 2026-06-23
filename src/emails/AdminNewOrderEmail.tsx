import * as React from "react";

const MAROON = "#7B0D2B";
const BORDER = "#F3D7DF";
const PAGE_BG = "#FFF8FA";
const TEXT = "#1A1A1A";
const MUTED = "#6B6B6B";
const GOLD = "#B8860B";
const FONT = "Arial, Helvetica, sans-serif";

export type AdminNewOrderEmailProps = {
  preheader: string;
  orderId: string;
  paymentMethod: string;
  paymentStatusPaid: boolean;
  totalAmount: string;
  product: {
    name: string;
    size: string;
    color: string;
    quantity: number;
    price: string;
  } | null;
  extraProductCount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddressText: string;
  approveUrl: string;
  dashboardUrl: string;
};

function cardTable(marginBottom = "16px") {
  return {
    marginBottom,
    backgroundColor: "#FFFFFF",
    border: `1px solid ${BORDER}`,
    borderRadius: "12px"
  } as const;
}

function cardTitle(icon: string, title: string) {
  return (
    <p
      style={{
        margin: "0 0 14px",
        fontSize: "12px",
        fontWeight: 700,
        color: GOLD,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        fontFamily: FONT
      }}
    >
      {icon} {title}
    </p>
  );
}

function columnLabel(text: string) {
  return (
    <p
      style={{
        margin: "0 0 6px",
        fontSize: "10px",
        fontWeight: 700,
        color: MUTED,
        textTransform: "uppercase",
        letterSpacing: "0.4px",
        fontFamily: FONT
      }}
    >
      {text}
    </p>
  );
}

export function AdminNewOrderEmail({
  preheader,
  orderId,
  paymentMethod,
  paymentStatusPaid,
  totalAmount,
  product,
  extraProductCount,
  customerName,
  customerPhone,
  customerEmail,
  shippingAddressText,
  approveUrl,
  dashboardUrl
}: AdminNewOrderEmailProps) {
  const paidBadge = paymentStatusPaid ? (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        backgroundColor: "#E8F5E9",
        color: "#1B5E20",
        fontSize: "10px",
        fontWeight: 700,
        borderRadius: "999px",
        letterSpacing: "0.3px",
        fontFamily: FONT
      }}
    >
      PAID
    </span>
  ) : (
    <span style={{ fontSize: "13px", fontWeight: 600, color: TEXT, fontFamily: FONT }}>—</span>
  );

  const shippingLines = shippingAddressText.split("\n").filter(Boolean);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>New Order Alert</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `@media only screen and (max-width:620px){.fp-col,.fp-customer-col{display:block!important;width:100%!important;max-width:100%!important;border-right:none!important;border-bottom:1px solid ${BORDER}!important;text-align:left!important;padding:10px 12px!important;}.fp-col-last,.fp-customer-col-last{border-bottom:none!important;}.fp-btn{display:block!important;width:100%!important;padding:6px 0!important;}}`
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: PAGE_BG, fontFamily: FONT, color: TEXT }}>
        <div style={{ display: "none", overflow: "hidden", lineHeight: "1px", opacity: 0, maxHeight: 0, maxWidth: 0 }}>
          {preheader}
        </div>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ backgroundColor: PAGE_BG }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "20px 10px" }}>
                <table
                  role="presentation"
                  width="600"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{ width: "100%", maxWidth: "600px", backgroundColor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "14px" }}
                >
                  <tbody>
                    <tr>
                      <td align="center" style={{ backgroundColor: MAROON, padding: "22px 18px", borderRadius: "14px 14px 0 0" }}>
                        <p style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#FFFFFF", fontFamily: FONT }}>Fashion Point</p>
                        <p style={{ margin: "8px 0 0", fontSize: "12px", fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.6px", textTransform: "uppercase", fontFamily: FONT }}>
                          🔔 New Paid Order Received
                        </p>
                        <p style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: "1.45", color: "#FFFFFF", fontFamily: FONT }}>
                          Please review and approve this order.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "20px 18px", backgroundColor: "#FFFFFF" }}>
                        <p style={{ margin: "0 0 10px", fontSize: "14px", lineHeight: "1.55", fontFamily: FONT }}>Hello Admin,</p>
                        <p style={{ margin: "0 0 10px", fontSize: "14px", lineHeight: "1.55", fontFamily: FONT }}>
                          A new order has been placed and payment is successfully received.
                        </p>
                        <p style={{ margin: "0 0 18px", fontSize: "14px", lineHeight: "1.55", fontFamily: FONT }}>
                          Please review and approve this order as soon as possible.
                        </p>

                        {/* Order Summary */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={cardTable()}>
                          <tbody>
                            <tr>
                              <td style={{ padding: "16px" }}>
                                {cardTitle("📋", "Order Summary")}
                                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
                                  <tbody>
                                    <tr>
                                      <td className="fp-col" width="25%" valign="top" style={{ padding: "8px 6px", textAlign: "center", borderRight: `1px solid ${BORDER}` }}>
                                        {columnLabel("Order ID")}
                                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, fontFamily: FONT }}>{orderId}</p>
                                      </td>
                                      <td className="fp-col" width="25%" valign="top" style={{ padding: "8px 6px", textAlign: "center", borderRight: `1px solid ${BORDER}` }}>
                                        {columnLabel("Payment Method")}
                                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, fontFamily: FONT }}>{paymentMethod}</p>
                                      </td>
                                      <td className="fp-col" width="25%" valign="top" style={{ padding: "8px 6px", textAlign: "center", borderRight: `1px solid ${BORDER}` }}>
                                        {columnLabel("Payment Status")}
                                        {paidBadge}
                                      </td>
                                      <td className="fp-col fp-col-last" width="25%" valign="top" style={{ padding: "8px 6px", textAlign: "center" }}>
                                        {columnLabel("Total Amount")}
                                        <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: MAROON, fontFamily: FONT }}>{totalAmount}</p>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Product Details — no image */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={cardTable()}>
                          <tbody>
                            <tr>
                              <td style={{ padding: "16px" }}>
                                {cardTitle("📦", "Product Details")}
                                {product ? (
                                  <>
                                    <p style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, lineHeight: "1.4", fontFamily: FONT }}>{product.name}</p>
                                    <p style={{ margin: "0 0 4px", fontSize: "13px", lineHeight: "1.5", color: MUTED, fontFamily: FONT }}>Size : {product.size}</p>
                                    <p style={{ margin: "0 0 4px", fontSize: "13px", lineHeight: "1.5", color: MUTED, fontFamily: FONT }}>Color : {product.color}</p>
                                    <p style={{ margin: "0 0 4px", fontSize: "13px", lineHeight: "1.5", color: MUTED, fontFamily: FONT }}>Qty : {product.quantity}</p>
                                    <p style={{ margin: "6px 0 0", fontSize: "14px", fontWeight: 700, color: MAROON, fontFamily: FONT }}>Price : {product.price}</p>
                                    {extraProductCount > 0 ? (
                                      <p style={{ margin: "10px 0 0", fontSize: "12px", color: MUTED, fontFamily: FONT }}>
                                        + {extraProductCount} more item{extraProductCount > 1 ? "s" : ""} in dashboard
                                      </p>
                                    ) : null}
                                  </>
                                ) : (
                                  <p style={{ margin: 0, fontSize: "13px", color: MUTED, fontFamily: FONT }}>No items on this order.</p>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Customer Details — 3 columns */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={cardTable()}>
                          <tbody>
                            <tr>
                              <td style={{ padding: "16px" }}>
                                {cardTitle("👤", "Customer Details")}
                                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
                                  <tbody>
                                    <tr>
                                      <td className="fp-customer-col" width="33%" valign="top" style={{ padding: "8px 6px", textAlign: "center", borderRight: `1px solid ${BORDER}` }}>
                                        {columnLabel("Name")}
                                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, lineHeight: "1.45", fontFamily: FONT }}>{customerName}</p>
                                      </td>
                                      <td className="fp-customer-col" width="33%" valign="top" style={{ padding: "8px 6px", textAlign: "center", borderRight: `1px solid ${BORDER}` }}>
                                        {columnLabel("Phone")}
                                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, lineHeight: "1.45", fontFamily: FONT }}>{customerPhone}</p>
                                      </td>
                                      <td className="fp-customer-col fp-customer-col-last" width="34%" valign="top" style={{ padding: "8px 6px", textAlign: "center" }}>
                                        {columnLabel("Email")}
                                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, lineHeight: "1.45", wordBreak: "break-word", fontFamily: FONT }}>{customerEmail}</p>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Shipping Address */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={cardTable("18px")}>
                          <tbody>
                            <tr>
                              <td style={{ padding: "16px" }}>
                                {cardTitle("📍", "Shipping Address")}
                                {shippingLines.length > 0 ? (
                                  shippingLines.map((line, index) => (
                                    <p
                                      key={`${line}-${index}`}
                                      style={{
                                        margin: index === 0 ? 0 : "4px 0 0",
                                        fontSize: "14px",
                                        lineHeight: "1.55",
                                        fontFamily: FONT,
                                        color: TEXT
                                      }}
                                    >
                                      {line}
                                    </p>
                                  ))
                                ) : (
                                  <p style={{ margin: 0, fontSize: "14px", color: MUTED, fontFamily: FONT }}>—</p>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Buttons */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
                          <tbody>
                            <tr>
                              <td width="50%" align="center" className="fp-btn" style={{ padding: "0 5px 0 0" }}>
                                <a
                                  href={approveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "block",
                                    height: "50px",
                                    lineHeight: "50px",
                                    backgroundColor: MAROON,
                                    color: "#FFFFFF",
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    textDecoration: "none",
                                    borderRadius: "10px",
                                    textAlign: "center",
                                    fontFamily: FONT
                                  }}
                                >
                                  ✔ Approve Order
                                </a>
                              </td>
                              <td width="50%" align="center" className="fp-btn" style={{ padding: "0 0 0 5px" }}>
                                <a
                                  href={dashboardUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "block",
                                    height: "50px",
                                    lineHeight: "50px",
                                    backgroundColor: "#FFFFFF",
                                    color: MAROON,
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    borderRadius: "10px",
                                    textAlign: "center",
                                    border: `1px solid ${MAROON}`,
                                    fontFamily: FONT
                                  }}
                                >
                                  Open Dashboard
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style={{ padding: "20px 18px", borderTop: `1px solid ${BORDER}`, backgroundColor: "#FFFFFF", borderRadius: "0 0 14px 14px" }}>
                        <p style={{ margin: "0 0 6px", fontSize: "13px", color: MAROON, fontWeight: 600, fontFamily: FONT }}>
                          ❤ Thank you for managing orders efficiently
                        </p>
                        <p style={{ margin: 0, fontSize: "12px", color: MUTED, fontFamily: FONT }}>Fashion Point • Vijayawada</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
