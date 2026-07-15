# FeatureDoor

A reusable fake-door affordance for validating demand before building a feature.
Drop it onto any surface to ask "Would you use this?" and record each interested
visitor server-side, so product/growth can size demand (the 30×500 test) before a
line of the real feature is written.

## Usage

```tsx
import { FeatureDoor } from '../../components/FeatureDoor/FeatureDoor';

<FeatureDoor featureKey="study_reminders" title="Study reminders" />;
```

Props:

- `featureKey` (required) — must be present in the server allowlist
  (`src/lib/featureInterest/keys.ts`). A key not on the allowlist is rejected with
  a 400, so add the candidate key there before mounting the door.
- `title` (required) — the feature name shown to the visitor.
- `question` (optional) — override the default "Would you use this?" line.

## What it records

- Clicking **I'd use this** posts one interest row (the demand signal) via
  `POST /api/feature-interest`. This fires for anonymous visitors too — the server
  attaches the logged-in `user_id` when present and the `anon_id` cookie otherwise.
- An optional one-line answer to "What would make it useful?" posts a **second**
  row carrying the comment. When sizing demand, count distinct
  `user_id`/`anonymous_id` per `feature_key` rather than raw rows, and read the
  comments from rows where `comment is not null`.

## Adding a new candidate to test

1. Add the key to `FEATURE_INTEREST_KEYS` in `src/lib/featureInterest/keys.ts`.
2. Mount `<FeatureDoor featureKey="<key>" title="<name>" />` on the surface you
   want to probe (that mounting is a separate change — the harness ships unmounted).
3. Read counts with the repository's `countByFeatureKey`.
