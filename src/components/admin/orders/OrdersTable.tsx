"use client";

import Link from "next/link";
import { OrderItemThumbnails } from "@/components/admin/orders/OrderItemThumbnails";
import { OrderRowActions } from "@/components/admin/orders/dashboard/OrderRowActions";
import {
  customerEmail,
  customerName,
  customerPhone,
  formatAssignedBranchName,
  formatCurrency,
  formatOrderDate,
  formatOrderTime,
  itemsCount,
  paymentMethodLabel,
  paymentStatusLabel,
  type OrderListRow
} from "@/lib/orders/admin-orders";
import { requiresCustomerCancellationRefund } from "@/lib/orders/cancellation";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import { getAdminStageLabel, getPrimaryAction, getStagePillClass } from "@/lib/orders/admin-order-ui";

type OrdersTableProps = {
  orders: OrderListRow[];
  updatingOrderId: string | null;
  onPrint: (order: OrderListRow) => void;
  onDownloadInvoice?: (order: OrderListRow) => void;
  onStartProcessing?: (order: OrderListRow) => void;
  onApproveOrder?: (order: OrderListRow) => void;
  onStartPacking?: (order: OrderListRow) => void;
  onReadyForShipping?: (order: OrderListRow) => void;
  onMarkShipped?: (order: OrderListRow) => void;
  onProcessRefund?: (orderId: string) => void;
};

function StatusPill({ order }: { order: OrderListRow }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${getStagePillClass(order)}`}
    >
      <span className="truncate">{getAdminStageLabel(order)}</span>
    </span>
  );
}

const thClass = "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500";
const tdClass = "px-3 py-3.5 align-top";

export function OrdersTable({
  orders,
  updatingOrderId,
  onPrint,
  onDownloadInvoice,
  onStartProcessing,
  onApproveOrder,
  onStartPacking,
  onReadyForShipping,
  onMarkShipped,
  onProcessRefund
}: OrdersTableProps) {
  return (
    <table className="w-full table-fixed text-sm">
      <thead className="border-b border-gray-200 bg-gray-50">
        <tr>
          <th className={`${thClass} w-[12%]`}>Order ID</th>
          <th className={`${thClass} w-[18%]`}>Customer</th>
          <th className={`${thClass} w-[10%]`}>Total</th>
          <th className={`${thClass} w-[12%]`}>Payment</th>
          <th className={`${thClass} w-[13%]`}>Status</th>
          <th className={`${thClass} w-[11%]`}>Branch</th>
          <th className={`${thClass} hidden w-[9%] lg:table-cell`}>Items</th>
          <th className={`${thClass} w-[15%] lg:w-[15%]`}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order, index) => {
          const row = applyPaymentRulesToOrder(order);
          const busy = updatingOrderId === row.id;
          const qty = itemsCount(row);
          const email = customerEmail(row);
          const phone = customerPhone(row);
          const primaryAction = getPrimaryAction(row);
          const refundRequired = requiresCustomerCancellationRefund(row);

          return (
            <tr
              key={order.id}
              className={`border-b border-gray-100 transition hover:bg-gray-50/80 ${
                refundRequired
                  ? "border-l-4 border-l-amber-500 bg-amber-50/70"
                  : index % 2 === 1
                    ? "bg-gray-50/30"
                    : "bg-white"
              }`}
            >
              <td className={tdClass}>
                <Link
                  href={`/admin/orders/${row.id}`}
                  className="block truncate font-semibold text-primary hover:underline"
                >
                  {row.order_number}
                </Link>
                <p className="mt-0.5 truncate text-xs text-gray-500">{formatOrderDate(row.created_at)}</p>
                <p className="truncate text-xs text-gray-400">{formatOrderTime(row.created_at)}</p>
              </td>
              <td className={tdClass}>
                <p className="truncate font-medium text-gray-900">{customerName(row)}</p>
                {phone !== "—" ? (
                  <p className="mt-0.5 truncate text-xs text-gray-600">{phone}</p>
                ) : null}
                {email !== "—" ? (
                  <p className="mt-0.5 truncate text-xs text-gray-500">{email}</p>
                ) : null}
              </td>
              <td className={tdClass}>
                <p className="font-semibold tabular-nums text-gray-900">
                  {formatCurrency(Number(row.total))}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">Qty: {qty}</p>
              </td>
              <td className={tdClass}>
                <p className="truncate font-medium text-gray-800">
                  {paymentMethodLabel(row.payment_method)}
                </p>
                <p className="mt-1 truncate text-xs text-gray-500">
                  {paymentStatusLabel(row.payment_status)}
                </p>
              </td>
              <td className={tdClass}>
                <StatusPill order={row} />
              </td>
              <td className={tdClass}>
                <p className="truncate font-medium text-gray-800">
                  {formatAssignedBranchName(row.branch_id, row.branch_name)}
                </p>
              </td>
              <td className={`${tdClass} hidden lg:table-cell`}>
                <OrderItemThumbnails items={row.items} orderId={row.id} />
              </td>
              <td className={tdClass}>
                <div className="min-w-0">
                  <OrderRowActions
                    order={row}
                    primaryAction={primaryAction}
                    busy={busy}
                    onStartProcessing={onStartProcessing}
                    onApproveOrder={onApproveOrder}
                    onStartPacking={onStartPacking}
                    onReadyForShipping={onReadyForShipping}
                    onMarkShipped={onMarkShipped}
                    onProcessRefund={onProcessRefund}
                    onPrint={onPrint}
                    onDownloadInvoice={onDownloadInvoice}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
