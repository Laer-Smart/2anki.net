# Email template rules

All templates live in `src/services/EmailService/templates/`. The reference is `inactivity-warning.html` — every other template must match it structurally.

## Required in every template

**Header row** — mascot logo, identical in all templates:
```html
<td class="email-header" style="text-align: center; padding: 24px; border-bottom: 1px solid #e5e7eb;">
  <img src="https://2anki.net/mascot/navbar-logo.png" alt="2anki" width="120" style="display: block; margin: 0 auto; height: auto;" />
</td>
```

**Dark-mode block** (inside `<style>`):
```css
@media (prefers-color-scheme: dark) {
  body { background-color: #1a1a1a !important; }
  .email-card { background-color: #111827 !important; }
  .email-header { color: #f9fafb !important; border-bottom-color: #374151 !important; }
  .email-body p { color: #f9fafb !important; }
  .email-cta a { background-color: #60a5fa !important; }
  .email-footer { color: #6b7280 !important; border-top-color: #374151 !important; }
}
```

**Responsive block** (inside `<style>`):
```css
@media only screen and (max-width: 600px) {
  .email-card { width: 100% !important; padding: 0 !important; }
  .email-body { padding: 24px 16px !important; }
  .email-header { padding: 16px !important; }
  .email-footer { padding: 12px 16px !important; }
}
```

**Footer row** — identical tagline in all templates:
```html
2anki.net — Turn what you study into Anki flashcards
```

## Color palette

| Token | Hex | Use |
|---|---|---|
| CTA button (light) | `#3b82f6` | All action buttons |
| CTA button (dark) | `#60a5fa` | Dark-mode override |
| Body text | `#374151` | Paragraph copy |
| Muted / footer | `#9ca3af` | Footer, fine print |
| Card background | `#ffffff` / `#111827` | Light / dark |
| Border | `#e5e7eb` / `#374151` | Light / dark dividers |

## Copy rules (per VOICE.md)

- Sentence case on button labels — "Verify email", "Log in", "Reset password", "Download deck"
- No "my" in button labels — "Verify email" not "Verify my email"
- Sign-off: "The 2anki Team" — no "Happy learning", no "Happy studying", no exclamation marks
- Transactional emails (auth, deck delivery, subscription) do not need an unsubscribe footer
- Commercial emails (those containing an upgrade, pass, or upsell pitch) **must** carry the unsubscribe footer link and their send paths **must** exclude `email_preferences.marketing_opt_out = true` users

## Commercial templates (must carry unsubscribe footer + marketing_opt_out filter)

The following four templates contain an upgrade or upsell pitch — each is subject to the commercial email rule:

1. `re-engagement.html` — uses `{{unsubscribeUrl}}`; send path: `sendReEngagementEmails` helper
2. `inactivity-warning.html` — uses `{{unsubscribeUrl}}`; send path: `SendInactivityWarningsUseCase`
3. `trial-ended.html` — uses `{{unsubscribeUrl}}`; send path: `SendTrialEndedEmailsUseCase`
4. `abandoned-checkout-recovery.html` — uses `{{unsubscribeUrl}}`; send paths: `SendAbandonedCheckoutRecoveryOnExpiryUseCase` and `SendAbandonedCheckoutRecoveryUseCase`

The transactional templates (magic-link, reset, convert, convert-link, subscription-cancelled, subscription-scheduled-cancellation) are not marketing emails and do not need the unsubscribe footer.

## What NOT to do

- Do not introduce a template partials system or shared HTML fragments
- Do not add inline images beyond the mascot header and content-specific images (e.g. YouTube thumbnail in re-engagement)
- Do not change `inactivity-warning.html` without also updating this rule and all other templates to match
- Do not add a new email template without the mascot header, dark-mode block, responsive block, and footer
