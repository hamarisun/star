import "./style.css";

const app = document.querySelector("#app");

app.innerHTML = `
  <header class="topbar">
    <div class="title">
      <div>
        <h1>Board</h1>
        <p>menage your things with just a little space</p>
      </div>
    </div>

    <div class="top-actions">
      <button id="addWidgetBtn">+ sticky note</button>
      <button id="resetBtn">clear out</button>
    </div>
  </header>
  <main id="workspace" class="workspace">

  <section class="window welcome-window" data-widget="welcome">
    <div class="window-bar">
      <span class="window-title">Welcome</span>
      <button class="close-widget" aria-label="Close welcome">×</button>
    </div>

    <div class="window-content">
      <h2>This is board</h2>
      <p>
        this is a board. stick a note to it :)
      </p>
    </div>
  </section>
</main>

  <div id="widgetMenu" class="widget-menu hidden">
    <div class="widget-menu-card">
      <div class="menu-heading">
        <h2>Add something</h2>
        <button id="closeMenu">×</button>
      </div>

      <button class="widget-option" data-add="clock">Clock</button>
      <button class="widget-option" data-add="notes">Notes</button>
      <button class="widget-option" data-add="welcome">Welcome card</button>
      <button class="widget-option" data-add="apod">NASA APOD</button>
    </div>
  </div>
`;

const workspace = document.querySelector("#workspace");
const addWidgetBtn = document.querySelector("#addWidgetBtn");
const widgetMenu = document.querySelector("#widgetMenu");
const closeMenu = document.querySelector("#closeMenu");
const resetBtn = document.querySelector("#resetBtn");
const stickers = [];

let highestZIndex = 10;

function updateClock() {
  const now = new Date();

  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  const date = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  document.querySelectorAll(".clock-time").forEach((element) => {
    element.textContent = time;
  });
  document.querySelectorAll(".clock-date").forEach((element) => {
    element.textContent = date;
  });
}

function bringToFront(element) {
  highestZIndex += 1;
  element.style.zIndex = highestZIndex;
}

function makeDraggable(element) {
  const bar = element.querySelector(".window-bar");

  if (!bar) {
    return;
  }

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  bar.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) {
      return;
    }

    dragging = true;

    bringToFront(element);

    const rect = element.getBoundingClientRect();

    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;

    bar.setPointerCapture(event.pointerId);
  });

  bar.addEventListener("pointermove", (event) => {
    if (!dragging) {
      return;
    }

    const workspaceRect = workspace.getBoundingClientRect();
    let left = event.clientX - workspaceRect.left - offsetX;
    let top = event.clientY - workspaceRect.top - offsetY;
    const maxLeft = Math.max(0, workspace.clientWidth - element.offsetWidth);
    const maxTop = Math.max(0, workspace.clientHeight - element.offsetHeight);

    left = Math.max(0, Math.min(left, maxLeft));
    top = Math.max(0, Math.min(top, maxTop));

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  });

  bar.addEventListener("pointerup", (event) => {
    dragging = false;

    if (bar.hasPointerCapture(event.pointerId)) {
      bar.releasePointerCapture(event.pointerId);
    }

    saveLayout();
  });

  bar.addEventListener("pointercancel", () => {
    dragging = false;
  });
  element.addEventListener("pointerdown", () => {
    bringToFront(element);
  });
}

function saveLayout() {
  const layout = {};

  document.querySelectorAll(".window").forEach((element) => {
    const widget = element.dataset.widget;

    layout[widget] = {
      left: element.style.left || "",
      top: element.style.top || "",
      zIndex: element.style.zIndex || "",
      hidden: element.classList.contains("hidden")
    };
  });

  localStorage.setItem(
    "layout",
    JSON.stringify(layout)
  );
}

function loadLayout() {
  const saved = localStorage.getItem("layout");

  if (!saved) {
    return;
  }

  try {
    const layout = JSON.parse(saved);

    Object.entries(layout).forEach(
      ([widget, savedWindow]) => {

        let element = document.querySelector(
          `.window[data-widget="${widget}"]`
        );
        
        if (!element && !savedWindow.hidden) {
          createWidget(widget);

          element = document.querySelector(
            `.window[data-widget="${widget}"]:last-child`
          );
        }
        if (!element) {
          return;
        }
        if (savedWindow.left) {
          element.style.left =
            savedWindow.left;
        }
        if (savedWindow.top) {
          element.style.top =
            savedWindow.top;
        }
        if (savedWindow.zIndex) {
          element.style.zIndex =
            savedWindow.zIndex;
        }

        if (savedWindow.hidden) {
          element.classList.add("hidden");
        } else {
          element.classList.remove("hidden");
        }
      }
    );

  } catch (error) {
    console.error(
      "Could not restore layout:",
      error
    );

    localStorage.removeItem("layout");
  }
}

function setupCloseButtons() {
  document.querySelectorAll(".close-widget").forEach((button) => {
    button.onclick = () => {
      const element = button.closest(".window");

      if (!element) {
        return;
      }

      element.classList.add("hidden");
      saveLayout();
    };
  });
}

function setupNotes() {
  document.querySelectorAll(".notes").forEach((textarea) => {
    textarea.value = localStorage.getItem("tab-notes") || "";
    textarea.addEventListener("input", () => {
      localStorage.setItem("tab-notes", textarea.value);
    });
  });
}



async function setupApod(windowElement) {
  const status = windowElement.querySelector(".apod-status");
  const content = windowElement.querySelector(".apod-content");
  const image = windowElement.querySelector(".apod-image");
  const title = windowElement.querySelector(".apod-title");
  const date = windowElement.querySelector(".apod-date");
  const explanation = windowElement.querySelector(".apod-explanation");

  if (!status || !content) {
    return;
  }

  const apiKey = import.meta.env.VITE_NASA_API_KEY;

  if (!apiKey) {
    status.textContent = "NASA API key not found";
    return;
  }
  try {
    const response = await fetch(
  `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}`
);

    if (!response.ok) {
      throw new Error("Could not load NASA APOD.");
    }

    const data = await response.json();

    if (data.media_type === "image") {
      image.src = data.url;
      image.alt = data.title || "NASA Astronomy Picture of the Day";

      title.textContent =
        data.title || "Astronomy Picture of the Day";

      date.textContent = data.date || "";

      explanation.textContent =
        data.explanation || "";

      status.classList.add("hidden");
      content.classList.remove("hidden");

    } else if (data.media_type === "video") {

      content.innerHTML = `
        <iframe
          class="apod-video"
          src="${data.url}"
          title="${data.title || "NASA APOD"}"
          allowfullscreen
        ></iframe>

        <h3 class="apod-title">
          ${data.title || "NASA APOD"}
        </h3>

        <p class="apod-date">
          ${data.date || ""}
        </p>

        <p class="apod-explanation">
          ${data.explanation || ""}
        </p>
      `;

      status.classList.add("hidden");
      content.classList.remove("hidden");

    } else {
      status.textContent =
        "NASA APOD is unavailable.";
    }

  } catch (error) {
    status.textContent = error.message;
  }
}
function createWidget(type) {
  const templates = {
    clock: `
      <section class="window clock-window" data-widget="clock">
        <div class="window-bar">
          <span class="window-title">Clock</span>
          <button class="close-widget" aria-label="Close clock">×</button>
        </div>

        <div class="window-content">
          <div class="clock-time">00:00</div>
          <div class="clock-date">Loading date...</div>
        </div>
      </section>
    `,
    
    notes: `
      <section class="window notes-window" data-widget="notes">
        <div class="window-bar">
          <span class="window-title">Little Notes</span>
          <div class="window-tools">
          <button class="close-widget" aria-label="Close notes">x</button>
          </div>
        </div>

        <div class="window-content">
          <textarea
            class="notes"
            placeholder="Write something here..."
          ></textarea>
        </div>
      </section>
    `,

    welcome: `
      <section class="window welcome-window" data-widget="welcome">
        <div class="window-bar">
          <span class="window-title">Welcome</span>
          <button class="close-widget" aria-label="Close welcome">×</button>
        </div>

        <div class="window-content">
          <h2>What is this?</h2>
          <p>
            
          </p>
        </div>
      </section>
    `,

    apod: `
      <section class="window apod-window" data-widget="apod">
        <div class="window-bar">
          <span class="window-title">NASA APOD</span>
          <button class="close-widget" aria-label="Close NASA APOD">×</button>
        </div>

        <div class="window-content">
          <p class="apod-status">
            Loading...
          </p>

          <div class="apod-content hidden">
            <img
              class="apod-image"
              alt="NASA Astronomy Picture of the Day"
            />
            <h3 class="apod-title"></h3>
            <h3> nasa curently expiriences a problem with API what causes only the explenation to be diplaied accuratly:| </h3>

            <p class="apod-date"></p>

            <p class="apod-explanation"></p>
          </div>
        </div>
      </section>
    `
  };

  if (!templates[type]) {
    return;
  }

  workspace.insertAdjacentHTML(
    "beforeend",
    templates[type]
  );

  const newWidget =
    workspace.querySelector(
      `.window[data-widget="${type}"]:last-child`
    );

  if (!newWidget) {
    return;
  }

  newWidget.style.left =
    `${80 + Math.random() * 200}px`;

  newWidget.style.top =
    `${100 + Math.random() * 150}px`;

  bringToFront(newWidget);
  makeDraggable(newWidget);

  setupCloseButtons();
  setupNotes();

  if (type === "apod") {
    setupApod(newWidget);
  }
  saveLayout();
}

addWidgetBtn.addEventListener("click", () => {
  widgetMenu.classList.remove("hidden");
});

closeMenu.addEventListener("click", () => {
  widgetMenu.classList.add("hidden");
});

widgetMenu.addEventListener("click", (event) => {
  const button = event.target.closest(".widget-option");

  if (!button) {
    return;
  }

  const widgetType = button.dataset.add;
  const existing = document.querySelector(
    `.window[data-widget="${widgetType}"]`
  );

  if (existing) {
    existing.classList.remove("hidden");
    bringToFront(existing);
    widgetMenu.classList.add("hidden");
    saveLayout();
    return;
  }

  createWidget(widgetType);
  widgetMenu.classList.add("hidden");
});

widgetMenu.addEventListener("pointerdown", (event) => {
  if (event.target === widgetMenu) {
    widgetMenu.classList.add("hidden");
  }
});

resetBtn.addEventListener("click", () => {
  localStorage.removeItem("layout");
  localStorage.removeItem("notes");
  localStorage.removeItem("notes-list");

  location.reload();
});
document.querySelectorAll(".window").forEach((element) => {
  makeDraggable(element);
});


setupCloseButtons();
setupNotes();
setInterval(updateClock, 1000);
loadLayout();
updateClock();
