FIELD ID CMS — PHASE 4B

Replace ONLY these two files in the CMS GitHub repository:
- data.js
- release.js

Then commit the changes and wait for Netlify to redeploy.

Adds:
- Create Release button
- New releases are created as Draft
- New release automatically becomes the Working Release
- Atomic Publish Release button
- Publish confirmation
- Publish result summary
- Direct manual switching of a release to Published is removed from the UI

IMPORTANT:
Do not publish your real 7.5 release as the first test.
Create a temporary test release (example: 99.0 / PUBLISH TEST), add one throwaway draft species to it, then test Publish Release on that temporary release.
