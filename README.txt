PHASE 2.5 PATCH

Replace these files in the ROOT of your field-id-cms GitHub repository:
- main.js
- data.js
- release.js
- species.js
- upload.js
- learning.js
- photos.js

What this does:
- Preserves the Phase 2 Working Release + Releases controls.
- New species are stamped to the selected Working Release.
- New uploaded photos are stamped to the selected Working Release.
- New ID cards and comparisons are stamped to the selected Working Release.
- Saving a distractor set stamps the new distractor rows to the selected Working Release.
- Draft releases create records with publish_status=draft.
- Published releases create records with publish_status=published.
- Warns when editing an existing published species/photo while a draft release is selected.

IMPORTANT:
This does NOT yet make the game hide draft content. Do not add real secret v7.5 content until Phase 3 is deployed and tested.
