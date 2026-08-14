"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { SettingsSection } from "./settings-shared";
import { BranchFormModal, type BranchFormValues } from "@/components/admin/BranchFormModal";
import type { AdminBranchRow } from "@/lib/admin/branches";
import type { BranchWithAreas, BranchServiceAreaRecord } from "@/lib/shipping/branch-types";

export function AdminBranchesSettings() {
  const [branches, setBranches] = useState<AdminBranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BranchWithAreas | null>(null);
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  const [serviceAreas, setServiceAreas] = useState<Record<string, BranchServiceAreaRecord[]>>({});
  const [loadingServiceAreas, setLoadingServiceAreas] = useState<Set<string>>(new Set());
  const [addingPincode, setAddingPincode] = useState<string | null>(null);
  const [pincodeInput, setPincodeInput] = useState("");
  const [deletingPincode, setDeletingPincode] = useState<{ branch: string; pincode: string } | null>(null);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load branches");
        setBranches([]);
        return;
      }
      setBranches(data.branches ?? []);
      setServiceAreas({});
    } catch {
      toast.error("Failed to load branches");
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleCreateBranch = async () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEditBranch = async (branchId: string) => {
    try {
      const res = await fetch(`/api/admin/branches/${branchId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load branch");
        return;
      }
      setEditing(data.branch);
      setModalOpen(true);
    } catch {
      toast.error("Failed to load branch");
    }
  };

  const handleFormSubmit = async (values: BranchFormValues) => {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/branches/${editing.id}` : "/api/admin/branches";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          slug: values.slug,
          city: values.city,
          state: values.state || undefined,
          pincode: values.pincode || undefined,
          address: values.address || null,
          phone: values.phone || null,
          local_shipping_charge: Number(values.local_shipping_charge),
          outstation_shipping_charge: Number(values.outstation_shipping_charge),
          is_active: values.is_active,
          is_default: values.is_default,
          sort_order: Number(values.sort_order)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save branch");
        return;
      }

      toast.success(editing ? "Branch updated" : "Branch created");
      setModalOpen(false);
      setEditing(null);
      await loadBranches();
    } catch {
      toast.error("Failed to save branch");
    } finally {
      setSaving(false);
    }
  };

  const loadServiceAreas = async (branchId: string) => {
    setLoadingServiceAreas((prev) => new Set([...prev, branchId]));
    try {
      const res = await fetch(`/api/admin/branches/${branchId}/service-areas`);
      const data = await res.json();
      if (res.ok) {
        setServiceAreas((prev) => ({
          ...prev,
          [branchId]: data.service_areas ?? []
        }));
      }
    } catch {
      toast.error("Failed to load service areas");
    } finally {
      setLoadingServiceAreas((prev) => {
        const next = new Set(prev);
        next.delete(branchId);
        return next;
      });
    }
  };

  const handleToggleExpand = async (branchId: string) => {
    if (expandedBranchId === branchId) {
      setExpandedBranchId(null);
    } else {
      setExpandedBranchId(branchId);
      if (!serviceAreas[branchId]) {
        await loadServiceAreas(branchId);
      }
    }
  };

  const handleAddPincode = async (branchId: string) => {
    const pincode = pincodeInput.trim();
    if (!pincode) {
      toast.error("Please enter a pincode");
      return;
    }

    if (!/^\d{6}$/.test(pincode)) {
      toast.error("Pincode must be exactly 6 digits");
      return;
    }

    setAddingPincode(branchId);
    try {
      const res = await fetch(`/api/admin/branches/${branchId}/service-areas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode, is_local: true })
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add pincode");
        return;
      }

      toast.success("Pincode added");
      setPincodeInput("");
      setServiceAreas((prev) => ({
        ...prev,
        [branchId]: data.service_areas ?? []
      }));
    } catch {
      toast.error("Failed to add pincode");
    } finally {
      setAddingPincode(null);
    }
  };

  const handleRemovePincode = async (branchId: string, pincode: string) => {
    setDeletingPincode({ branch: branchId, pincode });
  };

  const confirmRemovePincode = async () => {
    if (!deletingPincode) return;

    try {
      const res = await fetch(
        `/api/admin/branches/${deletingPincode.branch}/service-areas/${deletingPincode.pincode}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to remove pincode");
        return;
      }

      toast.success("Pincode removed");
      setServiceAreas((prev) => ({
        ...prev,
        [deletingPincode.branch]: (prev[deletingPincode.branch] ?? []).filter(
          (a) => a.pincode !== deletingPincode.pincode
        )
      }));
    } catch {
      toast.error("Failed to remove pincode");
    } finally {
      setDeletingPincode(null);
    }
  };

  const currentServiceAreas = expandedBranchId ? serviceAreas[expandedBranchId] ?? [] : [];

  return (
    <>
      <SettingsSection title="Branch Management" icon={Package}>
        <p className="text-sm text-foreground/70 mb-6">
          Manage your fulfillment branches, shipping charges, and service area coverage.
        </p>

        {loading ? (
          <p className="text-sm text-foreground/60">Loading branches…</p>
        ) : branches.length === 0 ? (
          <p className="text-sm text-foreground/60">No branches configured.</p>
        ) : (
          <div className="space-y-3">
            {branches.map((branch) => (
              <div key={branch.id} className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleToggleExpand(branch.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 hover:bg-foreground/2 transition"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {branch.name}
                          {branch.is_default && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-emerald-100 text-emerald-700 font-medium">
                              Default
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-foreground/60 mt-1">
                          {branch.city}, {branch.state} · {branch.service_area_count} service area(s)
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        branch.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {branch.is_active ? "Active" : "Inactive"}
                    </span>
                    {expandedBranchId === branch.id ? (
                      <ChevronUp className="h-4 w-4 text-foreground/60" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-foreground/60" />
                    )}
                  </div>
                </button>

                {expandedBranchId === branch.id && (
                  <div className="border-t bg-foreground/1 p-4 space-y-4">
                    {/* Branch Details */}
                    <div className="grid gap-4 sm:grid-cols-2 text-sm">
                      <div>
                        <dt className="text-foreground/60 mb-1">Address</dt>
                        <dd className="text-foreground">{branch.address || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-foreground/60 mb-1">Phone</dt>
                        <dd className="text-foreground">{branch.phone || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-foreground/60 mb-1">Local Delivery</dt>
                        <dd className="text-foreground font-semibold">₹{branch.local_shipping_charge}</dd>
                      </div>
                      <div>
                        <dt className="text-foreground/60 mb-1">Outstation Delivery</dt>
                        <dd className="text-foreground font-semibold">
                          ₹{branch.outstation_shipping_charge}
                        </dd>
                      </div>
                    </div>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleEditBranch(branch.id)}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Edit Branch Details
                    </button>

                    {/* Service Areas */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold mb-3">Service Area (Pincodes)</h4>

                      {loadingServiceAreas.has(branch.id) ? (
                        <p className="text-xs text-foreground/60">Loading…</p>
                      ) : currentServiceAreas.length === 0 ? (
                        <p className="text-xs text-foreground/60">No service areas configured.</p>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {currentServiceAreas.map((area) => (
                            <div
                              key={area.id}
                              className="flex items-center justify-between gap-2 text-sm bg-white p-2 rounded border"
                            >
                              <div>
                                <span className="font-mono font-semibold">{area.pincode}</span>
                                <span className="ml-2 text-xs text-foreground/60">
                                  {area.is_local ? "Local" : "Outstation"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemovePincode(branch.id, area.pincode)}
                                className="text-red-600 hover:text-red-700 p-1"
                                title="Remove pincode"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Pincode */}
                      {expandedBranchId === branch.id && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={pincodeInput}
                            onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ""))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddPincode(branch.id);
                            }}
                            placeholder="Add pincode (6 digits)"
                            className="flex-1 rounded-lg border px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddPincode(branch.id)}
                            disabled={addingPincode === branch.id}
                            className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                          >
                            {addingPincode === branch.id ? "Adding…" : "Add"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleCreateBranch}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Branch
        </button>
      </SettingsSection>

      <BranchFormModal
        open={modalOpen}
        title={editing ? "Edit Branch" : "Create Branch"}
        initial={editing}
        saving={saving}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Confirmation Dialog for Pincode Removal */}
      {deletingPincode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <h3 className="font-semibold mb-2">Remove Pincode?</h3>
            <p className="text-sm text-foreground/70 mb-6">
              Remove <span className="font-mono font-semibold">{deletingPincode.pincode}</span> from{" "}
              {branches.find((b) => b.id === deletingPincode.branch)?.name}?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeletingPincode(null)}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemovePincode}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:opacity-90"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
