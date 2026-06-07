# Security Policy

The canonical version of this policy lives at <https://2anki.net/security>.

## Report a vulnerability

Email **support@2anki.net** with details of what you found.

## What to include

A clear write-up of the issue, steps to reproduce it, what you were able to
access or affect, and how severe you think it is. A working proof of concept is
helpful but not required.

## Scope

**In scope:** 2anki.net and its subdomains, the API, authentication flows, file
upload and conversion, user data, and the `2anki/server` GitHub repository.

**Out of scope:** third-party services we integrate with (Notion, Stripe,
Anthropic, AnkiWeb), social engineering, physical attacks, denial of service
without a working amplification proof of concept, automated scanner output
without a reproducible exploit, missing security headers or version disclosure
without demonstrated impact, and findings on forks or preview deploys.

## Response time

We acknowledge reports within 5 business days. We aim to resolve critical issues
within 30 days. This is best-effort — 2anki is a small team. If you have not
heard back in a week, follow up at the same address.

## Rewards

No monetary bounty. If you would like to be credited, say so in your report and
we will add your name to the acknowledgements once the issue is resolved.

## Acknowledgements

- [endscene665](https://github.com/endscene665) — server-side request forgery in
  the Notion bookmark and media fetch. Fixed May 2026.
