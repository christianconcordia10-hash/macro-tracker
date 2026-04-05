/*
  Macro Tracker (Vanilla JS)
  - Stores all data in localStorage
  - Tracks meals and food entries using exact gram amounts
  - Calculates meal + daily macro totals and goal feedback
*/

const STORAGE_KEY = "macroTrackerData";

// Default app state used when there is no saved localStorage data yet.
const defaultState = {
  goals: {
    calories: null,
    protein: 180,
    carbs: null,
    fat: null,
  },
  meals: [
    { id: crypto.randomUUID(), name: "Breakfast", foods: [] },
    { id: crypto.randomUUID(), name: "Lunch", foods: [] },
    { id: crypto.randomUUID(), name: "Dinner", foods: [] },
    { id: crypto.randomUUID(), name: "Snacks", foods: [] },
  ],
};

const goalsForm = document.getElementById("goals-form");
const mealsForm = document.getElementById("meal-form");
const mealsContainer = document.getElementById("meals-container");
const dailyTotalsContainer = document.getElementById("daily-totals");
const feedbackList = document.getElementById("feedback-list");

let state = loadState();

// Initial render
populateGoalInputs();
render();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(raw);

    // Merge with defaults in case new fields are introduced later.
    return {
      goals: {
        ...defaultState.goals,
        ...parsed.goals,
      },
      meals: Array.isArray(parsed.meals) && parsed.meals.length
        ? parsed.meals
        : structuredClone(defaultState.meals),
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function populateGoalInputs() {
  document.getElementById("goal-calories").value = state.goals.calories ?? "";
  document.getElementById("goal-protein").value = state.goals.protein ?? 180;
  document.getElementById("goal-carbs").value = state.goals.carbs ?? "";
  document.getElementById("goal-fat").value = state.goals.fat ?? "";
}

function render() {
  renderMeals();
  renderDailyOverview();
  saveState();
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function getMealTotals(meal) {
  return meal.foods.reduce(
    (totals, food) => {
      totals.calories += toNumber(food.calories);
      totals.protein += toNumber(food.protein);
      totals.carbs += toNumber(food.carbs);
      totals.fat += toNumber(food.fat);
      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function getDailyTotals() {
  return state.meals.reduce(
    (daily, meal) => {
      const mealTotals = getMealTotals(meal);
      daily.calories += mealTotals.calories;
      daily.protein += mealTotals.protein;
      daily.carbs += mealTotals.carbs;
      daily.fat += mealTotals.fat;
      return daily;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function renderMeals() {
  mealsContainer.innerHTML = "";

  const template = document.getElementById("meal-template");

  state.meals.forEach((meal) => {
    const fragment = template.content.cloneNode(true);
    const mealElement = fragment.querySelector(".meal");

    const titleElement = fragment.querySelector(".meal-title");
    titleElement.textContent = meal.name;

    const editMealBtn = fragment.querySelector(".meal-edit-btn");
    editMealBtn.addEventListener("click", () => {
      const nextName = prompt("Edit meal name", meal.name);
      if (!nextName || !nextName.trim()) return;
      meal.name = nextName.trim();
      render();
    });

    const deleteMealBtn = fragment.querySelector(".meal-delete-btn");
    deleteMealBtn.addEventListener("click", () => {
      const ok = confirm(`Delete meal \"${meal.name}\" and all its foods?`);
      if (!ok) return;
      state.meals = state.meals.filter((m) => m.id !== meal.id);
      render();
    });

    const foodForm = fragment.querySelector(".food-form");
    foodForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(foodForm);

      const newFood = {
        id: crypto.randomUUID(),
        name: String(formData.get("name") || "").trim(),
        grams: toNumber(formData.get("grams")),
        calories: toNumber(formData.get("calories")),
        protein: toNumber(formData.get("protein")),
        carbs: toNumber(formData.get("carbs")),
        fat: toNumber(formData.get("fat")),
      };

      if (!newFood.name || newFood.grams <= 0) return;

      meal.foods.push(newFood);
      foodForm.reset();
      render();
    });

    const foodList = fragment.querySelector(".food-list");

    meal.foods.forEach((food) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(food.name)}</td>
        <td>${round1(food.grams)} g</td>
        <td>${round1(food.calories)}</td>
        <td>${round1(food.protein)} g</td>
        <td>${round1(food.carbs)} g</td>
        <td>${round1(food.fat)} g</td>
        <td>
          <div class="inline-actions">
            <button class="btn ghost" data-action="edit">Edit</button>
            <button class="btn ghost danger" data-action="delete">Delete</button>
          </div>
        </td>
      `;

      row.querySelector('[data-action="edit"]').addEventListener("click", () => {
        editFood(meal.id, food.id);
      });

      row.querySelector('[data-action="delete"]').addEventListener("click", () => {
        deleteFood(meal.id, food.id);
      });

      foodList.appendChild(row);
    });

    const mealTotals = getMealTotals(meal);
    const mealTotalsElement = fragment.querySelector(".meal-totals");
    mealTotalsElement.textContent =
      `Meal total → Calories: ${round1(mealTotals.calories)} | ` +
      `Protein: ${round1(mealTotals.protein)}g | ` +
      `Carbs: ${round1(mealTotals.carbs)}g | ` +
      `Fat: ${round1(mealTotals.fat)}g`;

    mealsContainer.appendChild(mealElement);
  });
}

function editFood(mealId, foodId) {
  const meal = state.meals.find((m) => m.id === mealId);
  if (!meal) return;

  const food = meal.foods.find((f) => f.id === foodId);
  if (!food) return;

  // Basic prompt workflow keeps implementation beginner-friendly without frameworks.
  const nextName = prompt("Food name", food.name);
  if (!nextName || !nextName.trim()) return;

  const nextGrams = prompt("Weight (grams)", String(food.grams));
  const nextCalories = prompt("Calories", String(food.calories));
  const nextProtein = prompt("Protein (g)", String(food.protein));
  const nextCarbs = prompt("Carbs (g)", String(food.carbs));
  const nextFat = prompt("Fat (g)", String(food.fat));

  food.name = nextName.trim();
  food.grams = Math.max(0, toNumber(nextGrams));
  food.calories = Math.max(0, toNumber(nextCalories));
  food.protein = Math.max(0, toNumber(nextProtein));
  food.carbs = Math.max(0, toNumber(nextCarbs));
  food.fat = Math.max(0, toNumber(nextFat));

  render();
}

function deleteFood(mealId, foodId) {
  const meal = state.meals.find((m) => m.id === mealId);
  if (!meal) return;

  meal.foods = meal.foods.filter((food) => food.id !== foodId);
  render();
}

function getFeedbackLine(macroName, consumed, goal, unit = "g") {
  if (goal == null || goal <= 0) {
    return `No ${macroName} goal set yet.`;
  }

  const diff = round1(goal - consumed);

  if (diff > 0) {
    return `You are ${diff}${unit} short of your ${goal}${unit} ${macroName} goal.`;
  }

  if (diff < 0) {
    return `You exceeded your ${macroName} goal by ${Math.abs(diff)}${unit}.`;
  }

  return `You hit your ${macroName} goal exactly.`;
}

function renderDailyOverview() {
  const totals = getDailyTotals();

  const macros = [
    {
      key: "protein",
      label: "Protein",
      consumed: totals.protein,
      goal: state.goals.protein,
      unit: "g",
      highlight: true,
    },
    {
      key: "calories",
      label: "Calories",
      consumed: totals.calories,
      goal: state.goals.calories,
      unit: "",
    },
    {
      key: "carbs",
      label: "Carbs",
      consumed: totals.carbs,
      goal: state.goals.carbs,
      unit: "g",
    },
    {
      key: "fat",
      label: "Fat",
      consumed: totals.fat,
      goal: state.goals.fat,
      unit: "g",
    },
  ];

  dailyTotalsContainer.innerHTML = "";

  macros.forEach((macro) => {
    const card = document.createElement("article");
    card.className = `macro-card${macro.highlight ? " protein" : ""}`;

    const goalValue = macro.goal == null ? "No goal" : `${round1(macro.goal)}${macro.unit}`;
    const consumedLabel = `${round1(macro.consumed)}${macro.unit}`;

    const progress = macro.goal && macro.goal > 0
      ? Math.min(100, Math.round((macro.consumed / macro.goal) * 100))
      : 0;

    const remaining = macro.goal == null
      ? "Goal not set"
      : macro.consumed <= macro.goal
      ? `${round1(macro.goal - macro.consumed)}${macro.unit} remaining`
      : `${round1(macro.consumed - macro.goal)}${macro.unit} over`;

    card.innerHTML = `
      <div class="macro-header">
        <strong>${macro.label}</strong>
        <span>Goal: ${goalValue}</span>
      </div>
      <p>${consumedLabel} consumed</p>
      <div class="progress" role="progressbar" aria-label="${macro.label} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
        <div class="progress-bar" style="width:${progress}%"></div>
      </div>
      <p>${remaining}</p>
    `;

    dailyTotalsContainer.appendChild(card);
  });

  feedbackList.innerHTML = "";
  const lines = [
    getFeedbackLine("protein", totals.protein, state.goals.protein, "g"),
    getFeedbackLine("calorie", totals.calories, state.goals.calories, ""),
    getFeedbackLine("carb", totals.carbs, state.goals.carbs, "g"),
    getFeedbackLine("fat", totals.fat, state.goals.fat, "g"),
  ];

  lines.forEach((line) => {
    const item = document.createElement("p");
    item.className = "feedback-item";
    item.textContent = line;
    feedbackList.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

goalsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  // Empty fields are stored as null meaning "goal not set".
  const parseGoalValue = (raw) => {
    if (raw === "") return null;
    return Math.max(0, toNumber(raw));
  };

  state.goals = {
    calories: parseGoalValue(document.getElementById("goal-calories").value),
    protein: parseGoalValue(document.getElementById("goal-protein").value) ?? 180,
    carbs: parseGoalValue(document.getElementById("goal-carbs").value),
    fat: parseGoalValue(document.getElementById("goal-fat").value),
  };

  render();
});

mealsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const mealNameInput = document.getElementById("meal-name");
  const mealName = mealNameInput.value.trim();
  if (!mealName) return;

  state.meals.push({
    id: crypto.randomUUID(),
    name: mealName,
    foods: [],
  });

  mealNameInput.value = "";
  render();
});
