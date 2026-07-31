import { prisma } from "@/lib/prisma";
import { integrationHealth } from "@/lib/notifications/config";
import { NotificationManualControls } from "./NotificationManualControls";
const mask=(email:string|null)=>email?email.replace(/^(.{1,2}).*(@.*)$/,"$1***$2"):"No email";
export async function NotificationOperations(){
  const health=integrationHealth();
  const [activeAndroid,pending,failed,lastSuccess,lastFailure,devices]=await Promise.all([
    prisma.pushDeviceToken.count({where:{platform:"ANDROID",isActive:true}}),
    prisma.notificationOutbox.count({where:{channel:"PUSH",status:"PENDING"}}),
    prisma.notificationOutbox.count({where:{channel:"PUSH",status:"FAILED"}}),
    prisma.notificationOutbox.findFirst({where:{channel:"PUSH",status:"SENT"},orderBy:{sentAt:"desc"},select:{sentAt:true}}),
    prisma.notificationOutbox.findFirst({where:{channel:"PUSH",status:"FAILED"},orderBy:{failedAt:"desc"},select:{failedAt:true,failureReason:true}}),
    prisma.pushDeviceToken.findMany({where:{platform:"ANDROID",isActive:true},select:{id:true,deviceName:true,customer:{select:{fullName:true,email:true}}},orderBy:{lastSeenAt:"desc"},take:200}),
  ]);
  const configured=(value:boolean)=>value?"Configured":"Missing";
  return <><section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Firebase Health</h2><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4"><p>FIREBASE_ENABLED: <b>{health.firebase.enabled?"Enabled":"Disabled"}</b></p><p>Project ID: <b>{configured(health.firebase.projectIdConfigured)}</b></p><p>Client email: <b>{configured(health.firebase.clientEmailConfigured)}</b></p><p>Private key: <b>{configured(health.firebase.privateKeyConfigured)}</b></p><p>Android package: <b>{health.firebase.androidPackageName}</b></p><p>Active Android devices: <b>{activeAndroid}</b></p><p>Pending push: <b>{pending}</b></p><p>Failed push: <b>{failed}</b></p><p>Last successful send: <b>{lastSuccess?.sentAt?.toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})||"Never"}</b></p><p className="sm:col-span-2">Last Firebase error: <b>{lastFailure?.failureReason||"None"}</b></p></div></section><NotificationManualControls devices={devices.map(device=>({id:device.id,label:`${device.customer.fullName} · ${mask(device.customer.email)} · ${device.deviceName||"Android device"}`}))}/></>
}
