"use client";

type AddressValidationModalProps = {
  open: boolean;
  entered: { city: string; state: string; pincode: string };
  detected: { city: string; state: string } | null;
  onClose: () => void;
};

export function AddressValidationModal({
  open,
  entered,
  detected,
  onClose
}: AddressValidationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-validation-title"
      >
        <h2 id="address-validation-title" className="text-lg font-semibold text-primary">
          Address Validation Error
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">
          The entered City, State, and Pincode do not match.
          <br />
          Please verify your address details and try again.
        </p>

        <div className="mt-4 space-y-3 rounded-xl border border-red-100 bg-red-50/60 p-4 text-sm">
          <div>
            <p className="font-medium text-foreground">Entered:</p>
            <p className="mt-1 text-foreground/80">City: {entered.city || "—"}</p>
            <p className="text-foreground/80">State: {entered.state || "—"}</p>
            <p className="text-foreground/80">Pincode: {entered.pincode || "—"}</p>
          </div>

          {detected ? (
            <div>
              <p className="font-medium text-foreground">Detected:</p>
              <p className="mt-1 text-foreground/80">City: {detected.city}</p>
              <p className="text-foreground/80">State: {detected.state}</p>
            </div>
          ) : (
            <p className="text-foreground/70">
              We could not verify this pincode. Please check the pincode and try again.
            </p>
          )}
        </div>

        <p className="mt-3 text-sm text-foreground/70">Please correct the address.</p>

        <button type="button" onClick={onClose} className="btn-primary mt-5 w-full">
          OK
        </button>
      </div>
    </div>
  );
}
