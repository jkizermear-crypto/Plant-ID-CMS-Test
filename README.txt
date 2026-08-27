FIELD ID CMS - PHASE 2 PATCH

Replace these three files in the ROOT of the flat CMS GitHub repo:
- main.js
- data.js
- release.js

Do not change index.html, package.json, Netlify settings, or any other CMS files.

What this adds:
- Working Release selector
- Releases tab
- Draft / Published / Archived controls
- Optional launch date/time
- Per-release content counts
- Release Banner defaults to the selected working release

IMPORTANT:
Phase 2 organizes releases, but the production game does NOT yet filter draft content.
Do not add private v7.5 draft content until Phase 3 is installed.
