const STORE_KEY = "our-table-v1";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CONCERNS = ["tomato", "vinegar", "olives", "mushrooms", "wine", "garlic", "onion", "cabbage"];
const NON_PALETTE_TAGS = new Set(["suggestions", "our meals", "pre-made", "budget friendly", "simple to make", "quick", "easy", "one tray", "spring", "summer", "autumn", "winter"]);
const RESERVED_TAGS = new Set(["pre-made"]);
const NEW_IDEAS = [
  {
    id: "suggested-feta-fritters", name: "Sweetcorn, courgette & feta fritters", category: "Quick", minutes: 30,
    tags: ["Suggestions", "European", "Fresh"],
    ingredients: [{name:"sweetcorn",amount:"300g"},{name:"courgette",amount:"1 large"},{name:"feta",amount:"150g"},{name:"eggs",amount:"2"},{name:"plain flour",amount:"80g"},{name:"yoghurt",amount:"150g"},{name:"lemon",amount:"1"},{name:"baby potatoes",amount:"400g"}],
    notes: "Serve with lemon yoghurt and herby potatoes.", lastCooked: null, timesCooked: 0
  },
  {
    id: "suggested-broccoli-orzo", name: "Broccoli & cheddar orzo", category: "One pan", minutes: 30,
    tags: ["Suggestions", "Italian", "Comfort"],
    ingredients: [{name:"orzo",amount:"200g"},{name:"broccoli",amount:"1 head"},{name:"frozen peas",amount:"150g"},{name:"vegetable stock",amount:"600ml"},{name:"cheddar",amount:"120g"},{name:"Dijon mustard",amount:"1 tsp",concern:"vinegar",dominant:false}],
    notes: "Creamy one-pan orzo; mustard stays in the background.", lastCooked: null, timesCooked: 0
  },
  {
    id: "suggested-sesame-noodles", name: "Sesame aubergine noodles", category: "Weeknight", minutes: 35,
    tags: ["Suggestions", "Asian", "Japanese-inspired"],
    ingredients: [{name:"aubergine",amount:"2"},{name:"noodles",amount:"200g"},{name:"cucumber",amount:"1"},{name:"soy sauce",amount:"3 tbsp"},{name:"sesame oil",amount:"1 tbsp"},{name:"ginger",amount:"thumb-sized"},{name:"sesame seeds",amount:"2 tbsp"}],
    notes: "Sticky soy-ginger glaze with crisp cucumber.", lastCooked: null, timesCooked: 0
  },
  {
    id: "suggested-squash-gnocchi", name: "Butternut squash & sage gnocchi", category: "Weekend", minutes: 45,
    tags: ["Suggestions", "Italian", "Autumn"],
    ingredients: [{name:"potato gnocchi",amount:"500g"},{name:"butternut squash",amount:"1 small"},{name:"spinach",amount:"150g"},{name:"butter",amount:"60g"},{name:"sage",amount:"small bunch"},{name:"vegetarian hard cheese",amount:"60g"}],
    notes: "Brown butter, wilted spinach and crisp sage.", lastCooked: null, timesCooked: 0
  },
  {
    id: "suggested-paneer-pilaf", name: "Paneer, pepper & pea pilaf", category: "One pan", minutes: 40,
    tags: ["Suggestions", "Indian-inspired", "Aromatic"],
    ingredients: [{name:"paneer",amount:"225g"},{name:"basmati rice",amount:"180g"},{name:"red peppers",amount:"2"},{name:"frozen peas",amount:"150g"},{name:"vegetable stock",amount:"400ml"},{name:"lemon",amount:"1"},{name:"coriander",amount:"small bunch"},{name:"ground cumin",amount:"1 tsp"}],
    notes: "Mildly spiced, fresh and coconut-free.", lastCooked: null, timesCooked: 0
  },
  {
    id: "suggested-spinach-quesadillas", name: "Cheese & spinach quesadillas", category: "Quick", minutes: 25,
    tags: ["Suggestions", "Mexican-inspired", "Fresh"],
    ingredients: [{name:"flour tortillas",amount:"6"},{name:"cheddar",amount:"180g"},{name:"spinach",amount:"150g"},{name:"sweetcorn",amount:"150g"},{name:"avocado",amount:"1"},{name:"lime",amount:"1"},{name:"yoghurt",amount:"100g"}],
    notes: "Crisp quesadillas with lime yoghurt and avocado.", lastCooked: null, timesCooked: 0
  }
];

let state = { meals: [], tags: [], week: emptyWeek(), weekStart: "", previousWeek: null };
let defaultMeals = [];
let activeTag = "All";
let comparisonId = null;
let shuffleSeed = 0;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]));

function emptyWeek() {
  return Object.fromEntries(DAYS.map(day => [day, ""]));
}

function normaliseWeek(week) {
  return {...emptyWeek(), ...(week || {})};
}

function hasPlannedMeals(week) {
  return Object.values(week || {}).some(Boolean);
}

function weekStartDate(date = new Date()) {
  const value = new Date(date);
  value.setHours(12, 0, 0, 0);
  value.setDate(value.getDate() - ((value.getDay() + 6) % 7));
  return value;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

function weeksBetween(fromKey, toKey) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) return 0;
  return Math.round((to - from) / (7 * 24 * 60 * 60 * 1000));
}

function syncRollingWeeks() {
  const currentStart = dateKey(weekStartDate());
  let changed = false;
  state.week = normaliseWeek(state.week);
  if (!parseDateKey(state.weekStart)) {
    state.weekStart = currentStart;
    changed = true;
  }
  const elapsed = weeksBetween(state.weekStart, currentStart);
  if (elapsed > 0) {
    if (hasPlannedMeals(state.week)) state.previousWeek = {weekStart:state.weekStart, week:{...state.week}};
    state.week = emptyWeek();
    state.weekStart = currentStart;
    changed = true;
  } else if (elapsed < 0) {
    state.weekStart = currentStart;
    changed = true;
  }
  if (state.previousWeek) {
    state.previousWeek = {weekStart:state.previousWeek.weekStart, week:normaliseWeek(state.previousWeek.week)};
    if (!parseDateKey(state.previousWeek.weekStart) || !hasPlannedMeals(state.previousWeek.week) || weeksBetween(state.previousWeek.weekStart, currentStart) > 2) {
      state.previousWeek = null;
      changed = true;
    }
  }
  return changed;
}

function dedupeTags(values) {
  const tags = [];
  const seen = new Set();
  values.flat().forEach(value => {
    const tag = String(value || "").trim();
    const key = tag.toLowerCase();
    if (tag && !seen.has(key) && !RESERVED_TAGS.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  });
  return tags;
}

function ensureTagCatalogue() {
  state.tags = dedupeTags([
    ["Our meals", "Suggestions"],
    Array.isArray(state.tags) ? state.tags : [],
    state.meals.flatMap(meal => meal.tags || []),
    defaultMeals.flatMap(meal => meal.tags || []),
    NEW_IDEAS.flatMap(meal => meal.tags || [])
  ]);
}

function normaliseRecipeUrl(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

async function init() {
  defaultMeals = await fetch("data/meals.json").then(response => response.json());
  const saved = localStorage.getItem(STORE_KEY);
  if (saved) {
    try { state = { ...state, ...JSON.parse(saved) }; } catch { state.meals = defaultMeals; }
  } else state.meals = defaultMeals;
  state.week = normaliseWeek(state.week);
  state.meals = (state.meals || []).map(meal => {
    const seeded = defaultMeals.find(item => item.id === meal.id);
    return {
      ...meal,
      tags: meal.tags?.length ? meal.tags : seeded?.tags || ["Our meals"],
      recipeUrl: normaliseRecipeUrl(meal.recipeUrl) || "",
      preMade: Boolean(meal.preMade),
      separateVersions: Boolean(meal.separateVersions),
      ingredients: (meal.ingredients || []).map(ingredient => ({...ingredient, scope:ingredient.scope || "shared"}))
    };
  });
  ensureTagCatalogue();
  syncRollingWeeks();
  save();
  bindEvents();
  renderAll();
  registerMealPlannerTools();
}

function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function bindEvents() {
  $$(".tab").forEach(tab => tab.addEventListener("click", () => switchView(tab.dataset.view)));
  $("#search").addEventListener("input", renderLibrary);
  $("#add-meal").addEventListener("click", () => openMealDialog());
  $("#close-dialog").addEventListener("click", closeDialog);
  $("#cancel-dialog").addEventListener("click", closeDialog);
  $("#meal-form").addEventListener("submit", saveMealFromForm);
  $("#delete-meal").addEventListener("click", deleteCurrentMeal);
  $("#create-meal-tag").addEventListener("click", createTagFromForm);
  $("#new-tag-name").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); createTagFromForm(); }
  });
  $("#add-ingredient-row").addEventListener("click", () => addIngredientRow());
  $("#meal-separate").addEventListener("change", updateMealOptionFields);
  $("#meal-premade").addEventListener("change", updateMealOptionFields);
  $("#clear-week").addEventListener("click", () => {
    state.week = emptyWeek();
    comparisonId = null;
    save(); renderAll(); showToast("Current week cleared");
  });
  $("#copy-list").addEventListener("click", copyShoppingList);
  $("#refresh-ideas").addEventListener("click", () => { shuffleSeed += 1; renderIdeas(); });
  $("#copy-brief").addEventListener("click", copyRecommendationBrief);
  $("#export-data").addEventListener("click", exportData);
  $("#import-data").addEventListener("change", importData);
  $("#concern-checks").innerHTML = CONCERNS.map(item => `<label><input type="checkbox" value="${item}"> ${item}</label>`).join("");
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && syncRollingWeeks()) { save(); renderAll(); }
  });
}

function switchView(id) {
  $$(".tab").forEach(tab => tab.classList.toggle("active", tab.dataset.view === id));
  $$(".view").forEach(view => view.classList.toggle("active", view.id === id));
}

function renderAll() {
  $("#meal-count").textContent = state.meals.length;
  renderWeek();
  renderLibrary();
  renderIdeas();
}

function weekDates(startKey = state.weekStart) {
  const today = new Date();
  const monday = parseDateKey(startKey) || weekStartDate(today);
  return DAYS.map((name, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { name, date, today: date.toDateString() === today.toDateString() };
  });
}

function formatWeekRange(startKey) {
  const dates = weekDates(startKey);
  const first = dates[0].date;
  const last = dates[6].date;
  const firstText = first.toLocaleDateString("en-GB", {day:"numeric", month:first.getMonth() === last.getMonth() ? undefined : "short"});
  const lastText = last.toLocaleDateString("en-GB", {day:"numeric", month:"short", year:first.getFullYear() === last.getFullYear() ? undefined : "numeric"});
  return `${firstText}–${lastText}${first.getFullYear() === last.getFullYear() ? ` ${last.getFullYear()}` : ""}`;
}

function plannedMeals(week = state.week) {
  return Object.values(week || {}).filter(Boolean).map(id => state.meals.find(meal => meal.id === id)).filter(Boolean);
}

function previousWeekMeals() {
  return state.previousWeek ? plannedMeals(state.previousWeek.week) : [];
}

function aggregateIngredients(meals) {
  const grouped = new Map();
  meals.forEach(meal => meal.ingredients.forEach(ingredient => {
    const scope = ingredient.scope || "shared";
    const key = `${scope}:${meal.preMade ? "pre-made" : "ingredient"}:${ingredient.name.trim().toLowerCase()}`;
    if (!grouped.has(key)) grouped.set(key, { key, name: ingredient.name, scope, preMade:Boolean(meal.preMade), amounts: [], sources: [] });
    const item = grouped.get(key);
    item.preMade = item.preMade || Boolean(meal.preMade);
    if (ingredient.amount) item.amounts.push(ingredient.amount);
    if (!item.sources.includes(meal.name)) item.sources.push(meal.name);
  }));
  return grouped;
}

function renderWeek() {
  const options = state.meals.slice().sort((a,b) => a.name.localeCompare(b.name)).map(meal => `<option value="${escapeHtml(meal.id)}">${escapeHtml(meal.name)}</option>`).join("");
  $("#current-week-range").textContent = formatWeekRange(state.weekStart);
  renderPreviousWeek();
  $("#week-grid").innerHTML = weekDates().map(({name, date, today}) => `<article class="day-card ${today ? "today" : ""}"><span class="day-name">${name.slice(0,3)}</span><span class="day-date">${date.getDate()}</span><select aria-label="Meal for ${name}" data-day="${name}"><option value="">Choose a meal…</option>${options}</select>${state.week[name] ? `<button class="cooked-button" data-cooked="${name}">Mark as cooked</button>` : ""}</article>`).join("");
  $$('[data-day]').forEach(select => {
    select.value = state.week[select.dataset.day] || "";
    select.addEventListener("change", event => {
      state.week[event.target.dataset.day] = event.target.value;
      save(); renderAll();
    });
  });
  $$('[data-cooked]').forEach(button => button.addEventListener("click", () => markCooked(state.week[button.dataset.cooked])));
  const meals = plannedMeals();
  $("#planned-count").textContent = meals.length;
  $("#ingredient-count").textContent = aggregateIngredients(meals).size;
  renderGroceryList(meals);
}

function renderPreviousWeek() {
  const panel = $("#previous-week-panel");
  if (!state.previousWeek) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  $("#previous-week-range").textContent = formatWeekRange(state.previousWeek.weekStart);
  $("#previous-week-grid").innerHTML = DAYS.map(day => {
    const meal = state.meals.find(item => item.id === state.previousWeek.week[day]);
    return `<div class="history-day ${meal ? "" : "empty"}"><span>${day.slice(0,3)}</span><strong>${meal ? escapeHtml(meal.name) : "—"}</strong></div>`;
  }).join("");
}

function renderGroceryList(meals) {
  const list = [...aggregateIngredients(meals).values()].sort((a,b) => a.name.localeCompare(b.name));
  $("#planned-meal-tags").innerHTML = meals.map(meal => `<span class="plan-chip">✓ ${escapeHtml(meal.name)}${meal.preMade ? " · pre-made" : ""}</span>`).join("");
  $("#grocery-list").innerHTML = list.length ? list.map(item => `<div class="grocery-item"><span class="grocery-tick">□</span><div><strong>${escapeHtml(item.name)}</strong>${item.amounts.length ? `<span>${escapeHtml(item.amounts.join(" + "))}</span>` : ""}<small>For ${escapeHtml(item.sources.join(" and "))}</small><div class="item-badges">${ingredientBadges(item)}</div></div></div>`).join("") : `<div class="grocery-empty">Choose meals above and their ingredients will appear here.</div>`;
}

function ingredientBadges(item) {
  const scope = item.scope === "vegetarian" ? `<span class="scope-badge vegetarian">Veggie version</span>` : item.scope === "meat" ? `<span class="scope-badge meat">Meat version</span>` : "";
  return `${scope}${item.preMade ? `<span class="ready-badge">Buy pre-made</span>` : ""}`;
}

function getAllTags() {
  return [...new Set(state.meals.flatMap(meal => [...(meal.tags || []), ...(meal.preMade ? ["Pre-made"] : [])]))].sort((a,b) => a.localeCompare(b));
}

function tagMarkup(tags = [], preMade = false) {
  const visibleTags = preMade && !tags.some(tag => tag.toLowerCase() === "pre-made") ? [...tags, "Pre-made"] : tags;
  return visibleTags.map(tag => `<span class="meal-tag ${tag.toLowerCase() === "suggestions" ? "suggestion-tag" : ""} ${tag.toLowerCase() === "pre-made" ? "premade-tag" : ""}">${escapeHtml(tag)}</span>`).join("");
}

function selectedFormTags() {
  return $$('#meal-tag-options input:checked').map(input => input.value);
}

function renderMealTagPicker(selectedTags = []) {
  const selected = new Set(selectedTags.map(tag => tag.toLowerCase()));
  $("#meal-tag-options").innerHTML = state.tags.slice().sort((a,b) => a.localeCompare(b)).map(tag => `<label class="tag-choice"><input type="checkbox" value="${escapeHtml(tag)}" ${selected.has(tag.toLowerCase()) ? "checked" : ""} /> <span>${escapeHtml(tag)}</span></label>`).join("");
}

function createTagFromForm() {
  const input = $("#new-tag-name");
  const candidate = input.value.trim();
  if (!candidate) return showToast("Enter a tag name first");
  if (RESERVED_TAGS.has(candidate.toLowerCase())) return showToast("Use the pre-made meal option for that marker");
  const existing = state.tags.find(tag => tag.toLowerCase() === candidate.toLowerCase());
  const tag = existing || candidate;
  if (!existing) state.tags.push(tag);
  const selected = dedupeTags([selectedFormTags(), [tag]]);
  input.value = "";
  renderMealTagPicker(selected);
  save();
  showToast(existing ? `${tag} selected` : `${tag} created and selected`);
}

function renderLibrary() {
  const query = $("#search").value.trim().toLowerCase();
  const tags = getAllTags();
  if (activeTag !== "All" && !tags.includes(activeTag)) activeTag = "All";
  $("#tag-filters").innerHTML = ["All", ...tags].map(tag => `<button class="tag-filter ${activeTag === tag ? "active" : ""}" data-tag-filter="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join("");
  $$('[data-tag-filter]').forEach(button => button.addEventListener("click", () => { activeTag = button.dataset.tagFilter; renderLibrary(); }));
  const plannedIds = new Set(Object.values(state.week));
  const meals = state.meals.filter(meal => {
    const matchesText = [meal.name, meal.category, meal.notes, ...(meal.tags || []), ...(meal.preMade ? ["pre-made"] : []), ...meal.ingredients.map(item => item.name)].join(" ").toLowerCase().includes(query);
    const mealTags = [...(meal.tags || []), ...(meal.preMade ? ["Pre-made"] : [])];
    return matchesText && (activeTag === "All" || mealTags.includes(activeTag));
  });
  $("#meal-grid").innerHTML = meals.map(meal => `<article class="meal-card ${plannedIds.has(meal.id) ? "is-planned" : ""}"><div class="card-top"><span class="category">${plannedIds.has(meal.id) ? "✓ Planned" : escapeHtml(meal.category || "Meal")}</span><span class="minutes">${meal.minutes ? `${meal.minutes} min` : "No time set"}</span></div><h3>${escapeHtml(meal.name)}</h3><div class="meal-tags">${tagMarkup(meal.tags, meal.preMade)}</div><p class="ingredient-preview">${meal.ingredients.slice(0,6).map(item => `${escapeHtml(item.name)}${item.scope === "vegetarian" ? " (veggie)" : item.scope === "meat" ? " (meat)" : ""}`).join(" · ")}${meal.ingredients.length > 6 ? "…" : ""}</p>${meal.recipeUrl ? `<a class="recipe-link" href="${escapeHtml(meal.recipeUrl)}" target="_blank" rel="noopener noreferrer">Open recipe ↗</a>` : `<button type="button" class="recipe-link" data-recipe="${meal.id}">+ Add recipe link</button>`}${meal.notes ? `<p class="meal-note">${escapeHtml(meal.notes)}</p>` : `<p class="meal-note">Not cooked yet</p>`}<div class="card-actions">${plannedIds.has(meal.id) ? `<button class="text-button" data-unplan="${meal.id}">Remove from week</button>` : `<button class="text-button" data-plan="${meal.id}">Add to week</button>`}<button class="text-button muted" data-edit="${meal.id}">Edit</button></div></article>`).join("");
  $("#empty-library").hidden = meals.length > 0;
  $$('[data-plan]').forEach(button => button.addEventListener("click", () => addToNextDay(button.dataset.plan)));
  $$('[data-unplan]').forEach(button => button.addEventListener("click", () => removeFromWeek(button.dataset.unplan)));
  $$('[data-recipe]').forEach(button => button.addEventListener("click", () => { openMealDialog(button.dataset.recipe); $("#meal-recipe-url").focus(); }));
  $$('[data-edit]').forEach(button => button.addEventListener("click", () => openMealDialog(button.dataset.edit)));
}

function tasteTags(meal) {
  return (meal.tags || []).filter(tag => !NON_PALETTE_TAGS.has(tag.toLowerCase()));
}

function paletteCounts() {
  const counts = new Map();
  [...previousWeekMeals(), ...plannedMeals()].forEach(meal => tasteTags(meal).forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
  return counts;
}

function balanceScore(meal, counts, previousIds = new Set()) {
  const tags = tasteTags(meal);
  const repetition = tags.length ? Math.min(...tags.map(tag => counts.get(tag) || 0)) : 2;
  return repetition * 10 + (previousIds.has(meal.id) ? 50 : 0) + (meal.timesCooked || 0) * 0.1 + (meal.lastCooked ? 0.5 : 0);
}

function balanceReason(meal, counts, previousIds = new Set()) {
  const tags = tasteTags(meal);
  if (previousIds.has(meal.id)) return "You had this in the previous week, so fresher options rank ahead of it";
  const freshTag = tags.find(tag => !counts.has(tag));
  if (freshTag) return `Adds ${freshTag} flavours across the two-week view`;
  if (!counts.size) return tags.length ? `Start the week with ${tags[0]} flavours` : "A flexible starting point";
  return tags.length ? `${tags[0]} is one of the least-used palettes across both weeks` : "Keeps the two weeks varied";
}

function renderIdeas() {
  const counts = paletteCounts();
  $("#palate-snapshot").innerHTML = counts.size ? [...counts.entries()].sort((a,b) => b[1] - a[1]).map(([tag,count]) => `<span class="palette-chip"><strong>${escapeHtml(tag)}</strong> ${count}×</span>`).join("") : `<span class="palette-empty">No meals in either retained week — your first choice sets the baseline.</span>`;
  const plannedIds = new Set(Object.values(state.week));
  const previousIds = new Set(state.previousWeek ? Object.values(state.previousWeek.week) : []);
  const candidates = state.meals.filter(meal => !plannedIds.has(meal.id)).sort((a,b) => balanceScore(a, counts, previousIds) - balanceScore(b, counts, previousIds) || (a.lastCooked || "").localeCompare(b.lastCooked || "") || a.name.localeCompare(b.name)).slice(0,3);
  $("#unused-grid").innerHTML = candidates.length ? candidates.map(meal => ideaCard(meal, balanceReason(meal, counts, previousIds), false)).join("") : `<div class="empty">Every library meal is already in this week.</div>`;
  const freshIdeas = NEW_IDEAS.filter(idea => !state.meals.some(meal => meal.id === idea.id)).sort((a,b) => balanceScore(a, counts, previousIds) - balanceScore(b, counts, previousIds) || seededOrder(a.id) - seededOrder(b.id)).slice(0,3);
  $("#new-grid").innerHTML = freshIdeas.length ? freshIdeas.map(meal => ideaCard(meal, balanceReason(meal, counts, previousIds), true)).join("") : `<div class="empty">You have saved all current suggestions to your library.</div>`;
  $$('[data-compare]').forEach(button => button.addEventListener("click", () => { comparisonId = button.dataset.compare; renderComparison(); $("#comparison-panel").scrollIntoView({behavior:"smooth", block:"start"}); }));
  renderComparison();
}

function seededOrder(id) {
  let value = shuffleSeed;
  for (const character of id) value = (value * 31 + character.charCodeAt(0)) % 997;
  return value;
}

function ideaCard(meal, reason, isNew) {
  return `<article class="idea-card"><div class="card-top"><span class="category">${isNew ? "New suggestion" : meal.lastCooked ? "Unused lately" : "From your library"}</span><span class="minutes">${meal.minutes} min</span></div><h3>${escapeHtml(meal.name)}</h3><div class="meal-tags">${tagMarkup(meal.tags, meal.preMade)}</div><p>${escapeHtml(meal.notes || meal.ingredients.slice(0,4).map(item => item.name).join(", "))}</p><p class="reason">${escapeHtml(reason)}</p><button class="text-button compare-button" data-compare="${meal.id}">Compare grocery list →</button></article>`;
}

function findAnyMeal(id) {
  return state.meals.find(meal => meal.id === id) || NEW_IDEAS.find(meal => meal.id === id);
}

function renderComparison() {
  const panel = $("#comparison-panel");
  const meal = findAnyMeal(comparisonId);
  if (!meal) {
    panel.innerHTML = `<div class="comparison-empty"><p class="eyebrow blue">Grocery comparison</p><h3>Choose a suggestion above</h3><p>We’ll compare it with your planned meals and highlight only the ingredients it adds.</p></div>`;
    return;
  }
  const base = aggregateIngredients(plannedMeals());
  const combined = aggregateIngredients([...plannedMeals(), meal]);
  const items = [...combined.values()].map(item => ({...item, isNew:!base.has(item.key)})).sort((a,b) => Number(a.isNew) - Number(b.isNew) || a.name.localeCompare(b.name));
  const newCount = items.filter(item => item.isNew).length;
  panel.innerHTML = `<div class="comparison-head"><div><p class="eyebrow blue">Amended grocery list</p><h3>Add ${escapeHtml(meal.name)}</h3><p>${newCount} ${newCount === 1 ? "ingredient is" : "ingredients are"} new to your current list.${meal.preMade ? " Pre-made items stay as packs to buy." : ""}</p></div><div class="comparison-actions"><button class="button ghost" id="copy-amended">Copy amended list</button><button class="button primary" id="accept-suggestion">Add to week</button></div></div><div class="amended-list">${items.map(item => `<div class="amended-item ${item.isNew ? "new" : ""}"><span class="grocery-tick">□</span><div><strong>${escapeHtml(item.name)}</strong>${item.amounts.length ? `<span>${escapeHtml(item.amounts.join(" + "))}</span>` : ""}<div class="item-badges">${ingredientBadges(item)}</div></div>${item.isNew ? `<b>NEW</b>` : `<small>Already listed</small>`}</div>`).join("")}</div>`;
  $("#copy-amended").addEventListener("click", () => copyAmendedList(meal));
  $("#accept-suggestion").addEventListener("click", () => addSuggestedMeal(meal));
}

function addToNextDay(mealId) {
  const day = DAYS.find(name => !state.week[name]);
  if (!day) return showToast("The week is already full");
  state.week[day] = mealId;
  save(); renderAll(); showToast(`Added to ${day}`);
}

function addSuggestedMeal(meal) {
  if (!state.meals.some(item => item.id === meal.id)) state.meals.push(structuredClone(meal));
  comparisonId = null;
  addToNextDay(meal.id);
  switchView("week");
}

function removeFromWeek(mealId) {
  DAYS.forEach(day => { if (state.week[day] === mealId) state.week[day] = ""; });
  save(); renderAll(); showToast("Removed from this week");
}

function markCooked(mealId) {
  const meal = state.meals.find(item => item.id === mealId);
  if (!meal) return;
  meal.lastCooked = new Date().toISOString().slice(0,10);
  meal.timesCooked = (meal.timesCooked || 0) + 1;
  save(); renderAll(); showToast(`${meal.name} marked as cooked`);
}

function addIngredientRow(ingredient = {}) {
  const row = document.createElement("div");
  row.className = "ingredient-row";
  row.innerHTML = `<label><span>Ingredient or product</span><input class="ingredient-name" placeholder="e.g. veggie nuggets" value="${escapeHtml(ingredient.name || "")}" /></label><label><span>Amount</span><input class="ingredient-amount" placeholder="e.g. 1 pack" value="${escapeHtml(ingredient.amount || "")}" /></label><label class="ingredient-scope-wrap"><span>For</span><select class="ingredient-scope"><option value="shared">Both</option><option value="vegetarian">Veggie version</option><option value="meat">Meat version</option></select></label><button type="button" class="remove-ingredient" aria-label="Remove ingredient">×</button>`;
  row.querySelector(".ingredient-scope").value = ingredient.scope || "shared";
  row.querySelector(".remove-ingredient").addEventListener("click", () => {
    if ($$(".ingredient-row").length === 1) {
      row.querySelectorAll("input").forEach(input => input.value = "");
      row.querySelector("input").focus();
    } else row.remove();
  });
  $("#ingredient-rows").append(row);
}

function updateMealOptionFields() {
  const separate = $("#meal-separate").checked;
  const preMade = $("#meal-premade").checked;
  $("#ingredient-builder").classList.toggle("has-separate", separate);
  $("#ingredient-legend").textContent = preMade ? "What to buy" : "Ingredients";
  $("#ingredient-help").textContent = preMade ? "Add each ready-made pack and any sides. The grocery list will not invent ingredients for making these from scratch." : "Add each ingredient and the amount you normally buy.";
  if (!separate) $$(".ingredient-scope").forEach(select => select.value = "shared");
}

function openMealDialog(id) {
  const meal = state.meals.find(item => item.id === id);
  $("#dialog-title").textContent = meal ? "Edit meal" : "Add a meal";
  $("#meal-id").value = meal?.id || "";
  $("#meal-name").value = meal?.name || "";
  $("#meal-category").value = meal?.category || "";
  $("#meal-minutes").value = meal?.minutes || "";
  $("#meal-recipe-url").value = meal?.recipeUrl || "";
  $("#new-tag-name").value = "";
  renderMealTagPicker(meal?.tags?.length ? meal.tags : ["Our meals"]);
  $("#meal-separate").checked = Boolean(meal?.separateVersions);
  $("#meal-premade").checked = Boolean(meal?.preMade);
  $("#meal-notes").value = meal?.notes || "";
  $("#ingredient-rows").innerHTML = "";
  (meal?.ingredients?.length ? meal.ingredients : [{}]).forEach(addIngredientRow);
  const dominant = new Set((meal?.ingredients || []).filter(item => item.dominant).map(item => item.concern || item.name.toLowerCase()));
  $$('#concern-checks input').forEach(checkbox => checkbox.checked = dominant.has(checkbox.value));
  $("#delete-meal").hidden = !meal;
  updateMealOptionFields();
  $("#meal-dialog").showModal();
}

function closeDialog() { $("#meal-dialog").close(); }

function saveMealFromForm(event) {
  event.preventDefault();
  const existingId = $("#meal-id").value;
  const dominant = new Set($$('#concern-checks input:checked').map(checkbox => checkbox.value));
  const separateVersions = $("#meal-separate").checked;
  const preMade = $("#meal-premade").checked;
  const rawRecipeUrl = $("#meal-recipe-url").value;
  const recipeUrl = normaliseRecipeUrl(rawRecipeUrl);
  if (rawRecipeUrl.trim() && !recipeUrl) return showToast("Use a valid http or https recipe link");
  const ingredients = $$(".ingredient-row").map(row => ({name:row.querySelector(".ingredient-name").value.trim(), amount:row.querySelector(".ingredient-amount").value.trim(), scope:separateVersions ? row.querySelector(".ingredient-scope").value : "shared"})).filter(item => item.name).map(item => {
    const concern = CONCERNS.find(value => item.name.toLowerCase().includes(value));
    return {name:item.name, scope:item.scope, ...(item.amount ? {amount:item.amount} : {}), ...(concern ? {concern, dominant:dominant.has(concern)} : {})};
  });
  if (!ingredients.length) return showToast("Add at least one ingredient");
  const tags = dedupeTags(selectedFormTags());
  const meal = {id:existingId || slugify($("#meal-name").value), name:$("#meal-name").value.trim(), category:$("#meal-category").value.trim() || "Meal", minutes:Number($("#meal-minutes").value) || null, tags:tags.length ? tags : ["Our meals"], recipeUrl:recipeUrl || "", preMade, separateVersions, ingredients, notes:$("#meal-notes").value.trim()};
  const index = state.meals.findIndex(item => item.id === existingId);
  if (index >= 0) state.meals[index] = {...state.meals[index], ...meal, id:existingId};
  else {
    while (state.meals.some(item => item.id === meal.id)) meal.id += "-2";
    meal.lastCooked = null;
    meal.timesCooked = 0;
    state.meals.push(meal);
  }
  save(); closeDialog(); renderAll(); showToast("Meal saved");
}

function deleteCurrentMeal() {
  const id = $("#meal-id").value;
  if (!id || !confirm("Delete this meal from the library?")) return;
  state.meals = state.meals.filter(meal => meal.id !== id);
  DAYS.forEach(day => { if (state.week[day] === id) state.week[day] = ""; });
  if (state.previousWeek) DAYS.forEach(day => { if (state.previousWeek.week[day] === id) state.previousWeek.week[day] = ""; });
  if (state.previousWeek && !hasPlannedMeals(state.previousWeek.week)) state.previousWeek = null;
  save(); closeDialog(); renderAll(); showToast("Meal deleted");
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `meal-${Date.now()}`;
}

async function copyShoppingList() {
  const items = [...aggregateIngredients(plannedMeals()).values()].sort((a,b) => a.name.localeCompare(b.name));
  if (!items.length) return showToast("Choose some meals first");
  await navigator.clipboard.writeText(items.map(item => shoppingLine(item)).join("\n"));
  showToast("Shopping list copied");
}

async function copyAmendedList(meal) {
  const base = aggregateIngredients(plannedMeals());
  const items = [...aggregateIngredients([...plannedMeals(), meal]).values()].sort((a,b) => a.name.localeCompare(b.name));
  await navigator.clipboard.writeText(items.map(item => shoppingLine(item, !base.has(item.key))).join("\n"));
  showToast("Amended list copied");
}

function shoppingLine(item, isNew = false) {
  const scope = item.scope === "vegetarian" ? " [VEGGIE VERSION]" : item.scope === "meat" ? " [MEAT VERSION]" : "";
  const ready = item.preMade ? " [BUY PRE-MADE]" : "";
  return `□ ${item.name}${scope}${ready}${item.amounts.length ? ` — ${item.amounts.join(" + ")}` : ""}${isNew ? "  ← NEW" : ""}`;
}

async function copyRecommendationBrief() {
  const planned = DAYS.map(day => state.week[day] ? `${day}: ${state.meals.find(meal => meal.id === state.week[day])?.name || ""}` : `${day}: open`).join("\n");
  const previous = state.previousWeek ? DAYS.map(day => state.previousWeek.week[day] ? `${day}: ${state.meals.find(meal => meal.id === state.previousWeek.week[day])?.name || ""}` : `${day}: open`).join("\n") : "No previous week retained.";
  const library = state.meals.map(meal => `- ${meal.name} [tags: ${(meal.tags || []).join(", ")}; ${meal.minutes || "?"} min; ${meal.preMade ? "BUY PRE-MADE — use only the listed products" : "cook from ingredients"}; ${meal.separateVersions ? "separate veggie and meat versions" : "shared vegetarian meal"}]: ${meal.ingredients.map(item => `${item.name}${item.scope === "vegetarian" ? " (veggie version)" : item.scope === "meat" ? " (meat version)" : ""}`).join(", ")}. Recipe: ${meal.recipeUrl || "not saved"}. Last cooked: ${meal.lastCooked || "not logged"}.`).join("\n");
  const text = `Help us plan dinners for two.\n\nHard rules:\n- Every dinner needs a vegetarian version for my wife. A meat version for me is allowed only when cooked separately.\n- Exclude coconut entirely (mild allergy).\n- A meal marked BUY PRE-MADE means the listed products are the entire grocery requirement. Never infer flour, raw meat, spices or other scratch-cooking ingredients for it.\n\nFlavour preferences:\n- Vinegar, tomato, olives, mushrooms and wine may be minor ingredients but must not be the main flavour profile. Tomato soup is a hard no; a little ketchup in a burger is fine.\n- Garlic, onion and cabbage should be used lightly because of mild intolerances. A dish heavy on one is okay only occasionally.\n- Balance cuisine and flavour tags across this week and the retained previous week so no palate dominates.\n\nThis week (${formatWeekRange(state.weekStart)}):\n${planned}\n\nPrevious retained week${state.previousWeek ? ` (${formatWeekRange(state.previousWeek.weekStart)})` : ""}:\n${previous}\n\nStandard meal tags:\n${state.tags.join(", ")}\n\nOur meal library:\n${library}\n\nFirst suggest unused library meals for open days, avoiding meals and dominant palettes from the previous week where practical. Then suggest 3 new meals tagged Suggestions. Flag sensitive ingredients as minor or dominant, and show how each option amends the current grocery list.`;
  await navigator.clipboard.writeText(text);
  showToast("Recommendation brief copied");
}

function exportData() {
  const blob = new Blob([JSON.stringify({version:4, exportedAt:new Date().toISOString(), ...state}, null, 2)], {type:"application/json"});
  const link = Object.assign(document.createElement("a"), {href:URL.createObjectURL(blob), download:`our-table-${new Date().toISOString().slice(0,10)}.json`});
  link.click(); URL.revokeObjectURL(link.href); showToast("Backup exported");
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.meals)) throw new Error("No meals found");
    state = {
      meals:data.meals.map(meal => ({...meal, tags:meal.tags?.length ? meal.tags : ["Our meals"], recipeUrl:normaliseRecipeUrl(meal.recipeUrl) || "", preMade:Boolean(meal.preMade), separateVersions:Boolean(meal.separateVersions), ingredients:(meal.ingredients || []).map(item => ({...item, scope:item.scope || "shared"}))})),
      tags:Array.isArray(data.tags) ? data.tags : [],
      week:normaliseWeek(data.week),
      weekStart:data.weekStart || dateKey(weekStartDate()),
      previousWeek:data.previousWeek || null
    };
    ensureTagCatalogue();
    syncRollingWeeks();
    save(); renderAll(); showToast("Backup imported");
  } catch { showToast("That backup could not be read"); }
  event.target.value = "";
}

function registerMealPlannerTools() {
  const context = typeof document === "undefined" ? undefined : document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  try {
    void Promise.resolve(context.registerTool({
      name: "plan_meal",
      title: "Plan a meal",
      description: "Add an existing meal from the library to the next open day in this week's plan.",
      inputSchema: {
        type: "object",
        properties: {meal_id:{type:"string", description:"Meal id from the library"}},
        required: ["meal_id"],
        additionalProperties: false
      },
      annotations: {readOnlyHint:false, untrustedContentHint:false},
      execute(input) {
        const mealId = typeof input?.meal_id === "string" ? input.meal_id : "";
        const meal = state.meals.find(item => item.id === mealId);
        if (!meal) throw new Error("Choose a meal_id that exists in the meal library.");
        const day = DAYS.find(name => !state.week[name]);
        if (!day) throw new Error("The week is already full.");
        state.week[day] = mealId;
        save();
        renderAll();
        return {status:"planned", day, meal_id:mealId, meal_name:meal.name};
      }
    }, {signal:lifecycle.signal})).catch(error => console.warn("Meal planner tool could not register", error));
  } catch (error) {
    console.warn("Meal planner tool could not register", error);
  }
}

init().catch(() => { document.body.innerHTML = '<main class="empty">The meal data could not be loaded. Please refresh the page.</main>'; });
