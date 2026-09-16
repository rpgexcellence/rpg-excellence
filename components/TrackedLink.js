"use client";
import Link from "next/link";

export function trackConversion(event,parameters={}){
 if(typeof window!=="undefined"&&typeof window.gtag==="function")window.gtag("event",event,parameters);
}

export default function TrackedLink({href,event,eventParams={},children,className,target,rel}){
 return <Link href={href} className={className} target={target} rel={rel} onClick={()=>trackConversion(event,eventParams)}>{children}</Link>;
}
