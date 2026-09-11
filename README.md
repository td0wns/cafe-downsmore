# Our Table

A small, static meal library and weekly planner for two. It encodes the household's vegetarian requirement, coconut allergy, flavour dislikes and mild intolerances without treating every trace ingredient as a hard exclusion.

## What it does

- Stores a meal library with ingredient lists, notes, cook time and cooking history.
- Plans seven dinners and builds a combined shopping list.
- Displays the ingredients pulled from every planned meal.
- Uses cuisine and flavour tags to avoid an overloaded weekly palate.
- Previews recommendations against the current grocery list and highlights new additions.
- Surfaces meals that have never been logged or have not been cooked recently.
- Supports custom meal tags and custom ingredient rows.
- Supports one dinner with shared ingredients plus separately cooked vegetarian and meat components.
- Marks pre-made meals so their grocery entries remain package-level products rather than inferred scratch ingredients.
- Exports/imports the full local dataset as JSON.
- Copies a complete recommendation brief for ChatGPT.

Data changes are saved in the browser. Export a backup after making important changes. The starter meal file is `dist/data/meals.json`.

Ingredient records may include `scope: "shared"`, `scope: "vegetarian"`, or `scope: "meat"`; a missing scope means shared. Meals may include `separateVersions: true` and `preMade: true`.

## GitHub Pages

This repository includes an automatic Pages workflow. In the GitHub repository settings, choose **GitHub Actions** as the Pages source. Every push to `main` then publishes the contents of `dist/`.

For ChatGPT to read the meal library directly, the repository must be public. Its raw data URL will be:

`https://raw.githubusercontent.com/OWNER/REPOSITORY/main/dist/data/meals.json`

Browser edits do not automatically commit back to GitHub. Export the JSON backup and copy its `meals` array into `dist/data/meals.json` when you want the repository copy updated.
