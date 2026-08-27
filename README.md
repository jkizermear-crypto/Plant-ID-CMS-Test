# Field ID Challenge CMS v0.4

Connected to the **Field ID MVP Test** Supabase project only.

## v0.3 adds
- ID Card editor
  - general cards
  - stage-specific cards
  - exact-photo cards
  - memory text
  - source/citation fields
  - active/inactive
  - preview
- Comparison Card editor
  - correct species
  - wrong guess
  - general / stage / exact-photo scope
  - memory text
  - source/citation fields
  - active/inactive
  - preview
- Distractor editor
  - choose plausible wrong-answer pools per species
- Player Preview
  - shows active teaching content for one species

## Existing v0.2 features retained
- Species management
- Bulk photo upload
- Individual photo edit
- Reassign species
- Tags
- Orientation
- Active/inactive
- Permanent delete
- Bulk retagging
- Bulk species move
- Bulk activate/deactivate

## Run locally
Install Node.js, then:

npm install
npm run dev

## Next milestone
- Import frozen v7 content automatically
- Validate all 52 species / 337 photos / tips / comparisons
- Refactor the player game to read from Supabase instead of hard-coded JS

## v0.3.1 hotfix
- Disambiguates comparison stage tags from required comparison tags.
- Loads migrated distractors from `fid_distractor_options`.
- Adds editing for label-only look-alike distractors.

## v0.3.2 hotfix
- Fixes Species tab rendering after v7 migration.
- Shows species count and alphabetized species records.

## v0.4
- Adds Release Banner editor.
- Banner title/body/meta/on-off state are stored in `fid_releases`.
- Game can read banner dynamically without localStorage/cookies.
