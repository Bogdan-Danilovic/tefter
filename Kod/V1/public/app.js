// Alpine komponente. Registruju se na 'alpine:init' (app.js se učitava pre Alpine-a).

document.addEventListener("alpine:init", () => {
  // Modal za unos/izmenu termina.
  window.Alpine.data("apptModal", (m) => ({
    mode: m.mode,
    actionUrl: m.actionUrl,
    apptId: m.apptId,
    date: m.date,
    start: m.startHm,
    durationMin: m.durationMin,

    services: m.services,
    serviceId: m.values.serviceId,
    serviceQuery: "",
    serviceOpen: false,

    price: m.values.priceDinars,
    priceTouched: Boolean(m.values.priceDinars),

    staffId: m.values.staffId,
    note: m.values.note,

    clientMode: m.clientMode, // 'search' | 'selected' | 'new'
    clientId: m.selectedClient ? m.selectedClient.id : "",
    clientName:
      m.clientMode === "new"
        ? m.newClient.name
        : m.selectedClient
          ? m.selectedClient.name
          : "",
    clientPhone: m.selectedClient ? m.selectedClient.phone : "",
    newPhone: m.newClient ? m.newClient.phone : "",
    query: m.clientMode === "new" ? m.newClient.name : "",

    init() {
      const s = this.services.find((x) => x.id === this.serviceId);
      if (s) this.serviceQuery = s.name;
    },

    // --- usluga ---
    get filteredServices() {
      const q = this.serviceQuery.trim().toLowerCase();
      if (!q) return this.services;
      return this.services.filter((s) => s.name.toLowerCase().includes(q));
    },
    pickService(s) {
      this.serviceId = s.id;
      this.serviceQuery = s.name;
      this.durationMin = s.durationMin;
      if (!this.priceTouched) this.price = String(s.priceDinars);
      this.serviceOpen = false;
    },
    get endHm() {
      const [h, mm] = this.start.split(":").map(Number);
      if (Number.isNaN(h)) return "";
      const total = h * 60 + mm + Number(this.durationMin || 0);
      const eh = Math.floor((total % 1440) / 60);
      const em = total % 60;
      return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
    },

    // --- klijent ---
    selectExisting(id, name, phone) {
      this.clientMode = "selected";
      this.clientId = id;
      this.clientName = name;
      this.clientPhone = phone;
      this.query = "";
    },
    startNew() {
      this.clientMode = "new";
      this.clientName = this.query;
      this.clientId = "";
    },
    clearClient() {
      this.clientMode = "search";
      this.clientId = "";
      this.clientName = "";
      this.clientPhone = "";
      this.newPhone = "";
      this.query = "";
    },

    close() {
      const el = document.getElementById("modal");
      if (el) el.innerHTML = "";
    },
  }));

  // Skrol kontejner dnevnog prikaza — auto-scroll na "sada" + swipe levo/desno menja dan.
  window.Alpine.data("dayScroll", (opts) => ({
    touchX: 0,
    touchY: 0,
    init() {
      if (opts.showNow) {
        this.$nextTick(() => {
          const target = Math.max(opts.nowTopPx - this.$el.clientHeight / 2, 0);
          this.$el.scrollTo({ top: target, behavior: "instant" });
        });
      }

      // Swipe: horizontalna namera (|dx| > 60px i bar 2x veća od |dy|).
      this.$el.addEventListener(
        "touchstart",
        (e) => {
          this.touchX = e.touches[0].clientX;
          this.touchY = e.touches[0].clientY;
        },
        { passive: true },
      );
      this.$el.addEventListener(
        "touchend",
        (e) => {
          const dx = e.changedTouches[0].clientX - this.touchX;
          const dy = e.changedTouches[0].clientY - this.touchY;
          if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return;
          const url = dx < 0 ? opts.next : opts.prev;
          window.htmx
            .ajax("GET", url, { target: "#day-view", swap: "innerHTML" })
            .then(() => history.pushState({}, "", url));
        },
        { passive: true },
      );
    },
  }));
});

// --- Toast (koristi ga i bottom nav za "uskoro") -----------------------------
window.tefterToast = (msg) => {
  const flash = document.getElementById("flash");
  if (!flash) return;
  const node = document.createElement("div");
  node.className =
    "pointer-events-auto rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-modal";
  node.textContent = msg;
  flash.replaceChildren(node);
  setTimeout(() => node.remove(), 2200);
};

// --- PWA: service worker + install prompt ------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Android/desktop: ponudi instalaciju jednom po sesiji, nenametljivo.
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
  if (sessionStorage.getItem("tefter-install-hint")) return;
  sessionStorage.setItem("tefter-install-hint", "1");

  const flash = document.getElementById("flash");
  if (!flash) return;
  const node = document.createElement("div");
  node.className =
    "pointer-events-auto flex items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-modal";
  const label = document.createElement("span");
  label.textContent = "Dodaj Tefter na početni ekran";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "rounded-md bg-white/15 px-2.5 py-1 font-medium";
  btn.textContent = "Instaliraj";
  btn.onclick = () => {
    node.remove();
    if (deferredInstall) deferredInstall.prompt();
    deferredInstall = null;
  };
  node.append(label, btn);
  flash.replaceChildren(node);
  setTimeout(() => node.remove(), 10000);
});

// Ukloni flash poruku posle nekog vremena.
document.addEventListener("htmx:afterSwap", (e) => {
  if (e.target && e.target.id === "flash") {
    const node = e.target.firstElementChild;
    if (node) setTimeout(() => node.remove(), 6000);
  }
});
