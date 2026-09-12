const STORE_KEY = "our-table-v1";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MAX_LAST_WEEK_MEALS = 10;
const NON_PALETTE_TAGS = new Set(["suggestions", "our meals", "pre-made", "budget friendly", "simple to make", "quick", "easy", "one tray", "spring", "summer", "autumn", "winter"]);
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

let state = { meals: [], week: emptyWeek(), weekStart: "", previousWeek: null, suggestionSources: {previous:true, current:true} };
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

function previousMealIds(previousWeek = state.previousWeek) {
  if (!previousWeek) return [];
  if (Array.isArray(previousWeek.mealIds)) return previousWeek.mealIds.filter(Boolean).slice(0, MAX_LAST_WEEK_MEALS);
  if (previousWeek.week && typeof previousWeek.week === "object") return Object.values(previousWeek.week).filter(Boolean).slice(0, MAX_LAST_WEEK_MEALS);
  return [];
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

function lastWeekStartKey() {
  const date = weekStartDate();
  date.setDate(date.getDate() - 7);
  return dateKey(date);
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
    if (hasPlannedMeals(state.week)) state.previousWeek = {weekStart:state.weekStart, mealIds:Object.values(state.week).filter(Boolean).slice(0, MAX_LAST_WEEK_MEALS)};
    state.week = emptyWeek();
    state.weekStart = currentStart;
    changed = true;
  } else if (elapsed < 0) {
    state.weekStart = currentStart;
    changed = true;
  }
  if (state.previousWeek) {
    state.previousWeek = {
      weekStart:parseDateKey(state.previousWeek.weekStart) ? state.previousWeek.weekStart : lastWeekStartKey(),
      mealIds:previousMealIds(state.previousWeek)
    };
    if (!state.previousWeek.mealIds.length || weeksBetween(state.previousWeek.weekStart, currentStart) > 2) {
      state.previousWeek = null;
      changed = true;
    }
  }
  return changed;
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
  let savedState = {};
  if (saved) {
    try { savedState = JSON.parse(saved); } catch { savedState = {}; }
  }
  const savedMeals = new Map((Array.isArray(savedState.meals) ? savedState.meals : []).map(meal => [meal.id, meal]));
  state = {
    meals: [],
    week: normaliseWeek(savedState.week),
    weekStart: savedState.weekStart || "",
    previousWeek: savedState.previousWeek || null,
    suggestionSources: {
      previous:savedState.suggestionSources?.previous !== false,
      current:savedState.suggestionSources?.current !== false
    }
  };
  state.meals = defaultMeals.map(meal => {
    const savedMeal = savedMeals.get(meal.id);
    return {
      ...meal,
      tags: meal.tags?.length ? meal.tags : ["Our meals"],
      recipeUrl: normaliseRecipeUrl(meal.recipeUrl) || "",
      preMade: Boolean(meal.preMade),
      separateVersions: Boolean(meal.separateVersions),
      ingredients: (meal.ingredients || []).map(ingredient => ({...ingredient, scope:ingredient.scope || "shared"})),
      lastCooked: savedMeal?.lastCooked || meal.lastCooked || null,
      timesCooked: Number.isFinite(savedMeal?.timesCooked) ? savedMeal.timesCooked : Number(meal.timesCooked) || 0
    };
  });
  const mealIds = new Set(state.meals.map(meal => meal.id));
  DAYS.forEach(day => { if (!mealIds.has(state.week[day])) state.week[day] = ""; });
  if (state.previousWeek) {
    const retainedIds = previousMealIds().filter(id => mealIds.has(id));
    state.previousWeek = retainedIds.length ? {
      weekStart:parseDateKey(state.previousWeek.weekStart) ? state.previousWeek.weekStart : lastWeekStartKey(),
      mealIds:retainedIds
    } : null;
  }
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
  $("#clear-week").addEventListener("click", () => {
    state.week = emptyWeek();
    comparisonId = null;
    save(); renderAll(); showToast("Current week cleared");
  });
  $("#copy-list").addEventListener("click", copyShoppingList);
  $("#refresh-ideas").addEventListener("click", () => { shuffleSeed += 1; renderIdeas(); });
  $("#include-previous-week").addEventListener("change", event => updateSuggestionSource("previous", event.target.checked));
  $("#include-current-week").addEventListener("change", event => updateSuggestionSource("current", event.target.checked));
  $("#add-last-week-meal").addEventListener("click", addLastWeekMeal);
  $("#last-week-meal-select").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); addLastWeekMeal(); }
  });
  $("#clear-last-week").addEventListener("click", () => {
    if (!previousMealIds().length) return;
    state.previousWeek = null;
    save(); renderAll(); showToast("Last week cleared");
  });
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
  return previousMealIds().map(id => state.meals.find(meal => meal.id === id)).filter(Boolean);
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
  const ids = previousMealIds();
  const select = $("#last-week-meal-select");
  $("#previous-week-range").textContent = formatWeekRange(state.previousWeek?.weekStart || lastWeekStartKey());
  $("#last-week-count").textContent = `${ids.length} / ${MAX_LAST_WEEK_MEALS} meals`;
  select.innerHTML = `<option value="">Choose from the library…</option>${state.meals.slice().sort((a,b) => a.name.localeCompare(b.name)).map(meal => `<option value="${escapeHtml(meal.id)}">${escapeHtml(meal.name)}</option>`).join("")}`;
  select.disabled = ids.length >= MAX_LAST_WEEK_MEALS;
  $("#add-last-week-meal").disabled = ids.length >= MAX_LAST_WEEK_MEALS;
  $("#clear-last-week").disabled = !ids.length;
  $("#previous-week-grid").innerHTML = ids.length ? ids.map((id, index) => {
    const meal = state.meals.find(item => item.id === id);
    return `<div class="history-meal"><span>${index + 1}</span><div><strong>${escapeHtml(meal.name)}</strong><small>${escapeHtml(tasteTags(meal).join(" · ") || meal.category || "Meal")}</small></div><button type="button" data-remove-last-week="${index}" aria-label="Remove ${escapeHtml(meal.name)} from last week">×</button></div>`;
  }).join("") : `<p class="history-empty">Add the meals you remember from last week. They will immediately influence Suggestions.</p>`;
  $$('[data-remove-last-week]').forEach(button => button.addEventListener("click", () => removeLastWeekMeal(Number(button.dataset.removeLastWeek))));
}

function addLastWeekMeal() {
  const select = $("#last-week-meal-select");
  const mealId = select.value;
  const ids = previousMealIds();
  if (!mealId) return showToast("Choose a meal first");
  if (ids.length >= MAX_LAST_WEEK_MEALS) return showToast("Last week is limited to 10 meals");
  state.previousWeek = {
    weekStart:state.previousWeek?.weekStart || lastWeekStartKey(),
    mealIds:[...ids, mealId]
  };
  save(); renderAll(); showToast("Added to last week");
}

function removeLastWeekMeal(index) {
  const ids = previousMealIds();
  const [removedId] = ids.splice(index, 1);
  const removedMeal = state.meals.find(meal => meal.id === removedId);
  state.previousWeek = ids.length ? {weekStart:state.previousWeek.weekStart, mealIds:ids} : null;
  save(); renderAll(); showToast(removedMeal ? `${removedMeal.name} removed` : "Meal removed");
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
  $("#meal-grid").innerHTML = meals.map(meal => `<article class="meal-card ${plannedIds.has(meal.id) ? "is-planned" : ""}"><div class="card-top"><span class="category">${plannedIds.has(meal.id) ? "✓ Planned" : escapeHtml(meal.category || "Meal")}</span><span class="minutes">${meal.minutes ? `${meal.minutes} min` : "No time set"}</span></div><h3>${escapeHtml(meal.name)}</h3><div class="meal-tags">${tagMarkup(meal.tags, meal.preMade)}</div><p class="ingredient-preview">${meal.ingredients.slice(0,6).map(item => `${escapeHtml(item.name)}${item.scope === "vegetarian" ? " (veggie)" : item.scope === "meat" ? " (meat)" : ""}`).join(" · ")}${meal.ingredients.length > 6 ? "…" : ""}</p>${meal.recipeUrl ? `<a class="recipe-link" href="${escapeHtml(meal.recipeUrl)}" target="_blank" rel="noopener noreferrer">Open recipe ↗</a>` : ""}${meal.notes ? `<p class="meal-note">${escapeHtml(meal.notes)}</p>` : `<p class="meal-note">Not cooked yet</p>`}<div class="card-actions">${plannedIds.has(meal.id) ? `<button class="text-button" data-unplan="${meal.id}">Remove from week</button>` : `<button class="text-button" data-plan="${meal.id}">Add to week</button>`}</div></article>`).join("");
  $("#empty-library").hidden = meals.length > 0;
  $$('[data-plan]').forEach(button => button.addEventListener("click", () => addToNextDay(button.dataset.plan)));
  $$('[data-unplan]').forEach(button => button.addEventListener("click", () => removeFromWeek(button.dataset.unplan)));
}

function tasteTags(meal) {
  return (meal.tags || []).filter(tag => !NON_PALETTE_TAGS.has(tag.toLowerCase()));
}

function paletteCounts() {
  const counts = new Map();
  const meals = [
    ...(state.suggestionSources.previous ? previousWeekMeals() : []),
    ...(state.suggestionSources.current ? plannedMeals() : [])
  ];
  meals.forEach(meal => tasteTags(meal).forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
  return counts;
}

function balanceScore(meal, counts) {
  const tags = tasteTags(meal);
  const repetition = tags.length ? Math.min(...tags.map(tag => counts.get(tag) || 0)) : 2;
  return repetition * 10 + (meal.timesCooked || 0) * 0.1 + (meal.lastCooked ? 0.5 : 0);
}

function balanceReason(meal, counts) {
  const tags = tasteTags(meal);
  const freshTag = tags.find(tag => !counts.has(tag));
  if (freshTag) return `Adds ${freshTag} flavours beyond the weeks you’re including`;
  if (!counts.size) return tags.length ? `Start the week with ${tags[0]} flavours` : "A flexible starting point";
  return tags.length ? `${tags[0]} is one of the least-used palettes in the selected weeks` : "Keeps the selected weeks varied";
}

function updateSuggestionSource(source, included) {
  state.suggestionSources[source] = included;
  save();
  renderIdeas();
}

function renderSuggestionSources() {
  const previousIncluded = state.suggestionSources.previous;
  const currentIncluded = state.suggestionSources.current;
  $("#include-previous-week").checked = previousIncluded;
  $("#include-current-week").checked = currentIncluded;
  $("#previous-suggestion-source").classList.toggle("inactive", !previousIncluded);
  $("#current-suggestion-source").classList.toggle("inactive", !currentIncluded);
  $("#previous-source-status").textContent = previousIncluded ? "Included in balance" : "Not used for balance";
  $("#current-source-status").textContent = currentIncluded ? "Included in balance" : "Not used for balance";

  const previousGroups = new Map();
  previousWeekMeals().forEach(meal => {
    if (!previousGroups.has(meal.id)) previousGroups.set(meal.id, {meal, count:0});
    previousGroups.get(meal.id).count += 1;
  });
  $("#previous-source-meals").innerHTML = previousGroups.size ? [...previousGroups.values()].map(({meal, count}) => `<span class="source-meal-chip">${escapeHtml(meal.name)}${count > 1 ? ` <b>×${count}</b>` : ""}</span>`).join("") : `<span class="source-empty">No meals recorded</span>`;

  const currentMeals = DAYS.map(day => ({day, meal:state.meals.find(meal => meal.id === state.week[day])})).filter(item => item.meal);
  $("#current-source-meals").innerHTML = currentMeals.length ? currentMeals.map(({day, meal}) => `<span class="source-meal-chip"><b>${day.slice(0, 3)}</b> ${escapeHtml(meal.name)}</span>`).join("") : `<span class="source-empty">No meals planned</span>`;
}

function renderIdeas() {
  renderSuggestionSources();
  const counts = paletteCounts();
  const anySourceIncluded = state.suggestionSources.previous || state.suggestionSources.current;
  $("#palate-snapshot").innerHTML = counts.size ? [...counts.entries()].sort((a,b) => b[1] - a[1]).map(([tag,count]) => `<span class="palette-chip"><strong>${escapeHtml(tag)}</strong> ${count}×</span>`).join("") : `<span class="palette-empty">${anySourceIncluded ? "No meals in the included weeks yet." : "Both week switches are off — suggestions start from a clean slate."}</span>`;
  const plannedIds = new Set(Object.values(state.week).filter(Boolean));
  const previousIds = new Set(previousMealIds());
  const excludedIds = new Set([...plannedIds, ...previousIds]);
  if (excludedIds.has(comparisonId)) comparisonId = null;
  const candidates = state.meals.filter(meal => !excludedIds.has(meal.id)).sort((a,b) => balanceScore(a, counts) - balanceScore(b, counts) || (a.lastCooked || "").localeCompare(b.lastCooked || "") || a.name.localeCompare(b.name)).slice(0,3);
  $("#unused-grid").innerHTML = candidates.length ? candidates.map(meal => ideaCard(meal, balanceReason(meal, counts), false)).join("") : `<div class="empty">Every library meal is already in last week or this week.</div>`;
  const freshIdeas = NEW_IDEAS.filter(idea => !state.meals.some(meal => meal.id === idea.id) && !excludedIds.has(idea.id)).sort((a,b) => balanceScore(a, counts) - balanceScore(b, counts) || seededOrder(a.id) - seededOrder(b.id)).slice(0,3);
  $("#new-grid").innerHTML = freshIdeas.length ? freshIdeas.map(meal => ideaCard(meal, balanceReason(meal, counts), true)).join("") : `<div class="empty">You have saved or already selected all current suggestions.</div>`;
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
  const isLibraryMeal = state.meals.some(item => item.id === meal.id);
  panel.innerHTML = `<div class="comparison-head"><div><p class="eyebrow blue">Amended grocery list</p><h3>Add ${escapeHtml(meal.name)}</h3><p>${newCount} ${newCount === 1 ? "ingredient is" : "ingredients are"} new to your current list.${meal.preMade ? " Pre-made items stay as packs to buy." : ""}</p></div><div class="comparison-actions"><button class="button ghost" id="copy-amended">Copy amended list</button>${isLibraryMeal ? `<button class="button primary" id="accept-suggestion">Add to week</button>` : `<span class="chat-managed-note">Ask in our chat to add this meal to the library.</span>`}</div></div><div class="amended-list">${items.map(item => `<div class="amended-item ${item.isNew ? "new" : ""}"><span class="grocery-tick">□</span><div><strong>${escapeHtml(item.name)}</strong>${item.amounts.length ? `<span>${escapeHtml(item.amounts.join(" + "))}</span>` : ""}<div class="item-badges">${ingredientBadges(item)}</div></div>${item.isNew ? `<b>NEW</b>` : `<small>Already listed</small>`}</div>`).join("")}</div>`;
  $("#copy-amended").addEventListener("click", () => copyAmendedList(meal));
  if (isLibraryMeal) $("#accept-suggestion").addEventListener("click", () => addToNextDay(meal.id));
}

function addToNextDay(mealId) {
  const day = DAYS.find(name => !state.week[name]);
  if (!day) return showToast("The week is already full");
  state.week[day] = mealId;
  save(); renderAll(); showToast(`Added to ${day}`);
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
