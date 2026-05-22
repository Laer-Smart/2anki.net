-- Photo-to-deck funnel — weekly counts
-- Run against the production events table to read experiment results.
-- "weekly active uploader" is defined as a distinct user who fired
-- `upload_started` in the same 7-day window (the event fired in UploadForm
-- on every conversion attempt). Replace with a different baseline event
-- if the definition changes.

WITH weeks AS (
  SELECT
    date_trunc('week', created_at) AS week_start,
    name,
    props,
    user_id,
    anonymous_id
  FROM events
  WHERE
    created_at >= now() - interval '42 days'
    AND name IN (
      'photo_entry_point_viewed',
      'photo_entry_point_clicked',
      'photo_upload_started',
      'photo_quota_reached',
      'vision_photo_converted',
      'upload_started'
    )
),

weekly_event_counts AS (
  SELECT
    week_start,
    name,
    count(*)                                              AS total_events,
    count(DISTINCT coalesce(user_id::text, anonymous_id)) AS distinct_actors
  FROM weeks
  WHERE name <> 'upload_started'
  GROUP BY week_start, name
),

camera_vs_library AS (
  SELECT
    date_trunc('week', created_at) AS week_start,
    props->>'source'               AS upload_source,
    count(*)                       AS total,
    count(DISTINCT coalesce(user_id::text, anonymous_id)) AS distinct_actors
  FROM events
  WHERE
    created_at >= now() - interval '42 days'
    AND name = 'photo_upload_started'
    AND props->>'source' IN ('camera', 'library')
  GROUP BY week_start, upload_source
),

weekly_uploaders AS (
  SELECT
    date_trunc('week', created_at) AS week_start,
    count(DISTINCT coalesce(user_id::text, anonymous_id)) AS distinct_uploaders
  FROM events
  WHERE
    created_at >= now() - interval '42 days'
    AND name = 'upload_started'
  GROUP BY week_start
),

attempt_rate AS (
  SELECT
    ec.week_start,
    ec.distinct_actors                         AS photo_clickers,
    wu.distinct_uploaders                      AS active_uploaders,
    round(
      100.0 * ec.distinct_actors
            / nullif(wu.distinct_uploaders, 0),
      1
    )                                          AS attempt_rate_pct
  FROM weekly_event_counts ec
  JOIN weekly_uploaders wu USING (week_start)
  WHERE ec.name = 'photo_entry_point_clicked'
)

SELECT 'funnel_counts' AS section, wec.week_start, wec.name, wec.total_events, wec.distinct_actors
FROM weekly_event_counts wec
ORDER BY wec.week_start DESC, wec.name

UNION ALL

SELECT 'camera_vs_library', cvl.week_start, cvl.upload_source, cvl.total, cvl.distinct_actors
FROM camera_vs_library cvl
ORDER BY cvl.week_start DESC, cvl.upload_source

UNION ALL

SELECT 'attempt_rate', ar.week_start, 'click_through_rate_pct', ar.photo_clickers, ar.active_uploaders
FROM attempt_rate ar
ORDER BY ar.week_start DESC;
