THISTLE BE FUN CMS — v7.1 BATCH IMPORTER

This patch adds a one-time CMS tab called "7.1 Batch Import".

UPLOAD/REPLACE THESE 3 FILES IN THE CMS REPO ROOT:
1. main.js
2. package.json
3. batch71.js

Then let Netlify redeploy the CMS.

HOW TO USE
1. Open the CMS and sign in normally.
2. Tap "7.1 Batch Import".
3. Choose your ORIGINAL "You Wanted More.zip".
4. Tap "Import 12 Species into Draft 7.1".
5. Keep the page open until the log says DONE.
6. Review 7.1 in the normal CMS tabs before publishing.

SAFETY
- Creates/reuses release 7.1 titled "You Wanted More".
- Requires 7.1 to be Draft.
- Every species, photo, ID card, comparison, and distractor is stamped Draft under 7.1.
- The importer NEVER calls Publish Release.
- If a same-named species already exists outside 7.1, the import STOPS instead of making a duplicate or touching live content.
- The importer is designed to be re-run after an interruption.

WHAT IT BUILDS
- 12 species with scientific names
- all supplied photos uploaded to field-id-content
- photo tags where matching CMS tags exist
- general Practice cards
- stage-specific Practice cards where matching stage tags exist
- comparison cards when the comparison target is already playable
- hard distractor sets, with non-playable look-alikes saved as label-only distractors

The actual game remains unchanged until you deliberately Publish Release 7.1.
