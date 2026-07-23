export interface LandingFaq {
  q: string;
  a: string;
}

export interface WhatComesAcrossItem {
  title: string;
  body: string;
}

export interface RelatedLink {
  label: string;
  href: string;
}

export interface LandingCopy {
  pathname: string;
  title: string;
  description: string;
  h1: string;
  subhead: string;
  faqs: LandingFaq[];
  ctaLabel?: string;
  ctaHref?: string;
  whatComesAcross?: WhatComesAcrossItem[];
  relatedLinks?: ReadonlyArray<RelatedLink>;
  galleryBadge?: boolean;
}
