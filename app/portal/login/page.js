import RpgSignInFrame from "../../../components/RpgSignInFrame";
import Link from "next/link";
import { signIn, signInWithApple, signInWithGoogle, signInWithMicrosoft, signUp } from "./actions";
import NewsletterSignup from "../../../components/NewsletterSignup";

export const metadata = { title: "Sign in | RPG Intelligence", description: "Secure access to the RPG Intelligence business assurance workspace." };
const safeNext=value=>{const next=String(value||"");return next.startsWith("/")&&!next.startsWith("//")?next:"/portal"};

export default async function LoginPage({searchParams}) {
  const params=await searchParams,next=safeNext(params?.next),message=params?.error||params?.message||"",creating=params?.mode==="create";
  return <RpgSignInFrame title={creating ? "Create your free account" : "Welcome back"}
    introduction={creating ? "Start your assurance journey. No payment card is required." : "Sign in to continue your assurance and compliance journey."}>
      {message&&<div className="loginMessage" role="alert">{message}</div>}
      <form className="loginForm"><input type="hidden" name="next" value={next}/><label>Email address<input type="email" name="email" placeholder="you@company.com" autoComplete="email" required/></label><label>Password<input type="password" name="password" placeholder="Minimum 8 characters" autoComplete={creating?"new-password":"current-password"} minLength={8} required/></label><div className="formOptions"><label className="remember"><input type="checkbox" name="remember"/> Keep me signed in</label><Link className="forgotButton" href={`/portal/forgot-password?next=${encodeURIComponent(next)}`}>Forgot password?</Link></div>{creating?<><button className="primaryButton" formAction={signUp}>Create free account →</button><button className="createButton" formAction={signIn}>Already registered? Sign in</button></>:<><button className="primaryButton" formAction={signIn}>Sign in securely →</button><button className="createButton" formAction={signUp}>Create an account</button></>}</form>
      <div className="divider"><span>or continue with</span></div>
      <form className="socialLogin"><input type="hidden" name="next" value={next}/><button className="socialButton googleButton" formAction={signInWithGoogle} aria-label="Continue with Google"><b className="googleMark">G</b>Continue with Google</button><button className="socialButton microsoftButton" formAction={signInWithMicrosoft} aria-label="Continue with Microsoft"><span className="microsoftMark" aria-hidden="true"><i/><i/><i/><i/></span>Continue with Microsoft</button><button className="socialButton appleButton" formAction={signInWithApple} aria-label="Continue with Apple"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.79 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.1v-.01ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z"/></svg>Continue with Apple</button></form>
      <p className="legal">By continuing, you agree to our <Link href="/en/terms">Terms</Link> and acknowledge our <Link href="/en/privacy">Privacy Policy</Link>.</p><div className="trust"><span>🔒 Encrypted access</span><span>UK GDPR aligned</span></div>
      <div style={{marginTop:"18px",padding:"15px",border:"1px solid #d8e3ee",borderRadius:"10px",background:"#fff"}}><b style={{display:"block",marginBottom:"3px",fontSize:"12px"}}>RPG Insights</b><span style={{display:"block",marginBottom:"10px",color:"#6c8093",fontSize:"10px"}}>Optional ISO and assurance updates.</span><NewsletterSignup locale="en" source="login" compact /></div>
  </RpgSignInFrame>;
}
