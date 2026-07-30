"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open(): void } } }
type Address = { id?: string; addressLine1: string; addressLine2: string; landmark: string; city: string; district: string; state: string; pincode: string; country: "India"; addressType: "HOME" | "OFFICE" | "OTHER"; isDefault?: boolean };
type Product = { id: string; name: string; metalType: string; purity: string; imageUrl: string; ratePerGram: number; rateSource: string; rateDate: string; weights: number[]; prices: Record<string, { metalValue: number; serviceCharge: number; gst: number; shipping: number; total: number }> };
const emptyAddress: Address = { addressLine1: "", addressLine2: "", landmark: "", city: "", district: "", state: "", pincode: "", country: "India", addressType: "HOME" };

async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(); script.onerror = () => reject(new Error("Unable to load Razorpay.")); document.head.appendChild(script);
  });
}

export function ShopCheckout() {
  const params = useSearchParams();
  const productId = params.get("productId") || ""; const weight = Number(params.get("weight")); const quantity = Number(params.get("quantity"));
  const [product, setProduct] = useState<Product | null>(null);
  const [customer, setCustomer] = useState({ fullName: "", mobile: "", email: "" });
  const [address, setAddress] = useState<Address>(emptyAddress); const [addresses, setAddresses] = useState<Address[]>([]);
  const [gateway, setGateway] = useState<"RAZORPAY" | "PHONEPE">("RAZORPAY"); const [gatewayConfig, setGatewayConfig] = useState<{ razorpay?: { enabled: boolean }; phonepe?: { enabled: boolean }; activeGateway?: string }>({});
  const [saveAddress, setSaveAddress] = useState(true); const [review, setReview] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [success, setSuccess] = useState<{ orderNumber: string; paymentId: string; amount: number } | null>(null);
  const token = typeof window === "undefined" ? "" : localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token") || "";
  const unit = product?.prices[String(weight)]; const price = unit ? { metalValue: unit.metalValue * quantity, serviceCharge: unit.serviceCharge * quantity, gst: unit.gst * quantity, shipping: unit.shipping * quantity, total: unit.total * quantity } : null;
  const valid = useMemo(() => customer.fullName.trim().length >= 2 && /^(?:\+91)?[6-9]\d{9}$/.test(customer.mobile.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) && address.addressLine1.trim().length >= 3 && address.city.trim().length >= 2 && address.district.trim().length >= 2 && address.state.trim().length >= 2 && /^[1-9]\d{5}$/.test(address.pincode), [customer, address]);

  useEffect(() => {
    if (!token) { window.location.replace("/shop"); return; }
    Promise.all([
      fetch("/api/v1/shop", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/v1/me/profile", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/v1/me/addresses", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/v1/payment/config").then(r => r.json()),
    ]).then(([shop, profile, saved, config]) => {
      const selected = shop.data?.products?.find((p: Product) => p.id === productId);
      if (!selected || !selected.weights.includes(weight) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error("Invalid product selection.");
      setProduct(selected); setCustomer({ fullName: profile.data?.fullName || "", mobile: profile.data?.phone || "", email: profile.data?.email || "" });
      const list = saved.data || []; setAddresses(list); if (list[0]) setAddress(list[0]);
      setGatewayConfig(config); setGateway(config.activeGateway === "PHONEPE" ? "PHONEPE" : "RAZORPAY");
    }).catch(e => setError(e instanceof Error ? e.message : "Unable to load checkout."));
  }, [productId, quantity, token, weight]);

  function selectAddress(id: string) { const selected = addresses.find(item => item.id === id); if (selected) setAddress(selected); else setAddress(emptyAddress); }
  async function updateSavedAddress() {
    if (!address.id || !valid) return;
    const response = await fetch(`/api/v1/me/addresses/${address.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(address) });
    const body = await response.json(); if (!response.ok) { setError(body.error?.message || "Unable to update address."); return; }
    setAddresses(items => items.map(item => item.id === address.id ? body.data : item)); setAddress(body.data); setError("");
  }
  async function deleteSavedAddress() {
    if (!address.id) return;
    const response = await fetch(`/api/v1/me/addresses/${address.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) { setError("Unable to delete address."); return; }
    setAddresses(items => items.filter(item => item.id !== address.id)); setAddress(emptyAddress);
  }
  function beginReview() { if (!valid) { setError("Complete all required customer and delivery fields."); return; } setError(""); setReview(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function pay() {
    if (!valid || !product || !price || busy) return; setBusy(true); setError("");
    try {
      const idempotencyKey = sessionStorage.getItem("shop_checkout_key") || crypto.randomUUID();
      sessionStorage.setItem("shop_checkout_key", idempotencyKey);
      const response = await fetch("/api/v1/shop/checkout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId, weightGrams: weight, quantity, gateway, idempotencyKey, customer, address: { ...address, saveAddress: saveAddress && !address.id } }) });
      const body = await response.json(); if (!response.ok || !body.success) throw new Error(body.error?.message || "Payment could not be started.");
      if (Math.round(body.data.amount * 100) !== Math.round(price.total * 100)) throw new Error("The live price changed. Please review the refreshed total.");
      if (gateway === "PHONEPE") { if (!body.data.redirectUrl) throw new Error("PhonePe is unavailable."); window.location.assign(body.data.redirectUrl); return; }
      await loadRazorpay();
      new window.Razorpay!({ key: body.data.keyId, order_id: body.data.gatewayOrderId, amount: Math.round(body.data.amount * 100), currency: body.data.currency, name: "RateStack Shop", description: `${product.name} — ${weight}g`,
        handler: async (result: Record<string, string>) => {
          const verify = await fetch("/api/v1/shop/verify", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ shopOrderId: body.data.shopOrderId, gatewayPaymentId: result.razorpay_payment_id, gatewaySignature: result.razorpay_signature }) });
          const verified = await verify.json(); if (!verify.ok || !verified.success) { setError(verified.error?.message || "Payment verification failed."); setBusy(false); return; }
          sessionStorage.removeItem("shop_checkout_key"); setSuccess({ orderNumber: verified.data.orderNumber, paymentId: result.razorpay_payment_id, amount: body.data.amount });
        }, modal: { ondismiss: () => { setError("Payment was cancelled. Your pending order is available to retry."); setBusy(false); } } }).open();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Payment failed."); setBusy(false); }
  }

  if (success) return <div className="rounded-3xl border bg-white p-8 shadow-xl"><p className="text-sm font-black uppercase text-emerald-700">Payment successful</p><h1 className="mt-2 text-3xl font-black">Thank you for your order</h1><div className="mt-6 space-y-2"><p>RateStack order ID: <b>{success.orderNumber}</b></p><p>Payment ID: <b>{success.paymentId}</b></p><p>{product?.name} · {weight}g × {quantity}</p><p>Amount paid: <b>₹{success.amount.toLocaleString("en-IN")}</b></p><p>Delivery: {address.addressLine1}, {address.city}, {address.state} – {address.pincode}</p><p>Estimated delivery information will be shared after processing.</p></div><Link href="/shop/orders" className="mt-6 inline-block rounded-xl bg-amber-500 px-5 py-3 font-black">View My Orders</Link></div>;
  if (!product || !price) return <p className="py-20 text-center">{error || "Loading secure checkout…"}</p>;
  return <div className="space-y-6"><div><p className="text-sm font-black uppercase text-amber-700">Secure checkout</p><h1 className="text-3xl font-black">{review ? "Review and pay" : "Customer and delivery details"}</h1><p className="text-stone-600">Customer Details · Delivery Address · Order Review · Payment</p></div>{error && <p role="alert" className="rounded-xl bg-red-50 p-4 font-semibold text-red-800">{error}</p>}
    <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]"><div className="space-y-6">
      {!review && <><fieldset className="rounded-2xl border bg-white p-5"><legend className="px-2 text-lg font-black">1. Customer Details</legend><div className="grid gap-4 md:grid-cols-2"><Field label="Full Name" value={customer.fullName} onChange={v=>setCustomer({...customer,fullName:v})}/><Field label="Mobile Number" value={customer.mobile} onChange={v=>setCustomer({...customer,mobile:v})} error={customer.mobile && !/^(?:\+91)?[6-9]\d{9}$/.test(customer.mobile) ? "Enter a valid Indian mobile number." : ""}/><Field label="Email Address" value={customer.email} onChange={v=>setCustomer({...customer,email:v})} type="email"/></div></fieldset>
      <fieldset className="rounded-2xl border bg-white p-5"><legend className="px-2 text-lg font-black">2. Delivery Address</legend>{addresses.length > 0 && <label className="mb-4 block text-sm font-bold">Saved address<select className="mt-1 w-full rounded-xl border p-3" value={address.id || ""} onChange={e=>selectAddress(e.target.value)}><option value="">Add a new address</option>{addresses.map(a=><option key={a.id} value={a.id}>{a.addressType}: {a.addressLine1}, {a.city}{a.isDefault ? " (Default)" : ""}</option>)}</select></label>}<div className="grid gap-4 md:grid-cols-2"><Field label="Address Line 1" value={address.addressLine1} onChange={v=>setAddress({...address,addressLine1:v})}/><Field label="Address Line 2 (optional)" value={address.addressLine2} onChange={v=>setAddress({...address,addressLine2:v})}/><Field label="Landmark (optional)" value={address.landmark} onChange={v=>setAddress({...address,landmark:v})}/><Field label="City" value={address.city} onChange={v=>setAddress({...address,city:v})}/><Field label="District" value={address.district} onChange={v=>setAddress({...address,district:v})}/><Field label="State" value={address.state} onChange={v=>setAddress({...address,state:v})}/><Field label="PIN Code" value={address.pincode} onChange={v=>setAddress({...address,pincode:v.replace(/\D/g,"").slice(0,6)})} error={address.pincode && !/^[1-9]\d{5}$/.test(address.pincode) ? "Enter exactly six digits." : ""}/><label className="text-sm font-bold">Address type<select className="mt-1 w-full rounded-xl border p-3" value={address.addressType} onChange={e=>setAddress({...address,addressType:e.target.value as Address["addressType"]})}><option value="HOME">Home</option><option value="OFFICE">Office</option><option value="OTHER">Other</option></select></label></div>{address.id ? <div className="mt-4 flex flex-wrap gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(address.isDefault)} onChange={e=>setAddress({...address,isDefault:e.target.checked})}/> Default address</label><button type="button" onClick={updateSavedAddress} className="rounded-lg border px-3 py-2 text-sm font-bold">Update saved address</button><button type="button" onClick={deleteSavedAddress} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700">Delete</button></div> : <label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={saveAddress} onChange={e=>setSaveAddress(e.target.checked)}/> Save this address to my account</label>}</fieldset><button onClick={beginReview} disabled={!valid} className="w-full rounded-xl bg-amber-500 p-4 font-black disabled:opacity-50">Review Order</button></>}
      {review && <div className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">3. Order Review</h2><p className="mt-3 font-bold">{customer.fullName} · {customer.mobile} · {customer.email}</p><p className="mt-2 text-stone-600">{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}, {address.city}, {address.district}, {address.state} – {address.pincode}, India ({address.addressType})</p><div className="mt-5"><p className="font-black">4. Payment</p><div className="mt-2 flex gap-3">{gatewayConfig.razorpay?.enabled && <button className={`rounded-xl border p-3 ${gateway==="RAZORPAY"?"border-amber-500 bg-amber-50":""}`} onClick={()=>setGateway("RAZORPAY")}>Razorpay</button>}{gatewayConfig.phonepe?.enabled && <button className={`rounded-xl border p-3 ${gateway==="PHONEPE"?"border-amber-500 bg-amber-50":""}`} onClick={()=>setGateway("PHONEPE")}>PhonePe</button>}</div></div><div className="mt-5 flex gap-3"><button onClick={()=>setReview(false)} className="rounded-xl border px-5 py-3 font-bold">Edit Details</button><button onClick={pay} disabled={busy} className="flex-1 rounded-xl bg-amber-500 px-5 py-3 font-black disabled:opacity-50">{busy ? "Starting secure payment…" : `Confirm & Pay ₹${price.total.toLocaleString("en-IN")}`}</button></div></div>}
    </div><OrderSummary product={product} weight={weight} quantity={quantity} price={price}/></div>
  </div>;
}

function Field({ label, value, onChange, type="text", error="" }: { label:string; value:string; onChange:(value:string)=>void; type?:string; error?:string }) { return <label className="text-sm font-bold">{label}<input required type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/>{error && <span className="mt-1 block text-xs text-red-700">{error}</span>}</label>; }
function OrderSummary({ product, weight, quantity, price }: { product:Product; weight:number; quantity:number; price:{metalValue:number;serviceCharge:number;gst:number;shipping:number;total:number} }) { return <aside className="h-fit rounded-2xl border bg-white p-5 lg:sticky lg:top-24"><div className="flex gap-4"><div className="relative h-24 w-24"><Image src={product.imageUrl} alt={product.name} fill className="object-contain"/></div><div><h2 className="font-black">{product.name}</h2><p>{product.metalType} · {product.purity}</p><p>{weight}g × {quantity}</p></div></div><div className="mt-5 space-y-2 border-t pt-4 text-sm"><p>Live rate: ₹{product.ratePerGram.toLocaleString("en-IN")}/g</p><p>Source: {product.rateSource}</p><p>Rate date: {product.rateDate ? new Date(product.rateDate).toLocaleString("en-IN") : "Latest verified"}</p><Row label="Metal Value" value={price.metalValue}/><Row label="Service Charge" value={price.serviceCharge}/><Row label="GST (3%)" value={price.gst}/><div className="flex justify-between"><span>Shipping Cost</span><b className="text-emerald-700">{price.shipping===0?"FREE":`₹${price.shipping}`}</b></div><div className="flex justify-between border-t pt-3 text-lg"><b>Grand Total</b><b>₹{price.total.toLocaleString("en-IN")}</b></div></div></aside>; }
function Row({label,value}:{label:string;value:number}) { return <div className="flex justify-between"><span>{label}</span><b>₹{value.toLocaleString("en-IN")}</b></div>; }
