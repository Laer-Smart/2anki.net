# observability — instrumented HTTP + sink

The single egress point for every outbound third-party call (Notion, Anthropic, Dropbox, Google Drive, Patreon, Microsoft login, Apple login, Pexels, Wikimedia Commons). Adds SSRF defence, latency/error metrics, and a query API for the ops dashboard.

## Why this exists

Express controllers used to call `axios.get(...)` directly with user-controlled URLs. SonarCloud flagged repeated CWE-918 taint findings; we kept marking them false-positive. The fix was to give every call site one wrapper that:

1. Validates the URL is `https`, not a private/loopback host, and not an IPv4-mapped IPv6 address.
2. Resolves the host once via `dns.promises.lookup`, refuses any private IP in the answer set, and pins the resolved address through `axios`'s `lookup` option so the connection cannot be re-targeted at request time.
3. Records latency, status, and error class into `ObservabilitySink` so `OpsController` can render service health without scraping logs.

## Public surface

- `instrumentedAxios(service, config)` — drop-in replacement for `axios(...)`. `service` must be one of `OBSERVABILITY_SERVICES`.
- `OBSERVABILITY_SERVICES` — frozen list. Adding a new outbound integration means **adding it here first**, then writing the wrapper.
- `FIXED_HOST_ALLOWLIST` — per-service host pin. Set to `null` for services that need wildcard hosts (e.g. Notion's per-tenant CDNs); set to an explicit list for services that only ever talk to one or two endpoints.
- `getObservabilitySink()` / `ObservabilitySinkInstance` — singleton sink. The query service (`ObservabilityQueryService`) reads from it.
- `ObservabilityQueryService.getMetrics(window)` — read API for `/ops`. Aggregates inbound volume + route latency, outbound volume + per-service latency percentiles (p50/p95/p99), and route/service error rates over a `1h | 24h | 7d` window. Adding a new aggregation means extending `IObservabilityRepository`, the `OpsMetricsResponse` shape, and the engineering tab in one PR.

## Adding a new service

1. Append the service name to `OBSERVABILITY_SERVICES`.
2. Decide host policy: tight allowlist if you can name the hosts; `null` only if you can justify it.
3. Replace the call site with `instrumentedAxios('<name>', { url, ... })`. **Do not** import `axios` directly elsewhere.
4. Cover with a test that asserts (a) a private-IP host is rejected and (b) the success path records a sink event.

## Things to know before editing

- The DNS pin is what stops a TOCTOU SSRF (validate hostname → connect happens later → DNS answer changed). Don't "simplify" it back to axios's default lookup.
- The IPv4-mapped IPv6 rejection (`::ffff:127.0.0.1`) was a real bypass — keep both the textual check and the resolved-IP check.
- SonarCloud has historical taint findings on this file marked false-positive via the API (see `reference_sonarcloud_taint_fp` memory). If a new taint warning shows up here, audit before silencing.
- This file is the only file where `axios` may be imported.
