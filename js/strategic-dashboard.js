(()=>{"use strict";
const $=id=>document.getElementById(id);
const groups={
 earth:{title:{en:"GEOPHYSICS / EARTH",ru:"ГЕОФИЗИКА / ЗЕМЛЯ",uk:"ГЕОФІЗИКА / ЗЕМЛЯ",de:"GEOPHYSIK / ERDE"},mods:[["earth","USGS / Earth status"],["earthdata","NASA EONET / natural events"],["anomalies","Volcanoes / anomalies"]]},
 weather:{title:{en:"WEATHER / ECOLOGY",ru:"ПОГОДА / ЭКОЛОГИЯ",uk:"ПОГОДА / ЕКОЛОГІЯ",de:"WETTER / ÖKOLOGIE"},mods:[["weather","Open-Meteo / weather"],["airquality","Air quality / PM2.5"],["niche-telemetry","Sensor.Community / IoT"]]},
 space:{title:{en:"SPACE / ISS ORBIT",ru:"КОСМОС / ОРБИТА МКС",uk:"КОСМОС / ОРБІТА МКС",de:"WELTRAUM / ISS-ORBIT"},mods:[["orbit","ISS live telemetry"],["spaceweather","NOAA / Kp index"],["satellites","CelesTrak / orbital catalog"],["deep-telemetry","NASA DSN / orbit decay"]]},
 transport:{title:{en:"PUBLIC TRANSPORT / 100 KM",ru:"ОБЩЕСТВЕННЫЙ ТРАНСПОРТ / 100 КМ",uk:"ГРОМАДСЬКИЙ ТРАНСПОРТ / 100 КМ",de:"ÖPNV / 100 KM"},mods:[["transport","Regional transit / GTFS-RT"]]},
 infrastructure:{title:{en:"GLOBAL TERMINAL / INFRASTRUCTURE",ru:"ГЛОБАЛЬНЫЙ ТЕРМИНАЛ / ИНФРАСТРУКТУРА",uk:"ГЛОБАЛЬНИЙ ТЕРМІНАЛ / ІНФРАСТРУКТУРА",de:"GLOBALTERMINAL / INFRASTRUKTUR"},mods:[["global-streams","Lightning / energy / network feeds"],["niche-telemetry","GitHub / Sensor / OGN"],["deep-telemetry","ARGO / subsea / carbon"],["radar","DNS / Cloudflare / network radar"]]}
};
const translations={
en:{strategicEarth:"GEOPHYSICS / EARTH",strategicWeather:"WEATHER / ECOLOGY",strategicSpace:"SPACE / ISS ORBIT",strategicTransport:"PUBLIC TRANSPORT / 100 KM",strategicInfrastructure:"GLOBAL TERMINAL / INFRASTRUCTURE",earthSummary:"USGS · M2.5+ earthquakes / 24 h",weatherSummary:"Pforzheim · Open-Meteo",spaceSummary:"ISS · orbit and space weather",transportSummary:"Baden-Württemberg · 100 km radius",transportNeedsFeed:"GTFS-RT · regional feed required",infraValue:"NETWORKS · ENERGY · OCEAN",infraSummary:"Root DNS · Cloudflare · ENTSO-E · cables",infraTap:"Tap to open extended telemetry",loading:"Loading public data…",close:"CLOSE ✕",noFeed:"LIVE REGIONAL FEED NOT CONFIGURED",module:"OPEN MODULE ↗"},
ru:{strategicEarth:"ГЕОФИЗИКА / ЗЕМЛЯ",strategicWeather:"ПОГОДА / ЭКОЛОГИЯ",strategicSpace:"КОСМОС / ОРБИТА МКС",strategicTransport:"ОБЩЕСТВЕННЫЙ ТРАНСПОРТ / 100 КМ",strategicInfrastructure:"ГЛОБАЛЬНЫЙ ТЕРМИНАЛ / ИНФРАСТРУКТУРА",earthSummary:"USGS · землетрясения M2.5+ за 24 ч",weatherSummary:"Пфорцхайм · Open-Meteo",spaceSummary:"МКС · орбита и космическая погода",transportSummary:"Баден-Вюртемберг · радиус 100 км",transportNeedsFeed:"GTFS-RT · требуется региональный фид",infraValue:"СЕТИ · ЭНЕРГИЯ · ОКЕАН",infraSummary:"Root DNS · Cloudflare · ENTSO-E · кабели",infraTap:"Тап — открыть расширенную телеметрию",loading:"Загрузка открытых данных…",close:"ЗАКРЫТЬ ✕",noFeed:"РЕГИОНАЛЬНЫЙ ФИД НЕ ПОДКЛЮЧЁН",module:"ОТКРЫТЬ МОДУЛЬ ↗"},
uk:{strategicEarth:"ГЕОФІЗИКА / ЗЕМЛЯ",strategicWeather:"ПОГОДА / ЕКОЛОГІЯ",strategicSpace:"КОСМОС / ОРБІТА МКС",strategicTransport:"ГРОМАДСЬКИЙ ТРАНСПОРТ / 100 КМ",strategicInfrastructure:"ГЛОБАЛЬНИЙ ТЕРМІНАЛ / ІНФРАСТРУКТУРА",earthSummary:"USGS · землетруси M2.5+ за 24 год",weatherSummary:"Пфорцгайм · Open-Meteo",spaceSummary:"МКС · орбіта та космічна погода",transportSummary:"Баден-Вюртемберг · радіус 100 км",transportNeedsFeed:"GTFS-RT · потрібен регіональний фід",infraValue:"МЕРЕЖІ · ЕНЕРГІЯ · ОКЕАН",infraSummary:"Root DNS · Cloudflare · ENTSO-E · кабелі",infraTap:"Натисніть, щоб відкрити телеметрію",loading:"Завантаження відкритих даних…",close:"ЗАКРИТИ ✕",noFeed:"РЕГІОНАЛЬНИЙ ФІД НЕ ПІДКЛЮЧЕНО",module:"ВІДКРИТИ МОДУЛЬ ↗"},
de:{strategicEarth:"GEOPHYSIK / ERDE",strategicWeather:"WETTER / ÖKOLOGIE",strategicSpace:"WELTRAUM / ISS-ORBIT",strategicTransport:"ÖFFENTLICHER VERKEHR / 100 KM",strategicInfrastructure:"GLOBALTERMINAL / INFRASTRUKTUR",earthSummary:"USGS · Erdbeben M2,5+ / 24 Std.",weatherSummary:"Pforzheim · Open-Meteo",spaceSummary:"ISS · Orbit und Weltraumwetter",transportSummary:"Baden-Württemberg · 100-km-Radius",transportNeedsFeed:"GTFS-RT · Regionalfeed erforderlich",infraValue:"NETZE · ENERGIE · OZEAN",infraSummary:"Root-DNS · Cloudflare · ENTSO-E · Kabel",infraTap:"Tippen für erweiterte Telemetrie",loading:"Öffentliche Daten werden geladen…",close:"SCHLIESSEN ✕",noFeed:"REGIONALER LIVE-FEED NICHT KONFIGURIERT",module:"MODUL ÖFFNEN ↗"}
};
let lang=localStorage.getItem("earth-deck-language")||"en";
function tr(k){return translations[lang]?.[k]||translations.en[k]||k}
function applyLanguage(next){lang=translations[next]?next:"en";try{localStorage.setItem("earth-deck-language",lang)}catch{}document.documentElement.lang=lang;document.querySelectorAll("[data-language]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.language===lang)));document.querySelectorAll("[data-i18n]").forEach(n=>{const key=n.dataset.i18n;if(tr(key)!==key)n.textContent=tr(key)});const d=$("strategic-dialog-close");if(d){d.textContent=tr("close");d.setAttribute("aria-label",tr("close"))}if($("strategic-dialog").open)openGroup($("strategic-dialog").dataset.group)}
function copyValue(source,target,suffix=""){const s=$(source),t=$(target);if(s&&t){const value=s.textContent.trim();if(value&&value!=="—")t.textContent=value+suffix}}
function updateSummaries(){copyValue("earth-quakes","strategic-quakes");copyValue("earth-state","strategic-earth-status");copyValue("weather-temp","strategic-temperature");copyValue("pm25","strategic-air"," · PM2.5");copyValue("iss-alt","strategic-iss");copyValue("kp","strategic-kp"," · NOAA Kp");if($("strategic-transit"))$("strategic-transit").textContent=tr("noFeed")}
function openGroup(key){const group=groups[key];if(!group)return;const d=$("strategic-dialog");d.dataset.group=key;$("strategic-dialog-index").textContent="DRILL-DOWN / "+String(Object.keys(groups).indexOf(key)+1).padStart(2,"0");$("strategic-dialog-title").textContent=group.title[lang]||group.title.en;const nav=$("strategic-dialog-nav");nav.replaceChildren();group.mods.forEach(([id,label])=>{const b=document.createElement("button");b.type="button";b.className="strategic-module-button";b.textContent=(tr("module"));b.dataset.module=id;b.setAttribute("aria-label",label);const title=document.createElement("span");title.textContent=label; b.replaceChildren(title);const action=document.createElement("span");action.textContent=tr("module");b.append(action);b.addEventListener("click",()=>openModule(id));nav.append(b)});const content=$("strategic-dialog-content");content.replaceChildren();const p=document.createElement("p");p.className="strategic-source-note";p.textContent=key==="transport"?"Loading public transport departures for Pforzheim…":"Select a telemetry module to inspect the available source data.";content.append(p);if(key==="transport")loadTransport(content)}
async function loadTransport(host){
 const note=host.querySelector(".strategic-source-note");
 const endpoint="https://v6.db.transport.rest/locations?query=Pforzheim&results=5&poi=false";
 try{
  if(note)note.textContent="Loading current departures from public Deutsche Bahn transport API…";
  const response=await fetch(endpoint,{headers:{Accept:"application/json"},cache:"no-store"});
  if(!response.ok)throw new Error("Transport API HTTP "+response.status);
  const stations=await response.json();
  if(!Array.isArray(stations)||!stations.length)throw new Error("No matching stations returned");
  const station=stations.find(x=>/Pforzheim Hbf/i.test(x.name||""))||stations[0];
  if(!station.id)throw new Error("Station ID missing from provider response");
  const depResponse=await fetch("https://v6.db.transport.rest/stops/"+encodeURIComponent(station.id)+"/departures?duration=90&results=30", {headers:{Accept:"application/json"},cache:"no-store"});
  if(!depResponse.ok)throw new Error("Departures API HTTP "+depResponse.status);
  const payload=await depResponse.json();
  const departures=Array.isArray(payload)?payload:(payload.departures||[]);
  host.replaceChildren();
  const heading=document.createElement("h3");heading.textContent=station.name+" · LIVE DEPARTURES";host.append(heading);
  const meta=document.createElement("p");meta.className="strategic-source-note";meta.textContent="Source: public transport.rest / Deutsche Bahn data · Station ID "+station.id+" · fetched "+new Date().toISOString()+" · results may be delayed and coverage depends on provider.";host.append(meta);
  if(!departures.length){const empty=document.createElement("p");empty.className="strategic-source-note";empty.textContent="Provider returned no departures for the requested 90-minute window.";host.append(empty);return}
  const list=document.createElement("div");list.className="strategic-transport-list";
  for(const dep of departures.slice(0,30)){
   const row=document.createElement("article");row.className="strategic-drill-card";
   const title=document.createElement("h3");title.textContent=[dep.line?.name||dep.line?.fahrtNr||dep.name||"Transit service",dep.direction?"→ "+dep.direction:""].filter(Boolean).join(" ");
   const details=document.createElement("p");details.textContent=[dep.when?new Date(dep.when).toLocaleString():"time unavailable",dep.platform?"Platform "+dep.platform:"",dep.delay!=null?"Delay "+Math.round(dep.delay/60)+" min":"",dep.cancelled?"CANCELLED":""].filter(Boolean).join(" · ");
   row.append(title,details);list.append(row);
  }
  host.append(list);
 }catch(error){
  host.replaceChildren();
  const h=document.createElement("h3");h.textContent="PUBLIC TRANSPORT FEED UNAVAILABLE";host.append(h);
  const p=document.createElement("p");p.className="strategic-source-note";p.textContent=(error?.message||"Request failed")+" · No synthetic departures are displayed. Retry or open the provider directly.";host.append(p);
  const a=document.createElement("a");a.className="strategic-source-link";a.href="https://bahn.expert/";a.target="_blank";a.rel="noopener noreferrer";a.textContent="OPEN LIVE DEPARTURE BOARD ↗";host.append(a);
 }
}

function openModule(id){
 const strategic=$("strategic-dialog");
 const openDedicated=(dialogId,selector)=>{strategic?.close();const d=$(dialogId);if(d&&!d.open)d.showModal();if(selector)document.querySelector(selector)?.click()};
 if(id==="global-streams"){openDedicated("global-stream-dialog",'[data-global-select="lightning"]');return}
 if(id==="niche-telemetry"){openDedicated("niche-telemetry-dialog",'[data-niche-select="aircraft"]');return}
 if(id==="deep-telemetry"){openDedicated("deep-telemetry-dialog",'[data-deep-select="dsn"]');return}
 if(id==="transport"){const p=$("strategic-dialog-content");p.replaceChildren();const note=document.createElement("p");note.className="strategic-source-note";note.textContent="Loading current public departures…";p.append(note);loadTransport(p);return}
 const panelId=id==="airquality"?"earthdata":id;
 const panel=document.querySelector('#source-library [data-panel="'+panelId+'"]');
 if(!panel){const p=document.createElement("p");p.className="strategic-source-note";p.textContent="MODULE UNAVAILABLE · no matching panel is registered in this build."; $("strategic-dialog-content").replaceChildren(p);return}
 const expand=panel.querySelector("[data-expand]");
 if(expand){strategic?.close();expand.click();return}
 const content=$("strategic-dialog-content");content.replaceChildren();
 const h=document.createElement("h3");h.textContent=panel.querySelector("h2")?.textContent||panelId;content.append(h);
 const note=document.createElement("p");note.className="strategic-source-note";note.textContent="This source has no interactive detail handler in the current build. No measurements are synthesized.";content.append(note);
}
document.querySelectorAll("[data-strategic-open]").forEach(b=>b.addEventListener("click",()=>{const d=$("strategic-dialog");if(!d.open)d.showModal();openGroup(b.dataset.strategicOpen)}));
$("strategic-dialog-close")?.addEventListener("click",()=>$("strategic-dialog").close());
$("strategic-dialog")?.addEventListener("click",e=>{if(e.target===$("strategic-dialog"))$("strategic-dialog").close()});
let touchStartX=0,touchStartY=0;$("strategic-dialog")?.addEventListener("touchstart",e=>{touchStartX=e.changedTouches[0].clientX;touchStartY=e.changedTouches[0].clientY},{passive:true});$("strategic-dialog")?.addEventListener("touchend",e=>{const dx=e.changedTouches[0].clientX-touchStartX,dy=e.changedTouches[0].clientY-touchStartY;if(dx>100&&Math.abs(dx)>Math.abs(dy)*1.4)$("strategic-dialog").close()},{passive:true});
document.querySelectorAll("[data-language]").forEach(b=>b.addEventListener("click",()=>applyLanguage(b.dataset.language)));
document.addEventListener("click",e=>{const b=e.target.closest("[data-expand]");if(b){const id=b.dataset.expand;const card=b.closest("[data-panel]");const group=id==="earth"?"earth":id==="weather"?"weather":id==="orbit"?"space":"infrastructure";if(card&&card.closest("#source-library")){e.preventDefault();const d=$("strategic-dialog");if(!d.open)d.showModal();openGroup(group)}}});
setInterval(updateSummaries,1000);applyLanguage(lang);updateSummaries();
})();