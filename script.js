const PATH = "http://localhost:3000";
const RECENT_COUNT = 5;

// Универсальное получение данных
async function fetchData(endpoint, params = {}) {
  const url = new URL(`${PATH}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.append(key, value)
  );
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Ошибка при загрузке ${endpoint}`);
  return await response.json();
}

// Не объединяю loadCatFields() и getCats() из-за разной логики данных и для читаемости. А надо?
// Получение полей объекта котика
async function loadCatFields(filters = {}) {
  return fetchData("fieldsCharacteristcs", { ...filters });
}
// Получение объектов котиков
async function getCats(filters = {}) {
  return fetchData("cats", { _sort: "-date", ...filters });
}

// // Импорт джейсона с данными о полях объекта-котика:
// async function loadCatFields() {
//   const response = await fetch(`${PATH}/fieldsCharacteristcs`);
//   const catFields = await response.json();
//   console.log(catFields);
//   return catFields;
// }

// const allFields = loadCatFields();

function generateAddingForm(form, fields, cat, isEditable) {
  fields.forEach((f) => {
    const fieldEl = createField(f, cat, isEditable);
    form.appendChild(fieldEl);
  });
  if (isEditable) {
    const submitBtn = document.createElement("button");
    if (cat != {}) {
      submitBtn.textContent = "Добавить";
    } else {
      submitBtn.textContent = "Сохранить";
    }
    submitBtn.setAttribute("type", "submit");
    form.appendChild(submitBtn);
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); // не перезагружаем страницу
      addCat(form);
    });
  }
}

async function addCat(form) {
  const formData = new FormData(form);
  const cat = Object.fromEntries(formData.entries());
  cat.date = new Date().toISOString();
  console.log(JSON.stringify(cat));

  // Постим данные
  try {
    const response = await fetch(`${PATH}/cats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cat),
    });

    if (!response.ok)
      throw new Error("Не удалось добавить котика (ошибка сервера)");

    const data = await response.json();

    alert(`Котик ${data.name} добавлен! 🐾`);
    form.reset(); // очищаем форму
  } catch (err) {
    console.error(err);
    alert("Не удалось добавить котика (ошибка сети)");
  }

  const updatedList = document.getElementById(cat.status);
  showRecent(updatedList);
}

function createFieldLabel(field) {
  const label = document.createElement("label");
  label.textContent = field.translation;
  label.setAttribute("for", field.attrName);
  return label;
}
function createFieldElement(field, cat, isEditable) {
  let element;
  if (isEditable === false) {
    // Просмотр (детали) — просто текст
    element = document.createElement("span");
    element.textContent = cat[field.attrName] || "—";
  } else {
    // Режим редактирования / добавления
    switch (field.enterType) {
      case "input":
        element = document.createElement("input");
        element.type = "text";
        element.id = field.attrName;
        element.name = field.attrName;
        element.value = cat[field.attrName] || "—";
        break;

      case "textarea":
        element = document.createElement("textarea");
        element.id = field.attrName;
        element.name = field.attrName;
        element.value = cat[field.attrName] || "—";
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
            if (opt === opt.value) option.selected = true;
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

function createField(field, cat, isEditable) {
  const wrapper = document.createElement("p");
  const label = createFieldLabel(field);
  wrapper.appendChild(label);
  const element = createFieldElement(field, cat, isEditable);
  wrapper.appendChild(element);
  return wrapper;
}

// Получение котов по фильтрам:
// async function getCats(filters = {}) {
//   const params = new URLSearchParams({
//     _sort: "-date",
//     ...filters,
//   });
//   console.log(`sending ${PATH}/cats?${params.toString()}`);
//   const response = await fetch(`${PATH}/cats?${params.toString()}`);
//   const data = await response.json();
//   return data;
// }

async function showRecent(targetList) {
  const recentlyAdded = await getCats({
    status: targetList.id,
    _limit: RECENT_COUNT,
  });
  showData(recentlyAdded, targetList);
}

function showData(data, container) {
  container.innerHTML = "";
  data.forEach((e) => {
    const li = document.createElement("li");
    li.dataset.id = e.id;
    console.log(li.dataset.id);
    // li.innerHTML = fillCard(li, e);
    loadCatFields({ showInPrevew: "true" }).then((fields) => {
      generateAddingForm(li, fields, e, false);
    });

    li.addEventListener("click", () => showDetails(e.id));

    container.append(li);
  });
}

async function deleteCat(el) {
  const isConfirmed = confirm("Удалить данные о котике?");

  if (isConfirmed) {
    const listCategory = el.closest("ul").id;
    if (listCategory === "lost" || listCategory === "found") {
      const result = await fetch(`${PATH}/cats/${el.dataset.id}`, {
        method: "DELETE",
      });
      alert("Данные удалены");
      if (result.ok) {
      } else {
        console.error("Ошибка при удалении кота");
      }
      const recent = await getCats({ status: listCategory, _limit: 5 });
      const list = document.getElementById(listCategory);
      showData(recent, list);
    }
  }
}

function editCat(id) {
  console.log(`edit ${id}`);
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
  const response = await fetch(`${PATH}/cats/?id=${catId}`);
  const [cat] = await response.json(); // достаём первый объект из массива

  const details = document.querySelector(".details");
  const detailsText = details.querySelector(".details_text");
  detailsText.innerHTML = "";
  details.classList.remove("hidden");

  loadCatFields().then((fields) => {
    generateAddingForm(detailsText, fields, cat, false);
  });

  // Кнопка закрытия и другие

  details.querySelector(".close").onclick = () => {
    details.classList.add("hidden");
  };
  details
    .querySelector(".delete")
    .addEventListener("click", () => deleteCat(cat));
  details
    .querySelector(".edit")
    .addEventListener("click", () => editCat(cat.id));
  details
    .querySelector(".favorite")
    .addEventListener("click", () => favoriteCat(cat.id));
}

// Точка входа
const addForm = document.getElementById("add");
loadCatFields().then((fields) => {
  generateAddingForm(addForm, fields, {}, true);
});

const lostList = document.getElementById("lost");
showRecent(lostList);
const foundList = document.getElementById("found");
showRecent(foundList);
// init();
