"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AuthModal } from "@/components/AuthModal";
import { NotificationPreferences } from "@/components/customer/NotificationPreferences";

type Address = {
  id?: string;
  fullName: string;
  mobile: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  country: "India";
  addressType: "HOME" | "OFFICE" | "OTHER";
  isDefault?: boolean;
};

type Order = {
  id: string;
  orderNumber: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  metalType: string;
  purity: string;
  weightGrams: number;
  quantity: number;
  metalValue: number;
  serviceCharge: number;
  gst: number;
  shipping: number;
  total: number;
  gateway: string;
  paymentStatus: string;
  orderStatus: string;
  paymentId: string | null;
  invoiceNumber: string | null;
  createdAt: string;
  deliveryAddress: Address | null;
  shipment: {
    courierPartner: string | null;
    trackingNumber: string | null;
    status: string;
    pickupStatus: string;
    expectedDelivery: string | null;
    deliveredAt: string | null;
    lastUpdated: string | null;
    timeline: Array<{ label: string; at: string }>;
    trackingUrl: string | null;
    message: string | null;
  };
};

type GstProfile = {
  id: string;
  businessName: string;
  gstNumber: string;
  billingAddress: string;
  isActive: boolean;
};

type Dashboard = {
  customer: {
    fullName: string;
    phone: string | null;
    email: string | null;
    emailVerified: boolean;
    mobileVerified: boolean;
    googleConnected: boolean;
    memberSince: string;
  };
  summary: {
    totalOrders: number;
    paidOrders: number;
    activeShipments: number;
    totalSpent: number;
  };
  orders: Order[];
  addresses: Address[];
  gstProfile: GstProfile | null;
  paymentHistory: Array<{
    orderNumber: string;
    gateway: string;
    paymentId: string | null;
    status: string;
    amount: number;
    date: string;
  }>;
  rewards: { points: number; tier: string; message: string };
  notifications: Array<{ id: string; title: string; date: string }>;
  wishlist: unknown[];
};

const blank: Address = {
  fullName: "",
  mobile: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  country: "India",
  addressType: "HOME",
};

const card =
  "rounded-3xl border border-amber-300/15 bg-white/[0.055] p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)] backdrop-blur-xl sm:p-6";

const readToken = () =>
  localStorage.getItem("scheme_user_token") ||
  localStorage.getItem("ratestack_user_token") ||
  "";

const subscribeToAuth = (onChange: () => void) => {
  window.addEventListener("auth:change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("auth:change", onChange);
    window.removeEventListener("storage", onChange);
  };
};

export function CustomerDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [login, setLogin] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState<Address | null>(null);

  const token = useSyncExternalStore(subscribeToAuth, readToken, () => "");

  const load = useCallback(() => {
    if (!token) return;
    fetch("/api/v1/me/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((b) => {
        if (!b.success) throw new Error(b.error?.message);
        setData(b.data);
      })
      .catch((e) => setError(e.message || "Dashboard unavailable."));
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveAddress() {
    if (!address) return;
    const method = address.id ? "PUT" : "POST";
    const url = address.id
      ? `/api/v1/me/addresses/${address.id}`
      : "/api/v1/me/addresses";
    const r = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(address),
    });
    const b = await r.json();
    if (!r.ok) {
      setError(b.error?.message);
      return;
    }
    setAddress(null);
    load();
  }

  async function addressAction(id: string, action: "delete" | "default") {
    const r = await fetch(
      `/api/v1/me/addresses/${id}${action === "default" ? "/default" : ""}`,
      {
        method: action === "delete" ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const b = await r.json();
    if (!r.ok) {
      setError(b.error?.message);
      return;
    }
    load();
  }

  async function invoice(order: Order) {
    const r = await fetch(`/api/v1/me/orders/${order.id}/invoice`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "same-origin",
    });
    if (!r.ok) {
      const body = (await r.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(body?.error?.message || "Invoice unavailable.");
      return;
    }
    if (!r.headers.get("content-type")?.startsWith("application/pdf")) {
      setError("The invoice response was invalid.");
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${order.invoiceNumber || order.orderNumber}.pdf`;
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  function logout() {
    [
      "scheme_user_token",
      "ratestack_user_token",
      "scheme_user_name",
      "scheme_user_phone",
    ].forEach((key) => localStorage.removeItem(key));
    window.dispatchEvent(new CustomEvent("auth:change"));
    window.location.href = "/";
  }

  if (!data)
    return (
      <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-20 text-center">
        <p>
          {error ||
            (!token
              ? "Sign in to open your Dashboard."
              : "Loading your Dashboard…")}
        </p>
        {!token && !login && (
          <button
            onClick={() => setLogin(true)}
            className="cursor-pointer mt-5 rounded-xl bg-amber-400 px-5 py-3 font-black text-stone-950 hover:bg-amber-300 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Login to Dashboard
          </button>
        )}
        {login && (
          <AuthModal
            initialMode="login"
            redirectTo="/shop/orders"
            onClose={() => setLogin(false)}
            onSuccess={() => {
              setLogin(false);
              load();
            }}
          />
        )}
      </main>
    );

  const recent = data.orders.slice(0, 3);

  return (
    <main className="relative overflow-hidden pb-28 md:pb-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,160,49,.18),transparent_32%),radial-gradient(circle_at_90%_25%,rgba(255,255,255,.06),transparent_25%)]" />
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <section
          className={`${card} overflow-hidden bg-gradient-to-br from-amber-300/15 via-white/[.06] to-transparent`}
        >
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[.24em] text-amber-300">
                My Dashboard
              </p>
              <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
                Welcome, {data.customer.fullName}
              </h1>
              <p className="mt-2 text-stone-400">
                Your orders, deliveries, addresses and account—beautifully
                organised in one place.
              </p>
            </div>
            <button
              onClick={logout}
              className="cursor-pointer rounded-xl border border-red-300/30 px-5 py-3 font-bold text-red-200 hover:bg-red-400/10 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Logout
            </button>
          </div>
        </section>

        {/* Orders Summary Cards */}
        <section aria-labelledby="orders-summary-title">
          <h2 id="orders-summary-title" className="mb-4 font-display text-2xl font-bold">
            Orders Summary
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total Orders", data.summary.totalOrders],
              ["Paid Orders", data.summary.paidOrders],
              ["Live Shipments", data.summary.activeShipments],
              ["Total Spent", `₹${data.summary.totalSpent.toLocaleString("en-IN")}`],
            ].map(([label, value]) => (
              <article key={String(label)} className={card}>
                <p className="text-xs font-black uppercase tracking-wider text-stone-500">
                  {label}
                </p>
                <p className="mt-3 text-3xl font-black text-amber-300">{value}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Customer Information & Account Settings */}
        <section className="grid gap-6 lg:grid-cols-2">
          <DashboardCard title="Customer Information">
            <p className="text-xl font-black">{data.customer.fullName}</p>
            <p>
              {data.customer.phone || "Mobile not added"} ·{" "}
              {data.customer.mobileVerified ? "Verified" : "Not verified"}
            </p>
            <p>
              {data.customer.email || "Email not added"} ·{" "}
              {data.customer.emailVerified ? "Verified" : "Not verified"}
            </p>
            <p className="text-sm text-stone-500">
              Member since{" "}
              {new Date(data.customer.memberSince).toLocaleDateString("en-IN")}
            </p>
          </DashboardCard>
          <DashboardCard title="Account Settings">
            <p>
              Google Sign-In:{" "}
              <b>{data.customer.googleConnected ? "Connected" : "Not connected"}</b>
            </p>
            <p>
              Communication preferences and customer information are managed
              securely from this Dashboard.
            </p>
            <Link
              href="/contact-us"
              className="cursor-pointer inline-block text-amber-300 hover:text-amber-200 font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 rounded"
            >
              Request an account update →
            </Link>
          </DashboardCard>
        </section>

        {/* Recent Orders Section */}
        <DashboardCard title="Recent Orders">
          {recent.length ? (
            recent.map((order) => (
              <OrderCard key={order.id} order={order} onInvoice={invoice} />
            ))
          ) : (
            <Empty text="No orders yet." />
          )}
        </DashboardCard>

        {/* Saved Addresses Section (Compact & Responsive Grid) */}
        <DashboardCard
          title="Saved Addresses"
          action={
            <button
              type="button"
              onClick={() =>
                setAddress({
                  ...blank,
                  fullName: data.customer.fullName,
                  mobile: data.customer.phone || "",
                })
              }
              className="cursor-pointer rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-stone-950 shadow-md hover:bg-amber-300 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              + Add Address
            </button>
          }
        >
          {data.addresses.length === 0 ? (
            <div className="py-6 text-center text-stone-400 space-y-2">
              <p className="text-sm font-semibold">No saved addresses yet.</p>
              <p className="text-xs text-stone-500">
                Save an address now to speed up future checkouts.
              </p>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                data.addresses.length === 1
                  ? "grid-cols-1 max-w-xl"
                  : "grid-cols-1 md:grid-cols-2"
              }`}
            >
              {data.addresses.map((item) => (
                <article
                  key={item.id}
                  className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-black/30 p-4 shadow-sm space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <b className="text-sm font-extrabold text-stone-100">
                        {item.fullName}
                      </b>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[0.65rem] font-bold text-stone-300 border border-stone-700">
                          {item.addressType}
                        </span>
                        {item.isDefault && (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[0.65rem] font-black text-emerald-300 border border-emerald-500/30">
                            Default Address
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed break-words pt-1">
                      <span className="text-amber-300 font-mono block mb-0.5">
                        {item.mobile}
                      </span>
                      {item.addressLine1}
                      {item.addressLine2 ? `, ${item.addressLine2}` : ""}
                      {item.landmark ? `, ${item.landmark}` : ""}
                      <br />
                      {item.city}, {item.district}, {item.state} – {item.pincode}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setAddress(item)}
                      className="cursor-pointer text-amber-300 hover:text-amber-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 rounded px-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => addressAction(item.id!, "delete")}
                      disabled={data.addresses.length === 1}
                      className="cursor-pointer disabled:cursor-not-allowed text-red-300 hover:text-red-200 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-1"
                    >
                      Delete
                    </button>
                    {!item.isDefault && (
                      <button
                        type="button"
                        onClick={() => addressAction(item.id!, "default")}
                        className="cursor-pointer text-emerald-300 hover:text-emerald-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1"
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* GST Profile Manager */}
        <GstProfileManager
          initial={data.gstProfile}
          token={token}
          onChanged={load}
        />

        {/* Notification Preferences */}
        <NotificationPreferences token={token} />

        {/* Modal Address Editor */}
        {address && (
          <AddressEditor
            value={address}
            onChange={setAddress}
            onSave={saveAddress}
            onClose={() => setAddress(null)}
          />
        )}

        {/* Extra Info & Quick Action Cards */}
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard title="Security">
            <p>
              Password, verified mobile/email and Google Sign-In protect your
              account.
            </p>
            <p className="text-emerald-300">
              Server-verified payments and owner-only data access enabled.
            </p>
          </DashboardCard>
          <DashboardCard title="Reward Points">
            <p className="text-4xl font-black text-amber-300">
              {data.rewards.points}
            </p>
            <p>{data.rewards.tier} tier</p>
            <p className="text-sm text-stone-500">{data.rewards.message}</p>
          </DashboardCard>
          <DashboardCard title="Notifications">
            {data.notifications.length ? (
              data.notifications.map((n) => (
                <p key={n.id} className="border-b border-white/10 py-2 text-sm">
                  {n.title}
                  <br />
                  <span className="text-stone-500">
                    {new Date(n.date).toLocaleDateString("en-IN")}
                  </span>
                </p>
              ))
            ) : (
              <Empty text="No new notifications." />
            )}
          </DashboardCard>
        </section>

        {/* Download Invoices & Payment History */}
        <section className="grid gap-6 lg:grid-cols-2">
          <DashboardCard title="Download Invoices">
            {data.orders
              .filter((o) => o.invoiceNumber)
              .map((order) => (
                <button
                  key={order.id}
                  onClick={() => invoice(order)}
                  className="cursor-pointer flex w-full items-center justify-between border-b border-white/10 py-3 text-left hover:bg-white/5 px-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <span>
                    {order.invoiceNumber}
                    <br />
                    <small className="text-stone-400">{order.productName}</small>
                  </span>
                  <b className="text-amber-300">Download ↓</b>
                </button>
              ))}
            {!data.orders.some((o) => o.invoiceNumber) && (
              <Empty text="Invoices appear after successful payment." />
            )}
          </DashboardCard>
          <DashboardCard title="Payment History">
            {data.paymentHistory.map((payment) => (
              <div
                key={payment.orderNumber}
                className="flex justify-between border-b border-white/10 py-3 text-sm"
              >
                <span>
                  {payment.orderNumber}
                  <br />
                  <small className="text-stone-400">
                    {payment.gateway} · {payment.status}
                  </small>
                </span>
                <b>₹{payment.amount.toLocaleString("en-IN")}</b>
              </div>
            ))}
          </DashboardCard>
        </section>

        {/* Support & Quick Actions */}
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard title="Wishlist">
            <Empty text="Your wishlist is ready for future favourite products." />
          </DashboardCard>
          <DashboardCard title="Support Center">
            <p>Need help with an order, payment, invoice or delivery?</p>
            <Link
              href="/contact-us"
              className="cursor-pointer inline-block text-amber-300 hover:text-amber-200 font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 rounded"
            >
              Contact RateStack Support →
            </Link>
          </DashboardCard>
          <DashboardCard title="Quick Actions">
            <div className="grid gap-2">
              <Link
                href="/shop"
                className="cursor-pointer rounded-xl bg-amber-400 p-3 text-center font-black text-stone-950 hover:bg-amber-300 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Shop Coins
              </Link>
              <Link
                href="/#rates"
                className="cursor-pointer rounded-xl border border-amber-300/30 p-3 text-center font-bold text-stone-200 hover:bg-amber-400/10 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Today’s Rates
              </Link>
              <Link
                href="/calculator"
                className="cursor-pointer rounded-xl border border-white/10 p-3 text-center font-bold text-stone-200 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Calculator
              </Link>
            </div>
          </DashboardCard>
        </section>
      </div>
    </main>
  );
}

function getTrackBadge(shipmentStatus?: string, orderStatus?: string) {
  const s = (shipmentStatus || orderStatus || "ORDER_PLACED").toUpperCase();
  if (s === "DELIVERED") return { icon: "✅", label: "Delivered" };
  if (s === "CANCELLED") return { icon: "🔴", label: "Cancelled" };
  if (s === "RETURNED" || s.includes("RTO")) return { icon: "🔁", label: "Returned" };
  if (s === "OUT_FOR_DELIVERY") return { icon: "🔵", label: "Out for Delivery" };
  if (s === "IN_TRANSIT" || s === "SHIPPED") return { icon: "🟢", label: "In Transit" };
  if (s === "PICKUP_SCHEDULED" || s === "PICKED_UP") return { icon: "🟣", label: "Picked Up" };
  if (s === "PACKED" || s === "READY_TO_SHIP") return { icon: "🟡", label: "Packed" };
  if (s === "PROCESSING") return { icon: "🟠", label: "Processing" };
  return { icon: "⚪", label: "Order Placed" };
}

function GstProfileManager({
  initial,
  token,
  onChanged,
}: {
  initial: GstProfile | null;
  token: string;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(!initial);
  const [value, setValue] = useState({
    businessName: initial?.businessName || "",
    gstNumber: initial?.gstNumber || "",
    billingAddress: initial?.billingAddress || "",
  });
  const [message, setMessage] = useState("");

  async function save() {
    const response = await fetch("/api/v1/me/gst-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...value,
        enabled: true,
        gstNumber: value.gstNumber.trim().toUpperCase(),
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error?.message || "Unable to save GST details.");
      return;
    }
    setEditing(false);
    setMessage("");
    onChanged();
  }

  async function action(method: "PATCH" | "DELETE") {
    await fetch("/api/v1/me/gst-profile", {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body:
        method === "PATCH"
          ? JSON.stringify({ isActive: !initial?.isActive })
          : undefined,
    });
    onChanged();
  }

  return (
    <DashboardCard title="My GST Details">
      {initial && !editing ? (
        <>
          <p className="text-xl font-black">{initial.businessName}</p>
          <p>GSTIN: {initial.gstNumber}</p>
          <p className="whitespace-pre-line text-sm text-stone-300">
            {initial.billingAddress}
          </p>
          <p className={initial.isActive ? "text-emerald-300" : "text-stone-500"}>
            {initial.isActive ? "Enabled" : "Disabled"}
          </p>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setEditing(true)}
              className="cursor-pointer text-amber-300 hover:text-amber-200 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 rounded px-1"
            >
              Edit
            </button>
            <button
              onClick={() => action("PATCH")}
              className="cursor-pointer text-amber-300 hover:text-amber-200 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 rounded px-1"
            >
              {initial.isActive ? "Disable" : "Enable"}
            </button>
            <button
              onClick={() => action("DELETE")}
              className="cursor-pointer text-red-300 hover:text-red-200 font-bold focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-1"
            >
              Delete
            </button>
          </div>
        </>
      ) : (
        <div className="grid gap-3">
          <input
            value={value.businessName}
            maxLength={150}
            onChange={(event) =>
              setValue({ ...value, businessName: event.target.value })
            }
            placeholder="GST Registered Business Name"
            className="rounded-xl border border-white/10 bg-black/20 p-3 text-stone-100"
          />
          <textarea
            value={value.billingAddress}
            maxLength={500}
            onChange={(event) =>
              setValue({ ...value, billingAddress: event.target.value })
            }
            placeholder="GST Billing Address"
            className="rounded-xl border border-white/10 bg-black/20 p-3 text-stone-100"
          />
          <input
            value={value.gstNumber}
            maxLength={15}
            onChange={(event) =>
              setValue({
                ...value,
                gstNumber: event.target.value.trim().toUpperCase(),
              })
            }
            placeholder="GST Number"
            className="rounded-xl border border-white/10 bg-black/20 p-3 text-stone-100"
          />
          {message && <p className="text-red-300">{message}</p>}
          <button
            onClick={save}
            className="cursor-pointer rounded-xl bg-amber-400 p-3 font-black text-stone-950 hover:bg-amber-300 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Save GST Details
          </button>
        </div>
      )}
    </DashboardCard>
  );
}

function DashboardCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <h2 className="font-display text-2xl font-bold text-amber-200">{title}</h2>
        {action}
      </div>
      <div className="space-y-2 text-stone-300">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-5 text-center text-stone-500">{text}</p>;
}

function OrderCard({
  order,
  onInvoice,
}: {
  order: Order;
  onInvoice: (order: Order) => void;
}) {
  const badge = getTrackBadge(order.shipment?.status, order.orderStatus);
  return (
    <article className="mb-4 grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[120px_1fr]">
      <div className="relative h-28 overflow-hidden rounded-xl bg-white">
        {order.imageUrl && (
          <Image
            src={order.imageUrl}
            alt={order.productName}
            fill
            className="object-contain p-2"
          />
        )}
      </div>
      <div>
        <div className="flex justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white">{order.productName}</h3>
            <p className="text-sm">
              {order.purity} · {order.weightGrams}g × {order.quantity}
            </p>
          </div>
          <b className="text-amber-300">₹{order.total.toLocaleString("en-IN")}</b>
        </div>
        <div className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
          <p>
            <span>Metal Value</span>: ₹{order.metalValue.toLocaleString("en-IN")}
          </p>
          <p>
            <span>Service Charge</span>: ₹
            {order.serviceCharge.toLocaleString("en-IN")}
          </p>
          <p>
            <span>GST (3%)</span>: ₹{order.gst.toLocaleString("en-IN")}
          </p>
          <p>
            <span>Shipping Cost</span>:{" "}
            {order.shipping === 0 ? "FREE" : `₹${order.shipping}`}
          </p>
          <p>
            <span>Total Payable</span>: ₹{order.total.toLocaleString("en-IN")}
          </p>
          <p>Payment: {order.paymentStatus}</p>
          <p>Shipment: {order.shipment?.status || "ORDER_PLACED"}</p>
        </div>
        {order.deliveryAddress && (
          <p className="mt-3 text-xs text-stone-400">
            Deliver to: {order.deliveryAddress.addressLine1},{" "}
            {order.deliveryAddress.city} – {order.deliveryAddress.pincode}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {order.invoiceNumber && (
            <button
              type="button"
              onClick={() => onInvoice(order)}
              className="cursor-pointer rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-bold text-stone-200 hover:bg-amber-400/10 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Invoice
            </button>
          )}
          <Link
            href={`/shop?buyAgain=${order.productId}`}
            className="cursor-pointer rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-bold text-stone-200 hover:bg-amber-400/10 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Buy Again
          </Link>
          <Link
            href={`/shop/orders/${order.id}/tracking`}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 px-3.5 py-2 text-xs font-black text-stone-950 shadow-md transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <span>Track Order</span>
            <span className="rounded-full bg-stone-950/80 px-2 py-0.5 text-[0.65rem] font-bold text-amber-300">
              {badge.icon} {badge.label}
            </span>
          </Link>
          <Link
            href="/contact-us"
            className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-stone-300 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Need Help
          </Link>
        </div>
      </div>
    </article>
  );
}

function AddressEditor({
  value,
  onChange,
  onSave,
  onClose,
}: {
  value: Address;
  onChange: (value: Address) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const field = (key: keyof Address, label: string) => (
    <label className="text-xs font-bold text-stone-200">
      {label}
      <input
        value={String(value[key] ?? "")}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm grid place-items-center p-4">
      <div className={`${card} w-full max-w-2xl max-h-[90vh] overflow-auto bg-stone-950 border-amber-500/30`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-xl font-black text-amber-200">
            {value.id ? "Edit Saved Address" : "Add New Address"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-stone-400 hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            ✕ Close
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {field("fullName", "Full Name")}
          {field("mobile", "Mobile")}
          {field("addressLine1", "Address Line 1")}
          {field("addressLine2", "Address Line 2")}
          {field("landmark", "Landmark")}
          {field("city", "City")}
          {field("district", "District")}
          {field("state", "State")}
          {field("pincode", "PIN Code")}
        </div>
        <button
          type="button"
          onClick={onSave}
          className="cursor-pointer mt-5 w-full rounded-xl bg-amber-400 p-3.5 font-black text-stone-950 hover:bg-amber-300 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          Save Address
        </button>
      </div>
    </div>
  );
}
