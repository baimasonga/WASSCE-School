import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"WASSCE School — Small steps. Stronger results.",description:"Build confidence in WASSCE mathematics with 1,000 practice questions, step-by-step solutions and an offline Android app.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
