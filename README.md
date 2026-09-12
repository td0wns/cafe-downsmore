# Our Table

A small, static meal library and weekly planner for two. It encodes the household's vegetarian requirement, coconut allergy, flavour dislikes and mild intolerances without treating every trace ingredient as a hard exclusion.

## What it does

- Stores a meal library with ingredient lists, notes, cook time and cooking history.
- Plans seven dinners and builds a combined shopping list.
- Lets you record up to 10 meals from last week, and automatically fills that list from the current plan when the week rolls over. A newer completed week replaces it; otherwise it expires after two weeks.
- Displays the ingredients pulled from every planned meal.
- Uses cuisine and flavour tags to avoid an overloaded weekly palate.
- Shows last week and this week together on Suggestions, removes already selected meals from the recommendation cards, and lets either week be switched in or out of flavour balancing.
- Refills suggestion rows as meals are planned, displays the chosen set alphabetically, and provides a searchable meal picker for every calendar day and the previous-week list.
- Previews recommendations against the current grocery list and highlights new additions.
- Surfaces meals that have never been logged or have not been cooked recently.
- Uses a consistent tag catalogue maintained with the meal data.
- Saves an optional recipe link on each meal and exposes it from the library card.
- Supports one dinner with shared ingredients plus separately cooked vegetarian and meat components.
- Marks pre-made meals so their grocery entries remain package-level products rather than inferred scratch ingredients.
- Keeps the meal library read-only in the website so recipes and ingredients remain controlled by the published data.

Meal source files live in `meal-data/library/` and `meal-data/suggestions/`. Canonical ingredients, allowed tags and household preferences live beside them in `meal-data/`. Running `node scripts/build-meal-data.mjs` validates the catalogue and generates the files in `dist/data/` that the website reads. Weekly plans, retained previous-week data and cooking history are saved in the browser.

Ingredient records may include `scope: "shared"`, `scope: "vegetarian"`, or `scope: "meat"`; a missing scope means shared. Meals may include `separateVersions: true`, `preMade: true`, and an optional HTTP(S) `recipeUrl`. The local state stores `weekStart`, up to 10 `previousWeek.mealIds`, and per-meal cooking history.

## GitHub Pages

This repository includes an automatic Pages workflow. In the GitHub repository settings, choose **GitHub Actions** as the Pages source. Every push to `main` then publishes the contents of `dist/`.

For ChatGPT to read the meal library directly, the repository must be public. Its raw data URL will be:

`https://raw.githubusercontent.com/td0wns/cafe-downsmore/main/dist/data/meals.json`

The meal library is updated through the repository rather than edited in the browser. Project-wide instructions for safely adding meals are in `AGENTS.md`.
