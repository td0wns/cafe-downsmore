import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "meal-data");
const outputRoot = path.join(root, "dist", "data");
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const concernValues = new Set(["tomato", "vinegar", "olives", "mushrooms", "wine", "garlic", "onion", "cabbage"]);
const tagKinds = new Set(["cuisine", "flavour", "season", "marker", "effort", "source"]);
const ingredientScopes = new Set(["shared", "vegetarian", "meat"]);

function fail(message) {
  throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} must be a non-empty string`);
  return value.trim();
}

function rejectUnknownKeys(value, allowed, label) {
  const unknown = Object.keys(value).filter(key => !allowed.has(key));
  if (unknown.length) fail(`${label} has unknown ${unknown.length === 1 ? "field" : "fields"}: ${unknown.join(", ")}`);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(`${path.relative(root, filePath)} could not be read as JSON: ${error.message}`);
  }
}

async function loadMealFiles(folderName) {
  const folderPath = path.join(sourceRoot, folderName);
  const fileNames = (await readdir(folderPath))
    .filter(fileName => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));
  if (!fileNames.length) fail(`meal-data/${folderName} must contain at least one meal JSON file`);
  return Promise.all(fileNames.map(async fileName => ({
    fileName,
    source: folderName,
    meal: await readJson(path.join(folderPath, fileName))
  })));
}

function validateTagCatalogue(tags) {
  if (!isObject(tags) || !Object.keys(tags).length) fail("meal-data/tags.json must be a non-empty object");
  for (const [name, definition] of Object.entries(tags)) {
    requireString(name, "Each tag name");
    if (!isObject(definition)) fail(`Tag \"${name}\" must be an object`);
    rejectUnknownKeys(definition, new Set(["kind", "palette"]), `Tag \"${name}\"`);
    if (!tagKinds.has(definition.kind)) fail(`Tag \"${name}\" has an invalid kind`);
    if (typeof definition.palette !== "boolean") fail(`Tag \"${name}\" must set palette to true or false`);
  }
}

function validateIngredientCatalogue(ingredients) {
  if (!isObject(ingredients) || !Object.keys(ingredients).length) fail("meal-data/ingredients.json must be a non-empty object");
  const names = new Set();
  for (const [id, definition] of Object.entries(ingredients)) {
    if (!idPattern.test(id)) fail(`Ingredient ID \"${id}\" must use lowercase words joined by hyphens`);
    if (!isObject(definition)) fail(`Ingredient \"${id}\" must be an object`);
    rejectUnknownKeys(definition, new Set(["name", "vegetarian", "concern"]), `Ingredient \"${id}\"`);
    const name = requireString(definition.name, `Ingredient \"${id}\" name`);
    const normalisedName = name.toLocaleLowerCase("en-GB");
    if (names.has(normalisedName)) fail(`Ingredient name \"${name}\" is duplicated`);
    names.add(normalisedName);
    if (typeof definition.vegetarian !== "boolean") fail(`Ingredient \"${id}\" must set vegetarian to true or false`);
    if (definition.concern !== undefined && !concernValues.has(definition.concern)) {
      fail(`Ingredient \"${id}\" has an invalid household concern`);
    }
    const allergyCheck = `${id} ${name} ${definition.concern || ""}`.toLocaleLowerCase("en-GB");
    if (allergyCheck.includes("coconut")) fail(`Ingredient \"${id}\" conflicts with the coconut allergy`);
  }
}

function validateMeal(record, tags, ingredients, usedIds, usedNames) {
  const { meal, fileName, source } = record;
  const location = `meal-data/${source}/${fileName}`;
  if (!isObject(meal)) fail(`${location} must contain one meal object`);
  rejectUnknownKeys(
    meal,
    new Set(["id", "name", "category", "tags", "minutes", "ingredients", "notes", "recipeUrl", "preMade", "separateVersions", "lastCooked", "timesCooked"]),
    location
  );

  const id = requireString(meal.id, `${location} id`);
  if (!idPattern.test(id)) fail(`${location} id must use lowercase words joined by hyphens`);
  if (fileName !== `${id}.json`) fail(`${location} must be named ${id}.json`);
  if (usedIds.has(id)) fail(`Meal ID \"${id}\" is duplicated`);
  usedIds.add(id);

  const name = requireString(meal.name, `${location} name`);
  const normalisedName = name.toLocaleLowerCase("en-GB");
  if (usedNames.has(normalisedName)) fail(`Meal name \"${name}\" is duplicated`);
  usedNames.add(normalisedName);
  const category = requireString(meal.category, `${location} category`);

  if (!Number.isInteger(meal.minutes) || meal.minutes <= 0) fail(`${location} minutes must be a positive whole number`);
  if (!Array.isArray(meal.tags) || !meal.tags.length) fail(`${location} must have at least one tag`);
  const mealTags = meal.tags.map((tag, index) => requireString(tag, `${location} tag ${index + 1}`));
  if (new Set(mealTags).size !== mealTags.length) fail(`${location} contains a duplicate tag`);
  for (const tag of mealTags) {
    if (!Object.hasOwn(tags, tag)) fail(`${location} uses unapproved tag \"${tag}\"`);
  }
  if (source === "suggestions" && !mealTags.includes("Suggestions")) {
    fail(`${location} must include the Suggestions tag`);
  }

  const preMade = meal.preMade ?? false;
  const separateVersions = meal.separateVersions ?? false;
  if (typeof preMade !== "boolean") fail(`${location} preMade must be true or false`);
  if (typeof separateVersions !== "boolean") fail(`${location} separateVersions must be true or false`);
  if (preMade !== mealTags.includes("Pre-made")) {
    fail(`${location} must use preMade: true and the Pre-made tag together`);
  }

  if (meal.notes !== undefined && typeof meal.notes !== "string") fail(`${location} notes must be text`);
  if (meal.recipeUrl !== undefined) {
    const recipeUrl = requireString(meal.recipeUrl, `${location} recipeUrl`);
    let parsedUrl;
    try {
      parsedUrl = new URL(recipeUrl);
    } catch {
      fail(`${location} recipeUrl must be a valid web address`);
    }
    if (!new Set(["http:", "https:"]).has(parsedUrl.protocol)) fail(`${location} recipeUrl must start with http:// or https://`);
  }
  if (meal.lastCooked !== undefined && meal.lastCooked !== null && typeof meal.lastCooked !== "string") {
    fail(`${location} lastCooked must be text or null`);
  }
  if (meal.timesCooked !== undefined && (!Number.isInteger(meal.timesCooked) || meal.timesCooked < 0)) {
    fail(`${location} timesCooked must be zero or a positive whole number`);
  }

  if (!Array.isArray(meal.ingredients) || !meal.ingredients.length) fail(`${location} must list at least one ingredient`);
  const usedIngredientKeys = new Set();
  let vegetarianIngredientCount = 0;
  let meatIngredientCount = 0;
  const compiledIngredients = meal.ingredients.map((use, index) => {
    const useLabel = `${location} ingredient ${index + 1}`;
    if (!isObject(use)) fail(`${useLabel} must be an object`);
    rejectUnknownKeys(use, new Set(["ingredient", "amount", "scope", "optional", "dominant"]), useLabel);
    const ingredientId = requireString(use.ingredient, `${useLabel} ID`);
    const amount = requireString(use.amount, `${useLabel} amount`);
    if (!Object.hasOwn(ingredients, ingredientId)) fail(`${useLabel} references unknown ingredient \"${ingredientId}\"`);
    const definition = ingredients[ingredientId];
    const scope = use.scope ?? "shared";
    if (!ingredientScopes.has(scope)) fail(`${useLabel} has invalid scope \"${scope}\"`);
    if (use.optional !== undefined && typeof use.optional !== "boolean") fail(`${useLabel} optional must be true or false`);
    if (use.dominant !== undefined && typeof use.dominant !== "boolean") fail(`${useLabel} dominant must be true or false`);
    const uniqueIngredientKey = `${scope}:${ingredientId}`;
    if (usedIngredientKeys.has(uniqueIngredientKey)) fail(`${location} repeats ingredient \"${ingredientId}\" in the ${scope} scope`);
    usedIngredientKeys.add(uniqueIngredientKey);

    if (!definition.vegetarian) {
      meatIngredientCount += 1;
      if (!separateVersions || scope !== "meat") {
        fail(`${useLabel} is not vegetarian, so it must use scope \"meat\" in a separate-versions meal`);
      }
    } else {
      vegetarianIngredientCount += 1;
      if (scope === "meat") fail(`${useLabel} is vegetarian and should not use the meat scope`);
    }
    if (scope === "meat" && !separateVersions) fail(`${useLabel} can use the meat scope only when separateVersions is true`);
    if (definition.concern && use.dominant !== false && use.optional !== true) {
      fail(`${useLabel} is a household concern; mark it dominant: false or optional: true`);
    }

    return {
      ingredientId,
      name: definition.name,
      amount,
      ...(definition.concern ? { concern: definition.concern } : {}),
      ...(scope !== "shared" ? { scope } : {}),
      ...(use.optional !== undefined ? { optional: use.optional } : {}),
      ...(use.dominant !== undefined ? { dominant: use.dominant } : {})
    };
  });

  if (separateVersions && (!meatIngredientCount || !vegetarianIngredientCount)) {
    fail(`${location} is marked separateVersions but does not contain both vegetarian/shared and meat ingredients`);
  }

  return {
    id,
    name,
    category,
    tags: mealTags,
    minutes: meal.minutes,
    ingredients: compiledIngredients,
    notes: meal.notes?.trim() || "",
    ...(meal.recipeUrl ? { recipeUrl: meal.recipeUrl } : {}),
    preMade,
    separateVersions,
    lastCooked: meal.lastCooked ?? null,
    timesCooked: meal.timesCooked ?? 0
  };
}

async function writeJson(fileName, value) {
  await writeFile(path.join(outputRoot, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function build() {
  const [tags, ingredients, preferences, libraryRecords, suggestionRecords] = await Promise.all([
    readJson(path.join(sourceRoot, "tags.json")),
    readJson(path.join(sourceRoot, "ingredients.json")),
    readJson(path.join(sourceRoot, "preferences.json")),
    loadMealFiles("library"),
    loadMealFiles("suggestions")
  ]);
  validateTagCatalogue(tags);
  validateIngredientCatalogue(ingredients);
  if (!isObject(preferences)) fail("meal-data/preferences.json must contain an object");

  const usedIds = new Set();
  const usedNames = new Set();
  const compile = records => records
    .map(record => validateMeal(record, tags, ingredients, usedIds, usedNames))
    .sort((left, right) => left.name.localeCompare(right.name, "en-GB"));
  const library = compile(libraryRecords);
  const suggestions = compile(suggestionRecords);
  const tagCatalogue = Object.entries(tags)
    .map(([name, definition]) => ({ name, ...definition }))
    .sort((left, right) => left.name.localeCompare(right.name, "en-GB"));

  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    writeJson("meals.json", library),
    writeJson("suggestions.json", suggestions),
    writeJson("tags.json", tagCatalogue),
    writeJson("preferences.json", preferences)
  ]);
  console.log(`Validated and built ${library.length} library meals, ${suggestions.length} suggestions, ${Object.keys(ingredients).length} ingredients and ${tagCatalogue.length} tags.`);
}

build().catch(error => {
  console.error(`Meal data build failed: ${error.message}`);
  process.exitCode = 1;
});
