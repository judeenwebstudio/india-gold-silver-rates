import "server-only";
import { z } from "zod";

const bool=(value:string|undefined)=>value==="true";
const port=z.coerce.number().int().min(1).max(65535);

export function getFirebaseConfig(){
  const enabled=bool(process.env.FIREBASE_ENABLED);
  const config={enabled,projectId:process.env.FIREBASE_PROJECT_ID?.trim()||"",clientEmail:process.env.FIREBASE_CLIENT_EMAIL?.trim()||"",privateKey:(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\\n/g,"\n"),androidPackageName:process.env.FIREBASE_ANDROID_PACKAGE_NAME?.trim()||""};
  const missing=enabled?Object.entries(config).filter(([key,value])=>key!=="enabled"&&!value).map(([key])=>key):[];
  return {...config,valid:!enabled||missing.length===0,missing};
}

export function getEmailConfig(){
  const enabled=bool(process.env.EMAIL_ENABLED),parsedPort=port.safeParse(process.env.SMTP_PORT||"587");
  const config={enabled,provider:(process.env.EMAIL_PROVIDER||"SMTP").toUpperCase(),host:process.env.SMTP_HOST?.trim()||"",port:parsedPort.success?parsedPort.data:587,secure:bool(process.env.SMTP_SECURE),user:process.env.SMTP_USER||"",password:process.env.SMTP_PASSWORD||"",fromName:process.env.SMTP_FROM_NAME||"RateStack",fromEmail:process.env.SMTP_FROM_EMAIL||"",replyTo:process.env.EMAIL_REPLY_TO||"",logoUrl:process.env.EMAIL_LOGO_URL||"",supportEmail:process.env.EMAIL_SUPPORT_EMAIL||"",supportPhone:process.env.EMAIL_SUPPORT_PHONE||"",attachShippingLabel:bool(process.env.EMAIL_ATTACH_SHIPPING_LABEL)};
  const valid=!enabled||(config.provider==="SMTP"&&Boolean(config.host&&config.user&&config.password&&config.fromEmail)&&parsedPort.success);
  return {...config,valid};
}

export function integrationHealth(){
  const firebase=getFirebaseConfig(),email=getEmailConfig();
  return {firebase:{enabled:firebase.enabled,valid:firebase.valid,missing:firebase.missing},email:{enabled:email.enabled,valid:email.valid,provider:email.provider}};
}
