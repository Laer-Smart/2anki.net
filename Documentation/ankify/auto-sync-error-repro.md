# Auto Sync connect error repro recipes

Five candidate failure modes for the subscribe-a-Notion-page flow. Each entry: a dev-local repro step and the user-facing string that should now appear.

---

## 1. Stale subscription gate (401/403 from RequireAnkifyAccess)

Dev repro: sign in as a user whose `subscriptions.active` is false (or whose `patreon` flag is false and `AUTO_SYNC_PRODUCT_ID` doesn't match any active row). Navigate to `/ankify`, open "Find pages", enter any Notion page ID and submit.

Expected string: "Auto Sync isn't active on this account." + link "Manage subscription" → `/account`

---

## 2. Notion OAuth token missing or expired (NotionNotConnectedError, 409)

Dev repro: use a user who has never connected Notion (no token in the DB for that owner). Navigate to `/ankify`, open "Find pages", submit any page ID.

Expected string: "Notion isn't connected to 2anki." + link "Connect Notion" → `/notion`

---

## 3. No active hosted Anki client (NoActiveAnkifyClientError, 409)

Dev repro: use a user who has connected Notion but has never provisioned an Anki client (no row in `ankify_clients` with `status = 'active'` for that owner). Navigate to `/ankify`, open "Find pages", submit any page ID.

Expected string: "Your hosted Anki isn't set up yet." + link "Set up Anki" → `/ankify/setup`

---

## 4. AnkiConnect unreachable (AnkiConnectUnreachableError, 503)

Dev repro: provision an Anki client, then stop or kill the container so the AnkiConnect port is unreachable. Navigate to `/ankify`, open "Find pages", submit a valid Notion page ID.

Expected string: "Anki isn't responding right now. Try again in a moment."

---

## 5. Docker daemon down on provision (DockerUnavailableError, 503)

Dev repro: stop the Docker daemon on the dev host. Navigate to `/ankify/setup`, click "Start Anki".

Expected string: "Anki couldn't start — usually a temporary infra issue. Try again in a moment. If it keeps failing, email support@2anki.net."
