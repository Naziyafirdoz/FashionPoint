import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminShippingSettings } from "@/components/admin/settings/AdminShippingSettings";
import {
  STORE_NAME,
  STORE_PHONE_PRIMARY_DISPLAY,
  STORE_PHONE_SECONDARY_DISPLAY,
  SUPPORT_EMAIL,
  STORE_ADDRESS
} from "@/lib/site-config";

export default function AdminSettingsPage() {
  return (
    <>
      <AdminHeader title="Settings" />
      <div className="space-y-6 p-6">
        <section className="card-store max-w-2xl">
          <h2 className="font-semibold text-primary">Store Information</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-foreground/60">Store name</dt>
              <dd>{STORE_NAME}</dd>
            </div>
            <div>
              <dt className="text-foreground/60">Address</dt>
              <dd>{STORE_ADDRESS}</dd>
            </div>
            <div>
              <dt className="text-foreground/60">Primary phone</dt>
              <dd>{STORE_PHONE_PRIMARY_DISPLAY}</dd>
            </div>
            <div>
              <dt className="text-foreground/60">Secondary phone</dt>
              <dd>{STORE_PHONE_SECONDARY_DISPLAY}</dd>
            </div>
            <div>
              <dt className="text-foreground/60">Email</dt>
              <dd>{SUPPORT_EMAIL}</dd>
            </div>
          </dl>
        </section>

        <AdminShippingSettings />
      </div>
    </>
  );
}
