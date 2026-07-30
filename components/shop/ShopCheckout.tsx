"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open(): void } } }
type Address = { id?: string; fullName: string; mobile: string; addressLine1: string; addressLine2: string; landmark: string; city: string; district: string; state: string; pincode: string; country: "India"; addressType: "HOME" | "OFFICE" | "OTHER"; isDefault?: boolean };
type Product = { id: string; name: string; metalType: string; purity: string; imageUrl: string; ratePerGram: number; rateSource: string; rateDate: string; weights: number[]; prices: Record<string, { metalValue: number; serviceCharge: number; gst: number; shipping: number; total: number }> };
const emptyAddress: Address = { fullName: "", mobile: "", addressLine1: "", addressLine2: "", landmark: "", city: "", district: "", state: "", pincode: "", country: "India", addressType: "HOME" };

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
  const [addressMode, setAddressMode] = useState<"SAVED" | "NEW">("NEW");
  const [error, setError] = useState(""); const [success, setSuccess] = useState<{ orderNumber: string; paymentId: string; amount: number } | null>(null);
  const token = typeof window === "undefined" ? "" : localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token") || "";
  const unit = product?.prices[String(weight)]; const price = unit ? { metalValue: unit.metalValue * quantity, serviceCharge: unit.serviceCharge * quantity, gst: unit.gst * quantity, shipping: unit.shipping * quantity, total: unit.total * quantity } : null;
  const valid = useMemo(() => customer.fullName.trim().length >= 2 && /^(?:\+91)?[6-9]\d{9}$/.test(customer.mobile.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) && address.fullName.trim().length >= 2 && /^(?:\+91)?[6-9]\d{9}$/.test(address.mobile.trim()) && address.addressLine1.trim().length >= 3 && address.city.trim().length >= 2 && address.district.trim().length >= 2 && address.state.trim().length >= 2 && /^[1-9]\d{5}$/.test(address.pincode), [customer, address]);

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
      const list = saved.data || []; setAddresses(list); if (list[0]) { setAddress(list.find((item: Address) => item.isDefault) || list[0]); setAddressMode("SAVED"); }
      else setAddress(current => ({ ...current, fullName: profile.data?.fullName || "", mobile: profile.data?.phone || "" }));
      setGatewayConfig(config); setGateway(config.activeGateway === "PHONEPE" ? "PHONEPE" : "RAZORPAY");
    }).catch(e => setError(e instanceof Error ? e.message : "Unable to load checkout."));
  }, [productId, quantity, token, weight]);

  function selectAddress(id: string) { const selected = addresses.find(item => item.id === id); if (selected) { setAddress(selected); setAddressMode("SAVED"); } }
  async function updateSavedAddress() {
    if (!address.id || !valid) return;
    const response = await fetch(`/api/v1/me/addresses/${address.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(address) });
    const body = await response.json(); if (!response.ok) { setError(body.error?.message || "Unable to update address."); return; }
    setAddresses(items => items.map(item => item.id === address.id ? body.data : item)); setAddress(body.data); setError("");
  }
  async function deleteSavedAddress(id = address.id) {
    if (!id) return;
    const response = await fetch(`/api/v1/me/addresses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json(); if (!response.ok) { setError(body.error?.message || "Unable to delete address."); return; }
    const remaining = addresses.filter(item => item.id !== id); setAddresses(remaining); setAddress(remaining.find(item=>item.isDefault)||remaining[0]||emptyAddress);
  }
  async function setDefaultAddress(id: string) {
    const response = await fetch(`/api/v1/me/addresses/${id}/default`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json(); if (!response.ok) { setError(body.error?.message || "Unable to set default address."); return; }
    setAddresses(items => items.map(item => ({ ...item, isDefault: item.id === id }))); setAddress(body.data);
  }
  async function beginReview() {
    if (!valid) { setError("Complete all required customer and delivery fields."); return; }
    if (addressMode === "NEW" && (saveAddress || addresses.length === 0)) {
      const response = await fetch("/api/v1/me/addresses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...address, isDefault: addresses.length === 0 || Boolean(address.isDefault) }) });
      const body = await response.json(); if (!response.ok) { setError(body.error?.message || "Unable to save address."); return; }
      setAddresses(items => [...items.map(item => ({ ...item, isDefault: body.data.isDefault ? false : item.isDefault })), body.data]);
      setAddress(body.data); setAddressMode("SAVED");
    }
    setError(""); setReview(true); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function pay() {
    if (!valid || !product || !price || busy) return; setBusy(true); setError("");
    try {
      const idempotencyKey = sessionStorage.getItem("shop_checkout_key") || crypto.randomUUID();
      sessionStorage.setItem("shop_checkout_key", idempotencyKey);
      const response = await fetch("/api/v1/shop/checkout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId, weightGrams: weight, quantity, gateway, idempotencyKey, customer, ...(address.id ? { addressId: address.id } : { newAddress: address }) }) });
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
      <AddressSection addresses={addresses} selected={address} mode={addressMode} saveAddress={saveAddress} onSelect={selectAddress} onAddNew={()=>{setAddressMode("NEW");setAddress({...emptyAddress,fullName:customer.fullName,mobile:customer.mobile});}} onChange={setAddress} onSaveToggle={setSaveAddress} onUpdate={updateSavedAddress} onDelete={deleteSavedAddress} onDefault={setDefaultAddress}/><button onClick={beginReview} disabled={!valid} className="w-full rounded-xl bg-amber-500 p-4 font-black disabled:opacity-50">Review Order</button></>}
      {review && <div className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">3. Order Review</h2><p className="mt-3 font-bold">{customer.fullName} · {customer.mobile} · {customer.email}</p><p className="mt-2 text-stone-600">{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}, {address.city}, {address.district}, {address.state} – {address.pincode}, India ({address.addressType})</p><div className="mt-5"><p className="font-black">4. Payment</p><div className="mt-2 flex gap-3">{gatewayConfig.razorpay?.enabled && <button className={`rounded-xl border p-3 ${gateway==="RAZORPAY"?"border-amber-500 bg-amber-50":""}`} onClick={()=>setGateway("RAZORPAY")}>Razorpay</button>}{gatewayConfig.phonepe?.enabled && <button className={`rounded-xl border p-3 ${gateway==="PHONEPE"?"border-amber-500 bg-amber-50":""}`} onClick={()=>setGateway("PHONEPE")}>PhonePe</button>}</div></div><div className="mt-5 flex gap-3"><button onClick={()=>setReview(false)} className="rounded-xl border px-5 py-3 font-bold">Edit Details</button><button onClick={pay} disabled={busy} className="flex-1 rounded-xl bg-amber-500 px-5 py-3 font-black disabled:opacity-50">{busy ? "Starting secure payment…" : `Confirm & Pay ₹${price.total.toLocaleString("en-IN")}`}</button></div></div>}
    </div><OrderSummary product={product} weight={weight} quantity={quantity} price={price}/></div>
  </div>;
}

function Field({ label, value, onChange, type="text", error="" }: { label:string; value:string; onChange:(value:string)=>void; type?:string; error?:string }) { return <label className="text-sm font-bold">{label}<input required type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/>{error && <span className="mt-1 block text-xs text-red-700">{error}</span>}</label>; }
function AddressSection({addresses,selected,mode,saveAddress,onSelect,onAddNew,onChange,onSaveToggle,onUpdate,onDelete,onDefault}:{addresses:Address[];selected:Address;mode:"SAVED"|"NEW";saveAddress:boolean;onSelect:(id:string)=>void;onAddNew:()=>void;onChange:(address:Address)=>void;onSaveToggle:(value:boolean)=>void;onUpdate:()=>void;onDelete:(id?:string)=>void;onDefault:(id:string)=>void}) {
  return <fieldset className="rounded-2xl border bg-white p-5"><legend className="px-2 text-lg font-black">2. Choose Delivery Address</legend>
    {addresses.length > 0 && <><div className="mb-4 flex flex-wrap gap-3"><button type="button" onClick={()=>onSelect((addresses.find(a=>a.isDefault)||addresses[0]).id!)} className={`rounded-xl border px-4 py-3 font-bold ${mode==="SAVED"?"border-amber-500 bg-amber-50":""}`}>Use Saved Address</button><button type="button" onClick={onAddNew} className={`rounded-xl border px-4 py-3 font-bold ${mode==="NEW"?"border-amber-500 bg-amber-50":""}`}>Add New Delivery Address</button></div>
      {mode==="SAVED" && <div className="grid gap-3">{addresses.map(item=><article key={item.id} className={`rounded-2xl border-2 p-4 ${selected.id===item.id?"border-amber-500 bg-amber-50/50":"border-stone-200"}`}><div className="flex justify-between gap-3"><div><p className="font-black">{item.fullName} · {item.mobile}</p><p className="mt-1 text-sm">{item.addressLine1}{item.addressLine2?`, ${item.addressLine2}`:""}{item.landmark?`, Near ${item.landmark}`:""}</p><p className="text-sm">{item.city}, {item.district}, {item.state} – {item.pincode}</p><p className="mt-1 text-xs font-bold uppercase">{item.addressType}</p></div>{item.isDefault&&<span className="h-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Default</span>}</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>onSelect(item.id!)} className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white">Deliver to this address</button><button type="button" onClick={()=>onSelect(item.id!)} className="rounded-lg border px-3 py-2 text-xs font-bold">Edit</button><button type="button" onClick={()=>onDelete(item.id)} disabled={addresses.length===1} className="rounded-lg border px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40">Delete</button>{!item.isDefault&&<button type="button" onClick={()=>onDefault(item.id!)} className="rounded-lg border px-3 py-2 text-xs font-bold">Set as default</button>}</div></article>)}</div>}</>}
    <div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Full Name" value={selected.fullName} onChange={v=>onChange({...selected,fullName:v})}/><Field label="Mobile Number" value={selected.mobile} onChange={v=>onChange({...selected,mobile:v})}/><Field label="Address Line 1" value={selected.addressLine1} onChange={v=>onChange({...selected,addressLine1:v})}/><Field label="Address Line 2 (optional)" value={selected.addressLine2} onChange={v=>onChange({...selected,addressLine2:v})}/><Field label="Landmark (optional)" value={selected.landmark} onChange={v=>onChange({...selected,landmark:v})}/><Field label="City" value={selected.city} onChange={v=>onChange({...selected,city:v})}/><Field label="District" value={selected.district} onChange={v=>onChange({...selected,district:v})}/><Field label="State" value={selected.state} onChange={v=>onChange({...selected,state:v})}/><Field label="PIN Code" value={selected.pincode} onChange={v=>onChange({...selected,pincode:v.replace(/\D/g,"").slice(0,6)})}/><label className="text-sm font-bold">Address type<select className="mt-1 w-full rounded-xl border p-3" value={selected.addressType} onChange={e=>onChange({...selected,addressType:e.target.value as Address["addressType"]})}><option value="HOME">Home</option><option value="OFFICE">Office</option><option value="OTHER">Other</option></select></label></div>
    {mode==="NEW"&&<div className="mt-4 flex flex-wrap gap-5"><label className="flex gap-2 text-sm"><input type="checkbox" checked={addresses.length===0||saveAddress} disabled={addresses.length===0} onChange={e=>onSaveToggle(e.target.checked)}/> Save this address for future orders</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={Boolean(selected.isDefault)||addresses.length===0} disabled={addresses.length===0} onChange={e=>onChange({...selected,isDefault:e.target.checked})}/> Make this my default address</label></div>}
    {mode==="SAVED"&&selected.id&&<div className="mt-4 flex gap-3"><button type="button" onClick={onUpdate} className="rounded-lg border px-3 py-2 text-sm font-bold">Save address edits</button></div>}
  </fieldset>;
}
function OrderSummary({ product, weight, quantity, price }: { product:Product; weight:number; quantity:number; price:{metalValue:number;serviceCharge:number;gst:number;shipping:number;total:number} }) { return <aside className="h-fit rounded-2xl border bg-white p-5 lg:sticky lg:top-24"><div className="flex gap-4"><div className="relative h-24 w-24"><Image src={product.imageUrl} alt={product.name} fill className="object-contain"/></div><div><h2 className="font-black">{product.name}</h2><p>{product.metalType} · {product.purity}</p><p>{weight}g × {quantity}</p></div></div><div className="mt-5 space-y-2 border-t pt-4 text-sm"><p>Live rate: ₹{product.ratePerGram.toLocaleString("en-IN")}/g</p><p>Source: {product.rateSource}</p><p>Rate date: {product.rateDate ? new Date(product.rateDate).toLocaleString("en-IN") : "Latest verified"}</p><Row label="Metal Value" value={price.metalValue}/><Row label="Service Charge" value={price.serviceCharge}/><Row label="GST (3%)" value={price.gst}/><div className="flex justify-between"><span>Shipping Cost</span><b className="text-emerald-700">{price.shipping===0?"FREE":`₹${price.shipping}`}</b></div><div className="flex justify-between border-t pt-3 text-lg"><b>Grand Total</b><b>₹{price.total.toLocaleString("en-IN")}</b></div></div></aside>; }
function Row({label,value}:{label:string;value:number}) { return <div className="flex justify-between"><span>{label}</span><b>₹{value.toLocaleString("en-IN")}</b></div>; }
