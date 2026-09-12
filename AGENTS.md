# Meal catalogue instructions

These instructions are intentionally explicit so a lower-reasoning Codex task can add meals without changing the application.

## Scope

For an ordinary request to add or update meals, edit only `meal-data/` and the generated `dist/data/` files produced by the build script. Do not edit `dist/app.js`, `dist/index.html`, or `dist/styles.css` unless the user explicitly asks for a behaviour or design change.

Never change an existing meal `id`. Saved browser plans and history refer to that stable ID.

## Before adding a meal

1. Read `meal-data/preferences.json`, `meal-data/tags.json`, `meal-data/ingredients.json`, and `meal-data/templates/meal.json`.
2. Use `meal-data/library/` for a meal the household already owns or requests. Use `meal-data/suggestions/` only for an assistant-proposed meal.
3. Ask for clarification only when a missing fact would materially change the meal, such as whether it is pre-made, which version contains meat, or which ingredients and amounts are intended. A recipe link is optional.

## Required rules

- Every meal must have a unique lowercase kebab-case `id`, a name, category, positive whole-number minutes, at least one allowed tag, at least one ingredient, and a useful note.
- Assistant-proposed meals must include the `Suggestions` tag. Household meals should normally include `Our meals`.
- Tags must already exist in `meal-data/tags.json`. Add a tag there only when the user asks for it or no existing tag expresses the meaning. Set `palette: true` only for cuisine or flavour tags that should affect variety scoring.
- Reuse ingredient IDs from `meal-data/ingredients.json`. Add a new canonical ingredient only when it is genuinely absent. Avoid synonyms and singular/plural duplicates because one ingredient ID is what combines grocery quantities.
- Coconut is never allowed.
- Shared and vegetarian ingredients must have `vegetarian: true` in the ingredient catalogue.
- Meat is allowed only in a meal with `separateVersions: true`, and that ingredient use must have `scope: "meat"`. Keep the vegetarian version complete.
- For a pre-made meal, set `preMade: true`, include the `Pre-made` tag, and list only the packaged products and sides that must be bought. Never infer flour, spices, meat or other scratch ingredients.
- Use `scope: "vegetarian"` or `scope: "meat"` only when an ingredient belongs to one version. Omit `scope` for shared ingredients.
- Use `optional: true` for genuinely optional purchases. Use `dominant: false` when a disliked ingredient is present only in the background.
- Recipe links, when supplied, must use `http://` or `https://`.

## Add and verify

1. Copy the structure in `meal-data/templates/meal.json` into a new file named `<meal-id>.json` in the correct meal folder.
2. Fill the meal using catalogue ingredient IDs and allowed tag names.
3. Run `node scripts/build-meal-data.mjs`.
4. Run `node --check dist/app.js` and `git diff --check`.
5. Inspect the diff. A content-only meal addition should normally contain the new source meal, any genuinely new catalogue entries, and regenerated `dist/data/*.json` files.
6. Publish the same validated commit to GitHub Pages and the existing private Sites project using the normal project workflow.

If validation fails, fix the source data. Do not hand-edit generated files to bypass it.
