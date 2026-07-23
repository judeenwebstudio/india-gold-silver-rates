import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "RateStack Admin",
    template: "%s | RateStack Admin",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
