"use client";
import {useEffect} from "react";
export default function ConversionEvent({event,parameters={}}){
 useEffect(()=>{let attempts=0;const send=()=>{if(typeof window.gtag==="function"){window.gtag("event",event,parameters);return}if(attempts++<10)setTimeout(send,500)};send()},[event]);
 return null;
}
