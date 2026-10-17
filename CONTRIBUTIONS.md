# Contributor portal

Contributors use the CMS URL with `/?contribute=1`. They sign up with email and password, choose a public credit name, select an existing species, and submit an owned photo or a missing general/stage ID tip. Their email is not displayed in the game. Submissions are private and pending until an administrator reviews them.

## Deployment order

1. Apply `supabase/migrations/20261017004409_contributor_submissions.sql` as the owner of the **existing content database**. This migration assumes the release-aware columns already used by the CMS/game (`release_id`, `publish_status`) exist. Test against the actual project's current schema before production. It leaves scores and checklist tables alone.
2. In Supabase Authentication, enable email signup (if disabled), configure the email delivery service, and add the CMS production URL `/?contribute=1` to allowed redirect URLs. Email confirmation is supported. Confirm signup and email delivery with a real contributor account before sharing.
3. Deploy the game update first. It excludes `contribution_only` species and renders contributor credit below photos. Its answer-choice fallback works before the migration too.
4. Deploy this CMS. For contributors to reach the app login, Netlify site protection must allow the production CMS URL to load without Netlify team membership; keep team protection for non-production deploys. Supabase authentication and database policies protect contributor data and admin actions.
5. Test with separate admin and contributor accounts. A contributor must not be in `fid_admins`.

## Admin workflow

- **Species → Add Species** defaults to **In preparation**. Enter the official common/scientific names and keep **Accept contributor submissions** checked. This creates one species ID for everyone to select; it stays out of the game even if a release is published.
- **Submissions** shows pending photos and ID tips. Preview a photo or edit a tip, then approve or reject with an optional note. Notes are visible to the submitter. Approved contributions to live species go live; contributions to prepared/draft species remain draft.
- Approve photos and tips for a new species, then **Species → Edit → Publish species to game**. At least one approved active photo is required. Publishing deliberately activates that species and its active photos/tips. Contributors cannot publish species or create their own species names.
- Curated distractors remain first priority. The game fills incomplete lists from other playable species, removing blank, duplicate, and self-answer entries. Fewer than four playable species yields the available distinct choices; fewer than two stops loading safely.

## Permissions and storage

The separate `fid_submissions` queue grants contributors SELECT on their own rows and INSERT of pending rows only. Decisions run through an admin-only, transactional, idempotent RPC. Profiles only expose public credit names to the owner and admins. Approval snapshots the public name onto the game record, preserving credits if a contributor later changes their display name.

Pending photos are stored in private `field-id-submissions` storage. The reviewer gets temporary signed previews. After the admin clicks Approve, the CMS copies a photo into the public content bucket at an immutable submission-ID path, then finalizes approval in SQL. Retrying after an interrupted upload reuses that path. If finalization fails, the copied object may remain unreferenced in the public bucket; the game cannot display it without an approved photo record. Pending originals are retained so review history remains viewable. A storage retention policy can be added later.

## Validation

`npm ci`, `npm test`, `npm run build`.

For browser smoke tests: `npx playwright install chromium` then `npm run test:ui`. Browser tests mock Supabase responses and cover the mobile signup and contribution forms. SQL tests execute PostgreSQL with PGlite using the repository's original schema plus a fixture for the later release-aware columns. They verify row/storage isolation, write restrictions, admin-only review, idempotency, draft publishing, and normalized name duplicate rejection. They do not replace a live Supabase integration test.

## iNaturalist CC0 photos

The contributor page includes an expandable guide with Dean’s annotated screenshots. Contributors select the exact species by common name (scientific names are optional), filter Photo Licensing to CC0 and observations to Research Grade, and prefer more agreeing species-level IDs. They must check the exact photo’s license and upload the actual photo file.

The photo source selector supports original photos and iNaturalist CC0 photos. CC0 submissions require confirmation that both CC0 and Research Grade were checked. The original photographer/username and iNaturalist observation or photo URL are optional. Approval preserves photographer, source URL and CC0-1.0 licensing separately from the submitter’s contribution credit. This is a contributor declaration followed by admin review, not an automated verification of iNaturalist metadata.

Apply `supabase/migrations/20261017011108_inaturalist_cc0_photos.sql` before deploying this update.

Photo guidance emphasizes seasonal variety and realistic field conditions: rosettes, seedlings, seed heads, dormant plants, resprouts, regrowth, and plants affected by prior herbicide treatment. Avoid filling the library with near-identical perfect flower photos.

Apply `supabase/migrations/20261017013421_optional_photo_metadata.sql` to make CC0 source links and photographer names optional. Scientific names are optional when creating species.
