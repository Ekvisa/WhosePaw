const PATH = "http://localhost:5000";
const RECENT_COUNT = 5;

const heartButton = document.querySelector(".buttons .favorite");

let activeCardId = "";

const details = document.querySelector(".details");
const buttons = details.querySelector(".buttons");
// Кнопка закрытия и другие
details.querySelector(".close").onclick = () => {
  details.classList.add("hidden");
};
details.querySelector(".delete").addEventListener("click", () => {
  deleteCat();
});
details.querySelector(".edit").addEventListener("click", () => editCat());
details
  .querySelector(".favorite")
  .addEventListener("click", () => favoriteCat(activeCardId));
const detailsText = details.querySelector(".details_text");

// Получение полей объекта котика
async function loadCatFields(filterBy = null) {
  const response = await fetch(`${PATH}/fieldsCharacteristics`);
  if (!response.ok) throw new Error("Ошибка при загрузке полей");
  const fields = await response.json();
  if (!filterBy) return fields;
  return fields.filter((f) => f.showIn.includes(filterBy));
}

// --- Базовые функции для котов ---

async function getCats(params = {}) {
  const url = new URL(`${PATH}/cats`);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.append(key, value)
  );
  const response = await fetch(url);
  if (!response.ok) throw new Error("Ошибка при загрузке списка котиков");
  return await response.json();
}

// CREATE
async function createCat(catData) {
  console.log(catData);
  catData.created = new Date().toISOString();
  console.log(`addForm: ${addForm}`);

  const fileInput = addForm.querySelector("#photo");
  console.log(`fileInput: ${fileInput}`);
  const file = fileInput.files[0];
  if (file instanceof File && file.size > 0) {
    catData.photo = await fileToBase64(file);
  } else {
    catData.photo = "";
  }

  const response = await fetch(`${PATH}/cats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(catData),
  });
  const updatedList = document.getElementById(catData.status);
  const data = await response.json();
  console.log(catData);
  showRecent(catData.status).then(async () => {
    updatedList.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(
      response.ok
        ? `Котик ${catData.name} добавлен!`
        : "Ошибка при добавлении котика",
      response.ok ? "success" : "error"
    );
  });
  addForm.reset();

  return data;
}

// READ
async function getCatById(id) {
  const response = await fetch(`${PATH}/cats/${id}`);
  if (!response.ok) throw new Error("Ошибка при загрузке котика");
  return await response.json();
}

// UPDATE
async function updateCat(catData) {
  const fileInput = details.querySelector("#photo");
  console.log(`fileInput: ${fileInput}`);
  const file = fileInput.files[0];
  console.log(`catData.photo: ${catData.photo}`);
  if (file) {
    catData.photo = await fileToBase64(file);
    console.log(`catData: ${catData}`);
  } else {
    // catData.photo = "";
  }
  // console.log(`catData: ${catData}`);

  const response = await fetch(`${PATH}/cats/${activeCardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(catData),
  });

  details.classList.add("hidden");
  const data = await response.json();
  showRecent(catData.status).then(async () => {
    showToast(
      response.ok
        ? `Данные котика ${catData.name} обновлены!`
        : "Ошибка при обновлении котика",
      response.ok ? "success" : "error"
    );
  });

  return data;
}

// DELETE
async function deleteCat() {
  const catData = await getCatById(activeCardId);

  const isConfirmed = confirm(`Удалить данные о котике ${catData.name}?`);
  if (isConfirmed) {
    const response = await fetch(`${PATH}/cats/${activeCardId}`, {
      method: "DELETE",
    });
    const updatedList = document.getElementById(catData.status);

    showRecent(catData.status).then(async () => {
      updatedList.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast(
        response.ok
          ? `Данные котика ${catData.name} удалены!`
          : "Ошибка при удалении котика",
        response.ok ? "success" : "error"
      );
    });
    if (isFavorite(activeCardId)) {
      toggleFavorite(activeCardId);
    }
    details.classList.add("hidden");
  }
}

function showCatFields(container, data, fields, onSubmit) {
  console.log("showCatFields");
  container.innerHTML = "";
  fields.forEach((f) => {
    const fieldItem = createField(f, data, onSubmit ? true : false);
    container.appendChild(fieldItem);
  });
  if (onSubmit) {
    const buttonNames = {
      updateCat: "Обновить",
      filterCats: "Найти",
      createCat: "Добавить",
    };
    const submitBtn = document.createElement("button");
    const functionName = onSubmit.name;
    submitBtn.textContent = buttonNames[functionName];
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("click");
      const formData = new FormData(container);
      console.log(`formData: ${formData}`);

      const newData = Object.fromEntries(formData.entries()); // но файл не считывать, т.к. показывается пустой в форме
      const allData = { ...data, ...newData };
      allData.photo = data.photo; // возможно это костыль - разобрать (как НЕ читать пустое фото из fromEntries?)
      console.log(`allData: ${JSON.stringify(allData)}`);

      onSubmit(allData); //
      // container.reset();
    });
    container.appendChild(submitBtn);
  }
}

// Вывод метки элемента:
function createFieldLabel(field) {
  const label = document.createElement("label");
  label.textContent = field.translation;
  label.setAttribute("for", field.attrName);
  return label;
}

// Вывод значения элемента:
function createFieldElement(field, catData, isEditable) {
  let element;
  if (
    isEditable === false ||
    ((field.attrName === "id" || field.attrName === "created") && activeCardId)
  ) {
    // Поле в режиме просмотра:
    if (field.enterType === "file") {
      if (
        typeof catData[field.attrName] === "string" &&
        catData[field.attrName].trim() !== ""
      ) {
        element = document.createElement("img");
        element.src = catData[field.attrName];
      } else {
        element = document.createElement("hr");
      }
    } else {
      element = document.createElement("span");
      let fieldValue = catData[field.attrName]; // ex.: enAttrValue = catData[furcolor] = "black", but we need "чёрный"
      if (field.enterType === "select") {
        const fieldOptions = field.options;
        const option = fieldOptions.filter((o) => o.value === fieldValue);
        console.log(option[0].text);
        fieldValue = option[0].text;
      }
      element.textContent = fieldValue;
      // element.textContent = catData[field.attrName] || "—";
    }
  } else {
    // Поле в режиме редактирования / добавления:
    switch (field.enterType) {
      case "input":
        element = document.createElement("input");
        element.type = "text";
        element.id = field.attrName;
        element.name = field.attrName;
        element.value = catData[field.attrName] || "";
        break;

      case "date":
        element = document.createElement("input");
        element.type = "date";
        element.id = field.attrName;
        element.name = field.attrName;
        element.value = catData[field.attrName] || "";
        break;

      case "file":
        element = document.createElement("span");
        const elementInput = document.createElement("input");
        elementInput.type = "file";
        elementInput.id = field.attrName;
        elementInput.name = field.attrName;
        element.append(elementInput);

        const photoValue = catData[field.attrName];
        if (typeof photoValue === "string" && photoValue.trim() !== "") {
          const elementPhoto = document.createElement("img");
          elementPhoto.src = catData[field.attrName];
          element.append(elementPhoto);
        }
        console.log(element);
        break;

      case "textarea":
        element = document.createElement("textarea");
        element.id = field.attrName;
        element.name = field.attrName;
        element.value = catData[field.attrName] || "";
        break;

      case "select":
        element = document.createElement("select");
        element.id = field.attrName;
        element.name = field.attrName;
        if (field.options && Array.isArray(field.options)) {
          field.options.forEach((opt) => {
            const option = document.createElement("option");
            option.value = opt.value;
            option.textContent = opt.text;
            if (opt.value === catData[field.attrName]) option.selected = true;
            element.appendChild(option);
          });
        }
        break;

      case "radio":
        element = document.createElement("span");
        if (field.options && Array.isArray(field.options)) {
          field.options.forEach((opt) => {
            const label = document.createElement("label");
            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = field.attrName;
            radio.value = opt.value;
            if (opt.value === catData[field.attrName]) radio.checked = true;
            label.append(radio, document.createTextNode(opt.text));
            element.appendChild(label);
          });
        } else {
          element.textContent = "(нет вариантов)";
        }
        break;

      default:
        element = document.createElement("span");
        element.textContent = catData[field.attrName] || "—";
    }
  }
  return element;
}

function createField(field, catData, isEditable) {
  console.log("createField");
  const wrapper = document.createElement("p");
  const label = createFieldLabel(field);
  wrapper.appendChild(label);
  const element = createFieldElement(field, catData, isEditable);
  wrapper.appendChild(element);
  return wrapper;
}

async function showRecent(listId) {
  console.log(`will be shown recent in: ${listId}`);
  const recentlyAdded = await getCats({
    status: listId,
    _sort: "-date",
    // _order: "desc",
    _limit: RECENT_COUNT,
  });
  showData(recentlyAdded, listId);
}

async function showData(data, listId) {
  const container = document.getElementById(listId);
  console.log(`will be shown in container: ${container.id}`);
  container.innerHTML = "";
  const fields = await loadCatFields("preview");
  console.log(`fields: ${JSON.stringify(fields)}`);
  data.forEach((e) => {
    const li = document.createElement("li");
    li.dataset.id = e.id;
    console.log(li.dataset.id);
    showCatFields(li, e, fields, "");
    li.addEventListener("click", () => showDetails(e.id));
    container.append(li);
  });
}

async function editCat() {
  console.log("editCat");
  const id = activeCardId;

  const catObj = await getCatById(id);
  console.log(`we will edit this cat: ${JSON.stringify(catObj)}`);

  loadCatFields().then((fields) => {
    showCatFields(detailsText, catObj, fields, updateCat);

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Отмена";
    cancelBtn.type = "button";
    cancelBtn.addEventListener("click", () => {
      showDetails(id);
    });
    detailsText.append(cancelBtn);
    buttons.style.display = "none";
  });
}

async function favoriteCat(id) {
  const activeCat = await getCatById(id);
  toggleFavorite(id);
  const state = isFavorite(id);
  toggleHeart(state);
  showToast(
    state
      ? `Котик ${activeCat.name} добавлен в избранное!`
      : `Котик ${activeCat.name} удалён из избранного!`
  );
  showFavoriteCats();
}

function toggleHeart(state) {
  if (state === true) {
    heartButton.classList.add("active");
    heartButton.setAttribute("title", "Удалить из избранного");
  } else {
    heartButton.classList.remove("active");
    heartButton.setAttribute("title", "Добавить в избранное");
  }
}

// Показывает аватарку и глаза из символов при заполнении формы, наверно это не нужно, но очень уж мило:
function showPreview(select, preview) {
  select.addEventListener("change", () => {
    preview.style.backgroundColor = select.value;
    if (select.value === "black") {
      preview.style.color = "white";
    }
  });
}

// Показываем подробности о котике:
async function showDetails(catId) {
  console.log("showDetails");
  activeCardId = catId;

  //Получим массив из одного кота:
  const catData = await getCatById(catId);
  console.log(`catData ${catData}`);

  detailsText.innerHTML = "";
  details.classList.remove("hidden");

  loadCatFields().then((fields) => {
    showCatFields(detailsText, catData, fields, "");
  });
  buttons.style.display = "flex";

  toggleHeart(isFavorite(activeCardId));
}

async function filterCats(filters) {
  console.log(`filters: ${filters}`);
  console.log(filters);
  const cats = await getCats();
  console.log(`cats: ${JSON.stringify(cats)}`);

  // Фильтрация
  let filtered = cats.filter((cat) => {
    if (filters.furcolor && cat.furcolor !== filters.furcolor) return false;
    if (filters.eyeColor && cat.eyeColor !== filters.eyeColor) return false;
    if (filters.status && cat.status !== filters.status) return false;
    if (filters.district && cat.district !== filters.district) return false;

    if (
      filters.name &&
      !cat.name.toLowerCase().includes(filters.name.toLowerCase())
    )
      return false;
    // if (filters.dateFrom && new Date(cat.date) < new Date(filters.dateFrom))
    //   return false;
    // if (filters.dateTo && new Date(cat.date) > new Date(filters.dateTo))
    //   return false;
    return true;
  });

  // Сортировка
  switch (filters.sort) {
    case "date_desc":
      filtered.sort((a, b) => new Date(b.created) - new Date(a.created));
      break;
    case "date_asc":
      filtered.sort((a, b) => new Date(a.created) - new Date(b.created));
      break;
    case "age_asc":
      filtered.sort((a, b) => a.age - b.age);
      break;
    case "age_desc":
      filtered.sort((a, b) => b.age - a.age);
      break;
  }

  // Показываем отфильтрованных котиков
  // showData(filtered, "filtered");

  showData(filtered, "filtered").then(async () => {
    document
      .getElementById("filtered")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

//// Точка входа ////
const addForm = document.getElementById("add");
const filterForm = document.getElementById("filterForm");
loadCatFields("add").then((fields) => {
  showCatFields(addForm, "", fields, createCat);
});
loadCatFields("filter").then((fields) => {
  showCatFields(filterForm, "", fields, filterCats);
});
showRecent("lost");
showRecent("found");
showFavoriteCats();

// showToast("Данные котика обновлены! 🐾");

function showToast(message, type = "success") {
  toast = document.getElementById("toast");
  toast.classList.add(type);
  toast.textContent = message;

  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file); // <<< делает base64
  });
}

// Favorites //

async function showFavoriteCats() {
  const favIds = getFavorites();
  const allCats = await getCats();
  console.log("allCats:", allCats);
  const favCats = allCats.filter((cat) => favIds.includes(cat.id));
  console.log("favCats:", favCats);
  showData(favCats, "favorites");
}

function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites") || "[]");
}

function saveFavorites(favs) {
  localStorage.setItem("favorites", JSON.stringify(favs));
}

function addToFavorites(catId) {
  const favs = getFavorites();
  favs.push(catId);
  saveFavorites(favs);
}

function deleteFromFavorites(catId) {
  const favs = getFavorites().filter((id) => id !== catId);
  saveFavorites(favs);
}

function toggleFavorite(id) {
  if (isFavorite(id)) {
    deleteFromFavorites(id);
  } else {
    addToFavorites(id);
  }
}

function isFavorite(catId) {
  console.log(`getFavorites(): ${getFavorites()}`);
  return getFavorites().includes(catId);
}
