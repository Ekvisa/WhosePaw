const PATH = "http://localhost:3000";
const RECENT_COUNT = 5;

let activeCardId = "";

const details = document.querySelector(".details");
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
async function loadCatFields(filters = {}) {
  const url = new URL(`${PATH}/fieldsCharacteristcs`);
  Object.entries(filters).forEach(([key, value]) =>
    url.searchParams.append(key, value)
  );
  const response = await fetch(url);
  if (!response.ok) throw new Error("Ошибка при загрузке полей");
  return await response.json();
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
  console.log(`createCat ${catData}`);
  const response = await fetch(`${PATH}/cats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(catData),
  });
  alert(
    response.ok
      ? `Котик ${catData.name} добавлен! 🐾`
      : "Ошибка при добавлении котика"
  );
  return await response.json();
}

// READ
async function getCatById(id) {
  const response = await fetch(`${PATH}/cats/${id}`);
  if (!response.ok) throw new Error("Ошибка при загрузке котика");
  return await response.json();
}

// UPDATE
async function updateCat(catData) {
  // console.log(`updateCat ${catData.id}`);
  console.log("Тип catData:", typeof catData);
  console.log("Ключи catData:", Object.keys(catData));
  const response = await fetch(`${PATH}/cats/${catData.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(catData),
  });

  alert(
    response.ok
      ? `Данные котика ${catData.name} обновлены! 🐾`
      : "Ошибка при обновлении котика"
  );
  return await response.json();
}

// DELETE
async function deleteCatById() {
  const response = await fetch(`${PATH}/cats/${activeCardId}`, {
    method: "DELETE",
  });
  if (response.ok) {
    alert("Данные удалены");
  } else {
    throw new Error("Ошибка при удалении котика");
  }
  return true;
}

function generateAddingForm(formEl, fieldsData, catData, isEditable) {
  formEl.innerHTML = "";
  fieldsData.forEach((f) => {
    const fieldEl = createField(f, catData, isEditable);
    formEl.appendChild(fieldEl);
  });
  if (isEditable) {
    const submitBtn = document.createElement("button");
    submitBtn.setAttribute("type", "submit");
    if (catData) {
      submitBtn.textContent = "Сохранить";
    } else {
      submitBtn.textContent = "Добавить";
    }
    formEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(formEl);
      const newCatData = Object.fromEntries(formData.entries());
      const allCatData = { ...catData, ...newCatData };
      if (catData) {
        details.classList.add("hidden");
        await updateCat(allCatData);
      } else {
        await createCat(allCatData);
        formEl.reset();
      }
      getRecent(allCatData.status);
    });
    formEl.appendChild(submitBtn);
  }
}

function createFieldLabel(field) {
  const label = document.createElement("label");
  label.textContent = field.translation;
  label.setAttribute("for", field.attrName);
  return label;
}
function createFieldElement(field, catData, isEditable) {
  let element;
  if (isEditable === false) {
    // Просмотр (детали) — просто текст
    element = document.createElement("span");
    element.textContent = catData[field.attrName] || "—";
  } else {
    // Режим редактирования / добавления
    switch (field.enterType) {
      case "input":
        element = document.createElement("input");
        element.type = "text";
        element.id = field.attrName;
        element.name = field.attrName;
        element.value = catData[field.attrName] || "—";
        break;

      case "textarea":
        element = document.createElement("textarea");
        element.id = field.attrName;
        element.name = field.attrName;
        element.value = catData[field.attrName] || "—";
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
            // if (opt === opt.value) option.selected = true;
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
            if (opt === opt.value) radio.checked = true;
            label.append(radio, document.createTextNode(opt.text));
            element.appendChild(label);
          });
        } else {
          element.textContent = "(нет вариантов)";
        }
        break;

      case "file":
        element = document.createElement("input");
        element.type = "file";
        element.id = field.attrName;
        element.name = field.attrName;
        break;

      default:
        element = document.createElement("span");
        element.textContent = value || "—";
    }
  }
  return element;
}

function createField(field, catData, isEditable) {
  const wrapper = document.createElement("p");
  const label = createFieldLabel(field);
  wrapper.appendChild(label);
  const element = createFieldElement(field, catData, isEditable);
  wrapper.appendChild(element);
  return wrapper;
}

async function getRecent(listId) {
  console.log(`will be shown recent in: ${listId}`);
  const recentlyAdded = await getCats({
    status: listId,
    _limit: RECENT_COUNT,
    _sort: "-date",
  });
  showData(recentlyAdded, listId);
}

function showData(data, listId) {
  const container = document.getElementById(listId);
  console.log(`will be shown in container: ${container}`);
  container.innerHTML = "";
  data.forEach((e) => {
    const li = document.createElement("li");
    li.dataset.id = e.id;
    console.log(li.dataset.id);
    loadCatFields({ showInPrevew: "true" }).then((fields) => {
      generateAddingForm(li, fields, e, false);
    });

    li.addEventListener("click", () => showDetails(e.id));

    container.append(li);
  });
}

async function deleteCat() {
  const id = activeCardId;
  const catObj = await getCatById(id);
  console.log(`we will delete this cat: ${catObj}`);
  console.log("Вот кот:", catObj);
  const listCategory = catObj.status;
  const isConfirmed = confirm(`Удалить данные о котике ${catObj.name}?`);
  if (isConfirmed) {
    deleteCatById();
    details.classList.add("hidden");
    getRecent(listCategory);
  }
}

async function editCat() {
  const id = activeCardId;

  const catObj = await getCatById(id);
  console.log(`we will edit this cat: ${catObj}`);

  loadCatFields().then((fields) => {
    generateAddingForm(detailsText, fields, catObj, true);
  });
}

function favoriteCat(id) {
  console.log(`favorite ${id}`);
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
  activeCardId = catId;

  //Получим массив из одного кота:
  const catData = await getCatById(catId);
  console.log(`catData ${catData}`);

  // const response = await fetch(`${PATH}/cats/?id=${catId}`);
  // const [cat] = await response.json(); // достаём первый объект из массива

  detailsText.innerHTML = "";
  details.classList.remove("hidden");

  loadCatFields().then((fields) => {
    generateAddingForm(detailsText, fields, catData, false);
  });
}

// Точка входа
const addForm = document.getElementById("add");
loadCatFields().then((fields) => {
  generateAddingForm(addForm, fields, "", true);
});

getRecent("lost");

getRecent("found");
