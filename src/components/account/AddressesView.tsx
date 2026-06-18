"use client";

import { useState, useTransition } from "react";
import { MapPin, Pencil, Trash2, Star } from "lucide-react";
import {
  deleteAddressAction,
  saveAddressAction,
  setDefaultAddressAction
} from "@/app/(store)/account/actions";
import { AddressForm } from "@/components/account/AddressForm";
import type { Address } from "@/types";

type AddressesViewProps = {
  addresses: Address[];
  canAddMore: boolean;
};

export function AddressesView({ addresses, canAddMore }: AddressesViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openAdd() {
    setEditing(null);
    setShowForm(true);
    setError(null);
  }

  function openEdit(address: Address) {
    setEditing(address);
    setShowForm(true);
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    setError(null);
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      const result = await deleteAddressAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  function handleSetDefault(id: string) {
    setError(null);
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      const result = await setDefaultAddressAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="mt-8 space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <div className="card-store">
          <h2 className="font-display text-lg font-semibold text-primary">
            {editing ? "Edit Address" : "Add New Address"}
          </h2>
          <AddressForm
            initial={editing}
            onCancel={closeForm}
            onSaved={closeForm}
            saveAction={saveAddressAction}
          />
        </div>
      ) : null}

      {!addresses.length && !showForm ? (
        <div className="card-store text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-12 w-12 text-primary" strokeWidth={1.5} />
          </div>
          <p className="mt-6 text-lg font-medium text-primary">No saved addresses</p>
          <p className="mt-2 text-sm text-foreground/70">
            Save addresses for faster checkout
          </p>
          {canAddMore ? (
            <button type="button" onClick={openAdd} className="btn-primary mt-6">
              Add New Address
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {addresses.map((address) => (
            <div key={address.id} className="card-store">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {address.label || "Home"}
                    </span>
                    {address.is_default ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-medium text-secondary">
                        <Star className="h-3 w-3 fill-current" />
                        Default
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 font-semibold text-foreground">{address.name}</p>
                  <p className="mt-1 text-sm text-foreground/70">{address.phone}</p>
                  <p className="mt-2 text-sm text-foreground/80">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                  </p>
                  <p className="text-sm text-foreground/80">
                    {address.city}, {address.state} — {address.pincode}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(address)}
                    className="btn-outline inline-flex items-center gap-1.5 text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(address.id)}
                    disabled={pending}
                    className="btn-outline inline-flex items-center gap-1.5 text-xs text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                  {!address.is_default ? (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(address.id)}
                      disabled={pending}
                      className="btn-outline inline-flex items-center gap-1.5 text-xs"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Set as Default
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {canAddMore && !showForm ? (
            <button type="button" onClick={openAdd} className="btn-primary w-full sm:w-auto">
              Add New Address
            </button>
          ) : !canAddMore ? (
            <p className="text-sm text-foreground/60">Maximum of 5 saved addresses reached.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
