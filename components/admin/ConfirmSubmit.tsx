"use client";

export function ConfirmSubmit({children,message,className,disabled=false}:{children:React.ReactNode;message:string;className?:string;disabled?:boolean}){
  return <button type="submit" disabled={disabled} onClick={event=>{if(!window.confirm(message))event.preventDefault();}} className={className}>{children}</button>;
}
