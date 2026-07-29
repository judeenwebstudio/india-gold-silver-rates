export const CONTACT_EMAIL = "info@ratestack.in";
export const BIS_CERTIFICATE = "HM/C-6590483527";

export const FOOTER_LINKS = [
  { label: "About Us", href: "/about-us" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Shipping Policy", href: "/shipping-policy" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact Us", href: "/contact-us" },
] as const;

export const SOCIAL_LINKS = [
  { label: "Facebook", url: process.env.NEXT_PUBLIC_FACEBOOK_URL },
  { label: "Twitter / X", url: process.env.NEXT_PUBLIC_TWITTER_URL },
  { label: "Instagram", url: process.env.NEXT_PUBLIC_INSTAGRAM_URL },
].filter((item): item is { label: string; url: string } => Boolean(item.url));

export const FOOTER_DESCRIPTION =
  "Live gold and silver rate information with a secure direct coin-purchase experience.";
