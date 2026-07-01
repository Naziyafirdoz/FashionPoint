"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { isValidEmail } from "@/lib/checkout/contact-validation";

type Props = {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  /** Controls post-submit toast copy for product cards vs other entry points */
  source?: "card" | "detail";
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function OutOfStockModal({
  open,
  onClose,
  productId,
  productName,
  source = "card"
}: Props) {
  const titleId = useId();
  const subtitleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName("");
    setEmail("");
    setSubmitting(false);
    setSucceeded(false);
    setEmailError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement;
    setSucceeded(false);
    setEmailError(null);

    const supabase = createClient();
    void (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) return;

      if (user.email) {
        setEmail(user.email);
      }

      const { data: customer } = await supabase
        .from("customers")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const fullName =
        customer?.full_name?.trim() ||
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        "";

      if (fullName) {
        setName(fullName);
      }
    })();

    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [open, handleClose]);

  if (!open) return null;

  const validateClient = (): boolean => {
    setEmailError(null);

    if (name.trim().length < 2) {
      toast.error("Please enter your full name (at least 2 characters).");
      return false;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }

    return true;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (succeeded || submitting) return;
    if (!validateClient()) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/stock-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          product_name: productName,
          customer_name: name.trim(),
          customer_email: email.trim()
        })
      });

      const data: { error?: string } = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("You've already requested this notification.");
        } else if (res.status === 400 && data.error?.toLowerCase().includes("email")) {
          setEmailError("Please enter a valid email address.");
        } else {
          toast.error(data.error ?? "Something went wrong. Please try again.");
        }
        return;
      }

      setSucceeded(true);

      if (source === "card") {
        toast.success("You're on the list! We'll email you when this product is back in stock.");
      } else if (source !== "detail") {
        toast.success("We'll email you when your favourite blouse is back in stock.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-lg font-bold text-primary">
              Notify Me When Available
            </h2>
            <p id={subtitleId} className="mt-1 text-sm text-foreground/70">
              Enter your email address and we&apos;ll notify you as soon as this product is back in
              stock.
            </p>
            <p className="mt-1 text-sm font-medium text-foreground/80">{productName}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-foreground/60 hover:bg-blush"
            aria-label="Close notification form"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {succeeded ? (
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F5EE]">
              <Check className="h-6 w-6 text-[#2E7D57]" aria-hidden="true" />
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">Thank you!</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">
              We&apos;ll email you as soon as this product becomes available again.
            </p>
            <button type="button" onClick={handleClose} className="btn-primary mt-6 w-full">
              <span className="inline-flex items-center justify-center gap-2">
                <Check className="h-4 w-4" aria-hidden="true" />
                Notification Requested
              </span>
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
            <label htmlFor="stock-notify-name" className="block text-sm font-medium text-foreground/80">
              Full Name
              <input
                ref={nameInputRef}
                id="stock-notify-name"
                type="text"
                required
                minLength={2}
                autoComplete="name"
                placeholder="Your full name"
                className="mt-1.5 w-full rounded-lg border border-accent/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            <label htmlFor="stock-notify-email" className="block text-sm font-medium text-foreground/80">
              Email Address
              <input
                id="stock-notify-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? "stock-notify-email-error" : undefined}
                className="mt-1.5 w-full rounded-lg border border-accent/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) setEmailError(null);
                }}
              />
            </label>
            {emailError ? (
              <p id="stock-notify-email-error" className="text-sm text-red-600" role="alert">
                {emailError}
              </p>
            ) : null}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn-outline flex-1"
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                {submitting ? "Sending..." : "Notify Me"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
