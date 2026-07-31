"use client";
import { useActionState } from "react";
import { processPendingNotificationsAction, retryFailedNotificationsAction, sendTestPushAction, type NotificationActionState } from "@/app/admin/(workspace)/notifications/actions";
const initial:NotificationActionState={message:""};
export function NotificationManualControls({devices}:{devices:Array<{id:string;label:string}>}){
  const [worker,runWorker,workerPending]=useActionState(processPendingNotificationsAction,initial);
  const [retry,retryFailed,retryPending]=useActionState(retryFailedNotificationsAction,initial);
  const [test,sendTest,testPending]=useActionState(sendTestPushAction,initial);
  return <div className="mt-6 grid gap-4 lg:grid-cols-2">
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5"><h2 className="text-xl font-black">Manual Worker Mode</h2><p className="mt-1 text-sm text-amber-900">Vercel automatic scheduling is disabled. Process the protected backend queue here.</p><div className="mt-4 flex flex-wrap gap-3"><form action={runWorker}><button disabled={workerPending} className="rounded-xl bg-stone-950 px-4 py-3 font-bold text-white disabled:opacity-50">{workerPending?"Processing…":"Process Pending Notifications"}</button></form><form action={retryFailed}><button disabled={retryPending} className="rounded-xl border border-stone-400 px-4 py-3 font-bold disabled:opacity-50">{retryPending?"Retrying…":"Retry Failed Notifications"}</button></form></div>{worker.message&&<div className="mt-4 rounded-xl bg-white p-3 text-sm"><p className="font-bold">{worker.message}</p>{worker.processed!==undefined&&<p>Processed: {worker.processed} · Sent: {worker.sent} · Failed: {worker.failed} · Skipped: {worker.skipped}</p>}</div>}{retry.message&&<p className="mt-3 text-sm font-bold">{retry.message}</p>}</section>
    <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Send Test Push</h2><p className="mt-1 text-sm text-stone-600">The selected token stays on the server and is never exposed in this page.</p><form action={sendTest} className="mt-4 grid gap-3"><select required name="deviceId" className="rounded-xl border p-3"><option value="">Select an authenticated device</option>{devices.map(device=><option value={device.id} key={device.id}>{device.label}</option>)}</select><button disabled={testPending||!devices.length} className="rounded-xl bg-amber-400 p-3 font-black disabled:opacity-50">{testPending?"Sending…":"Send Test Push"}</button></form>{test.message&&<p className="mt-3 text-sm font-bold">{test.message}</p>}</section>
  </div>
}
