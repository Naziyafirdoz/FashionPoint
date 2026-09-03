"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { OfferForm, type OfferUpsertPayload } from "@/components/admin/offers/OfferForm";
import type { AdminOfferDto } from "@/lib/admin/offers";

type OfferEditClientProps = {
  offerId: string;
};

export function OfferEditClient({ offerId }: OfferEditClientProps) {
  const router = useRouter();
  const [offer, setOffer] = useState<AdminOfferDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);
      setLoadFailed(false);
      try {
        const res = await fetch(`/api/admin/offers/${offerId}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          setOffer(null);
          return;
        }
        if (!res.ok) {
          toast.error(data.error ?? "Failed to load offer");
          setLoadFailed(true);
          setOffer(null);
          return;
        }
        setOffer(data.offer ?? null);
        if (!data.offer) setNotFound(true);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load offer");
          setLoadFailed(true);
          setOffer(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  const handleSubmit = async (payload: OfferUpsertPayload) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save offer");
        return;
      }
      toast.success("Offer updated");
      router.push("/admin/offers");
    } catch {
      toast.error("Failed to save offer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <AdminHeader title="Edit Offer" />
        <p className="p-6 text-sm text-foreground/60">Loading offer…</p>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <AdminHeader title="Edit Offer" />
        <p className="p-6 text-sm text-red-600">
          Offer not found.{" "}
          <Link href="/admin/offers" className="text-primary underline">
            Back to offers
          </Link>
        </p>
      </>
    );
  }

  if (loadFailed || !offer) {
    return (
      <>
        <AdminHeader title="Edit Offer" />
        <p className="p-6 text-sm text-red-600">
          Unable to load this offer.{" "}
          <Link href="/admin/offers" className="text-primary underline">
            Back to offers
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Edit Offer" />
      <div className="p-6">
        <OfferForm mode="edit" initial={offer} saving={saving} onSubmit={handleSubmit} />
      </div>
    </>
  );
}
