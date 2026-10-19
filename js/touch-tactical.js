/* Planet Earth Control Deck — touch-first tactical interaction layer */
(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const validStates = new Set(["normal", "warning", "critical"]);
  let toastTimer = 0;
  let currentTarget = null;

  function ensureToast() {
    let toast = $("#telemetry-toast");
    if (toast) return toast;
    toast = document.createElement("aside");
    toast.id = "telemetry-toast";
    toast.className = "telemetry-toast";
    toast.hidden = true;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = '<div class="telemetry-toast__message"><span class="telemetry-toast__tag">TELEMETRY EVENT</span><span id="telemetry-toast-message"></span></div><button class="telemetry-toast__action" id="telemetry-toast-action" type="button">[ ПЕРЕЙТИ ]</button>';
    document.body.appendChild(toast);
    $("#telemetry-toast-action", toast).addEventListener("click", () => {
      if (currentTarget) focusPanel(currentTarget);
      dismissToast();
    });
    return toast;
  }
  function dismissToast() {
    window.clearTimeout(toastTimer);
    const toast = $("#telemetry-toast");
    if (toast) toast.hidden = true;
    currentTarget = null;
  }
  function showToast(message, panelId, options = {}) {
    if (typeof message !== "string" || !message.trim() || typeof panelId !== "string") return;
    const panel = document.querySelector('[data-panel="' + CSS.escape(panelId) + '"]');
    if (!panel) { console.warn("[TacticalUI] Unknown panel:", panelId); return; }
    const toast = ensureToast();
    currentTarget = panelId;
    $("#telemetry-toast-message", toast).textContent = message.trim();
    const action = $("#telemetry-toast-action", toast);
    action.textContent = options.actionLabel || "[ ПЕРЕЙТИ ]";
    action.setAttribute("aria-label", "Перейти к блоку: " + panelId);
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    const duration = Number.isFinite(options.duration) ? Math.max(0, options.duration) : 12000;
    if (duration > 0) toastTimer = window.setTimeout(dismissToast, duration);
  }
  function setPanelStatus(panelId, status, options = {}) {
    if (!validStates.has(status)) throw new TypeError("Unsupported panel status: " + status);
    const panel = document.querySelector('[data-panel="' + CSS.escape(panelId) + '"]');
    if (!panel) return false;
    const previous = panel.dataset.status || "normal";
    panel.dataset.status = status;
    if (options.message && status !== "normal" && previous !== status) {
      showToast(options.message, panelId, options.toast || {});
    }
    return true;
  }
  function resetPanelStatus(panelId) { return setPanelStatus(panelId, "normal"); }
  function focusPanel(panelId) {
    const panel = document.querySelector('[data-panel="' + CSS.escape(panelId) + '"]');
    if (!panel) return;
    panel.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",block:"center",inline:"nearest"});
    const prior = panel.dataset.status || "normal";
    panel.dataset.statusBeforeScan = prior;
    panel.dataset.status = "scanning";
    window.setTimeout(() => {
      if (!panel.isConnected) return;
      panel.dataset.status = panel.dataset.statusBeforeScan || "normal";
      delete panel.dataset.statusBeforeScan;
    }, 1200);
    if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
    panel.focus({preventScroll:true});
  }
  const glossary = {
    kp:{title:"KP INDEX",simple:"Показывает, насколько возмущено магнитное поле Земли.",detail:"Планетарный Kp-индекс оценивает геомагнитную активность по шкале 0–9. Порог тревоги задаётся отдельно и не является прогнозом последствий."},
    magnitude:{title:"EARTHQUAKE MAGNITUDE",simple:"Оценка размера землетрясения, а не силы тряски в конкретном месте.",detail:"Магнитуда характеризует размер сейсмического события. Интенсивность сотрясений зависит также от расстояния, глубины и грунта."},
    aqi:{title:"AIR QUALITY INDEX",simple:"Условный показатель качества воздуха.",detail:"AQI зависит от системы расчёта и набора загрязнителей. Сравнивать разные стандарты без проверки методики нельзя."},
    tle:{title:"TWO-LINE ELEMENT SET",simple:"Набор параметров для расчёта орбиты спутника.",detail:"TLE — формат орбитальных элементов, используемый с моделью SGP4. Точность прогноза снижается со временем."},
    norad:{title:"NORAD CATALOG NUMBER",simple:"Идентификатор объекта в каталоге отслеживаемых объектов.",detail:"Каталожный номер идентифицирует объект, но сам по себе не подтверждает его исправность или текущий статус."},
    solarwind:{title:"SOLAR WIND",simple:"Поток заряженных частиц от Солнца.",detail:"Скорость солнечного ветра — один из параметров космической погоды. Воздействие зависит также от межпланетного магнитного поля."}
  };
  function openTerm(key) {
    const item = glossary[key];
    const pop = $("#term-popover"), title = $("#term-title"), copy = $("#term-copy");
    if (!item || !pop || !title || !copy) return;
    title.textContent = item.title;
    copy.textContent = document.body.classList.contains("expert-mode") ? item.detail : item.simple;
    pop.hidden = false;
    $("#term-close")?.focus({preventScroll:true});
  }
  function installTouchFeedback() {
    let active = null, timer = 0;
    document.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse") return;
      const target = event.target.closest("button,a,[role='button'],[data-help-term]");
      if (!target) return;
      active = target; target.classList.add("touch-pressed"); clearTimeout(timer);
    }, {passive:true});
    const release = () => {
      if (!active) return;
      const target = active; active = null;
      timer = setTimeout(() => target.classList.remove("touch-pressed"), 120);
    };
    document.addEventListener("pointerup", release, {passive:true});
    document.addEventListener("pointercancel", release, {passive:true});
  }
  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-help-term]");
    if (trigger) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openTerm(trigger.dataset.helpTerm);
      return;
    }
    if (event.target.closest("#term-close")) $("#term-popover").hidden = true;
  }, true);
  document.addEventListener("keydown", event => {
    const trigger = event.target.closest("[data-help-term]");
    if (!trigger || !["Enter"," "].includes(event.key)) return;
    event.preventDefault(); openTerm(trigger.dataset.helpTerm);
  });
  function updateKp(value) {
    const kp = Number(value);
    if (!Number.isFinite(kp) || kp < 0 || kp > 9) return;
    if (kp >= 5) setPanelStatus("spaceweather","critical",{message:"Геомагнитная активность повышена: Kp " + kp.toFixed(1) + ".",toast:{duration:15000}});
    else if (kp >= 4) setPanelStatus("spaceweather","warning");
    else resetPanelStatus("spaceweather");
  }
  function updateEarthquakeAlert(events, threshold = 5) {
    if (!Array.isArray(events)) return;
    const candidates = events.filter(e => Number.isFinite(Number(e?.magnitude)) && Number(e.magnitude) >= threshold).sort((a,b)=>Number(b.magnitude)-Number(a.magnitude));
    if (!candidates.length) { resetPanelStatus("earthdata"); return; }
    const strongest = candidates[0];
    setPanelStatus("earthdata","critical",{message:"Сейсмическое событие M" + Number(strongest.magnitude).toFixed(1) + ": " + String(strongest.place || "Место не указано") + ".",toast:{duration:15000}});
  }
  window.EarthTacticalUI = Object.freeze({showToast,dismissToast,setPanelStatus,resetPanelStatus,focusPanel,openTerm,updateKp,updateEarthquakeAlert});
  installTouchFeedback();
  ensureToast();
})();