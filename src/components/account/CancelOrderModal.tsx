"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { CustomerRefundDetailsInput, ManualRefundMethod } from "@/lib/orders/manual-refund";
import {
  isAllowedQrRefundImage,
  QR_REFUND_ACCEPT,
  QR_REFUND_HELPER_TEXT,
  QR_REFUND_INVALID_MESSAGE
} from "@/lib/orders/manual-refund";
import { fileContainsQrCode } from "@/lib/orders/detect-qr-code";
import { isPrepaidPayment } from "@/lib/orders/payment-rules";

export type CancelOrderSubmitPayload = CustomerRefundDetailsInput & {
  cancellation_reason?: string;
};

type CancelOrderModalProps = {
  open: boolean;
  orderNumber: string;
  isPrepaid: boolean;
  loading?: boolean;
  onConfirm: (payload: CancelOrderSubmitPayload) => void;
  onCancel: () => void;
};

const REFUND_METHODS: { id: ManualRefundMethod; label: string }[] = [
  { id: "upi", label: "UPI ID" },
  { id: "bank_account", label: "Bank Account" },
  { id: "qr_code", label: "QR Code Upload" }
];

export function CancelOrderModal({
  open,
  orderNumber,
  isPrepaid,
  loading = false,
  onConfirm,
  onCancel
}: CancelOrderModalProps) {
  const [cancellationReason, setCancellationReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<ManualRefundMethod | "">("");
  const [upiId, setUpiId] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCancellationReason("");
    setRefundMethod("");
    setUpiId("");
    setAccountHolder("");
    setAccountNumber("");
    setIfsc("");
    setBankName("");
    setQrImageUrl("");
  }, [open]);

  if (!open) return null;

  const handleQrUpload = async (file: File | null) => {
    if (!file) return;
    if (!isAllowedQrRefundImage(file)) {
      toast.error("Please upload a JPG, JPEG, PNG, or WEBP image only.");
      return;
    }
    setUploadingQr(true);
    try {
      const hasQr = await fileContainsQrCode(file);
      if (!hasQr) {
        toast.error(QR_REFUND_INVALID_MESSAGE);
        return;
      }
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Failed to upload QR code");
        return;
      }
      setQrImageUrl(data.url);
      toast.success("QR code uploaded");
    } catch {
      toast.error("Failed to upload QR code");
    } finally {
      setUploadingQr(false);
      if (qrInputRef.current) qrInputRef.current.value = "";
    }
  };

  const handleRemoveQr = () => {
    setQrImageUrl("");
    if (qrInputRef.current) qrInputRef.current.value = "";
  };

  const handleSubmit = () => {
    const payload: CancelOrderSubmitPayload = {
      cancellation_reason: cancellationReason.trim() || undefined,
      refund_method: refundMethod || undefined,
      refund_upi_id: refundMethod === "upi" ? upiId.trim() : undefined,
      refund_bank_holder_name: refundMethod === "bank_account" ? accountHolder.trim() : undefined,
      refund_bank_account_number:
        refundMethod === "bank_account" ? accountNumber.trim() : undefined,
      refund_bank_ifsc: refundMethod === "bank_account" ? ifsc.trim().toUpperCase() : undefined,
      refund_bank_name: refundMethod === "bank_account" ? bankName.trim() : undefined,
      refund_qr_image_url: refundMethod === "qr_code" ? qrImageUrl : undefined
    };
    onConfirm(payload);
  };

  const prepaidValid =
    !isPrepaid ||
    (refundMethod === "upi" && upiId.trim()) ||
    (refundMethod === "bank_account" &&
      accountHolder.trim() &&
      accountNumber.trim() &&
      ifsc.trim() &&
      bankName.trim()) ||
    (refundMethod === "qr_code" && qrImageUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
      >
        <h2 id="cancel-order-title" className="font-bold text-primary">
          Cancel Order
        </h2>
        <p className="mt-2 text-sm text-foreground/70">
          Are you sure you want to cancel this order?
        </p>
        <p className="mt-2 text-xs text-foreground/50">Order {orderNumber}</p>

        <label className="mt-4 block text-sm">
          <span className="text-foreground/70">Cancellation Reason (optional)</span>
          <textarea
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            rows={2}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Tell us why you are cancelling"
          />
        </label>

        {isPrepaid ? (
          <div className="mt-4 space-y-3 border-t border-accent/10 pt-4">
            <p className="text-sm font-medium text-foreground">
              Refund Method <span className="text-red-600">*</span>
            </p>
            <p className="text-xs text-foreground/60">
              Provide refund details so we can transfer your payment after your cancellation is
              approved.
            </p>
            <div className="flex flex-wrap gap-2">
              {REFUND_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setRefundMethod(method.id);
                    if (method.id !== "qr_code") handleRemoveQr();
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    refundMethod === method.id
                      ? "border-primary bg-primary text-white"
                      : "border-gray-200 text-foreground/70"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>

            {refundMethod === "upi" ? (
              <label className="block text-sm">
                <span className="text-foreground/70">UPI ID *</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                />
              </label>
            ) : null}

            {refundMethod === "bank_account" ? (
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="text-foreground/70">Account Holder Name *</span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-foreground/70">Account Number *</span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-foreground/70">IFSC Code *</span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm uppercase"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-foreground/70">Bank Name *</span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </label>
              </div>
            ) : null}

            {refundMethod === "qr_code" ? (
              <div className="space-y-3">
                <p className="text-xs text-foreground/60">{QR_REFUND_HELPER_TEXT}</p>
                <input
                  ref={qrInputRef}
                  type="file"
                  accept={QR_REFUND_ACCEPT}
                  className="sr-only"
                  disabled={uploadingQr}
                  onChange={(e) => void handleQrUpload(e.target.files?.[0] ?? null)}
                />
                {!qrImageUrl ? (
                  <button
                    type="button"
                    className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-foreground/70 hover:border-primary hover:text-primary"
                    disabled={uploadingQr}
                    onClick={() => qrInputRef.current?.click()}
                  >
                    {uploadingQr ? "Uploading…" : "Upload QR Code Image"}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="relative h-44 w-44 overflow-hidden rounded-lg border bg-white">
                      <Image
                        src={qrImageUrl}
                        alt="Uploaded QR code preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-gray-50"
                        disabled={uploadingQr}
                        onClick={() => qrInputRef.current?.click()}
                      >
                        {uploadingQr ? "Uploading…" : "Replace QR Code"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        disabled={uploadingQr}
                        onClick={handleRemoveQr}
                      >
                        Remove QR Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-foreground/70">
            Your order will be cancelled. No payment was collected for this COD order.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="flex-1 rounded-lg border px-4 py-2 text-sm"
            disabled={loading || uploadingQr}
            onClick={onCancel}
          >
            Keep Order
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={loading || uploadingQr || !prepaidValid}
            onClick={handleSubmit}
          >
            {loading ? "Submitting…" : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function orderIsPrepaidForCancel(paymentMethod: string | undefined): boolean {
  return isPrepaidPayment(paymentMethod);
}
