(()=>{"use strict";
const $=id=>document.getElementById(id), byPanel=id=>document.querySelector('[data-panel="'+id+'"]');
const state={font:1,errors:[],updated:null,requests:0,cacheUsed:false};
const SAT_CACHE_KEY="earth-deck-satellites-v1";
function readSatelliteCache(){try{const data=JSON.parse(localStorage.getItem(SAT_CACHE_KEY)||"null");return data&&Array.isArray(data.list)&&data.list.length>0&&Number.isFinite(data.savedAt)?data:null}catch{return null}}
function saveSatelliteCache(list){try{localStorage.setItem(SAT_CACHE_KEY,JSON.stringify({list:list.slice(0,80),savedAt:Date.now()}))}catch{}}
function showSatellites(list,source){set("sat-count",list.length);const host=$("sat-list");host.replaceChildren();list.slice(0,4).forEach((item,index)=>{const row=document.createElement("div");row.className="sat-item";const name=document.createElement("span");name.textContent=String(item.NAME||item.OBJECT_NAME||"OBJECT "+(index+1));const epoch=document.createElement("strong");epoch.textContent=item.EPOCH?String(item.EPOCH).slice(0,10):"CATALOG";row.append(name,epoch);host.append(row)});set("sat-updated",source+" · "+time())}

const fmt=(n,d=1)=>Number.isFinite(Number(n))?Number(n).toFixed(d):"—";
const set=(id,value)=>{const el=$(id);if(el)el.textContent=value==null?"—":String(value)};
const req=async(url,timeout=12000)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{const response=await fetch(url,{signal:controller.signal,cache:"no-store",headers:{Accept:"application/json"}});if(!response.ok)throw new Error("HTTP "+response.status+" "+new URL(url).hostname);return await response.json()}finally{clearTimeout(timer)}};
const time=()=>new Date().toISOString().replace("T"," ").slice(0,19)+" UTC";
function weatherText(code){const m={0:"CLEAR",1:"MAINLY CLEAR",2:"PARTLY CLOUDY",3:"OVERCAST",45:"FOG",48:"RIME FOG",51:"LIGHT DRIZZLE",53:"DRIZZLE",55:"DENSE DRIZZLE",61:"LIGHT RAIN",63:"RAIN",65:"HEAVY RAIN",71:"LIGHT SNOW",73:"SNOW",75:"HEAVY SNOW",80:"RAIN SHOWERS",81:"SHOWERS",82:"HEAVY SHOWERS",95:"THUNDERSTORM",96:"HAIL / THUNDERSTORM",99:"SEVERE THUNDERSTORM"};return m[code]||"CONDITION CODE "+code}
async function loadWeather(){const [weather,air]=await Promise.allSettled([
req("https://api.open-meteo.com/v1/forecast?latitude=48.89&longitude=8.70&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,wind_speed_10m&timezone=Europe%2FBerlin"),
req("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=48.89&longitude=8.70&current=european_aqi,us_aqi,pm10,pm2_5,nitrogen_dioxide,uv_index&timezone=Europe%2FBerlin")
]);if(weather.status==="fulfilled"){const c=weather.value.current;if(!c)throw Error("Weather response has no current sample");set("weather-temp",fmt(c.temperature_2m)+" °C");set("earth-temp",fmt(c.temperature_2m)+" °C");set("weather-code",weatherText(Number(c.weather_code))+(c.is_day?" · DAY":" · NIGHT"));set("weather-time",(c.time||"") +" · Europe/Berlin");set("feels",fmt(c.apparent_temperature)+" °C");set("wind",fmt(c.wind_speed_10m)+" km/h");set("pressure",fmt(c.pressure_msl,0)+" hPa");set("humidity",fmt(c.relative_humidity_2m,0)+" %");set("precip",fmt(c.precipitation)+" mm");}else{state.errors.push("Weather: "+weather.reason);set("weather-code","WEATHER DATA UNAVAILABLE");}if(air.status==="fulfilled"){const c=air.value.current||{};set("aqi",Number.isFinite(c.european_aqi)?fmt(c.european_aqi,0):"N/A");set("pm25",Number.isFinite(c.pm2_5)?fmt(c.pm2_5)+" µg/m³":"N/A");set("uv",Number.isFinite(c.uv_index)?fmt(c.uv_index):"N/A");set("us-aqi",Number.isFinite(c.us_aqi)?fmt(c.us_aqi,0):"N/A");set("aqi-pm25",Number.isFinite(c.pm2_5)?fmt(c.pm2_5)+" µg/m³":"N/A");set("aqi-pm10",Number.isFinite(c.pm10)?fmt(c.pm10)+" µg/m³":"N/A");set("aqi-no2",Number.isFinite(c.nitrogen_dioxide)?fmt(c.nitrogen_dioxide)+" µg/m³":"N/A");const usaqi=Number(c.us_aqi);set("aqi-status",Number.isFinite(usaqi)?(usaqi<=50?"GOOD":usaqi<=100?"MODERATE":usaqi<=150?"SENSITIVE":usaqi<=200?"UNHEALTHY":usaqi<=300?"VERY UNHEALTHY":"HAZARDOUS"):"N/A");set("aqi-updated","MODEL SAMPLE · "+time());}else{state.errors.push("Air quality: "+air.reason);set("aqi","N/A");set("pm25","N/A");set("uv","N/A");set("us-aqi","N/A");set("aqi-pm25","N/A");set("aqi-pm10","N/A");set("aqi-no2","N/A");set("aqi-status","OFFLINE");set("aqi-updated","AIR-QUALITY API UNAVAILABLE");}}
async function loadISS(){const data=await req("https://api.wheretheiss.at/v1/satellites/25544");if(!Number.isFinite(Number(data.latitude))||!Number.isFinite(Number(data.longitude)))throw Error("ISS position invalid");set("iss-alt",fmt(data.altitude,0)+" KM");set("iss-lat",fmt(data.latitude,3)+"°");set("iss-lon",fmt(data.longitude,3)+"°");set("iss-vel",fmt(data.velocity,0)+" KM/H");set("iss-status","LIVE POSITION · "+time());}
async function loadEarthData(){const results=await Promise.allSettled([
req("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"),
req("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=20"),
req("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"),
req("https://celestrak.org/NORAD/elements/gp.php?GROUP=STATIONS&FORMAT=JSON"),
req("https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json"),
req("https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json")
]);const [quakes,eonet,solar,satellites,solarWind,xrays]=results;if(quakes.status==="fulfilled"){const features=quakes.value.features||[];set("earth-quakes",features.length);set("quake-count",features.length);const biggest=features.reduce((a,b)=>(Number(b.properties?.mag||0)>Number(a?.properties?.mag||0)?b:a),null);set("quake-largest",biggest?"M"+fmt(biggest.properties.mag,1):"NONE");set("quake-place",biggest?.properties?.place||"No events");}else{state.errors.push("USGS: "+quakes.reason);set("earth-quakes","N/A");set("quake-count","N/A");set("quake-largest","N/A");}if(eonet.status==="fulfilled"){const events=eonet.value.events||[];set("eonet-count",events.length);if(events[0])set("earthdata-time","LATEST EVENT: "+events[0].title+" · "+(events[0].categories?.map(x=>x.title).join(", ")||"NASA EONET"));const fires=events.filter(ev=>(ev.categories||[]).some(cat=>/wildfire/i.test(cat.title||cat.id||"")));set("fire-count",fires.length);const host=$("fire-list");host.replaceChildren();fires.slice(0,3).forEach(ev=>{const geom=(ev.geometry||[]).slice().reverse().find(g=>Array.isArray(g.coordinates));const coords=geom?.coordinates;const row=document.createElement("div");row.className="fire-row";const label=document.createElement("span");label.textContent=String(ev.title||"WILDFIRE EVENT");const detail=document.createElement("strong");detail.textContent=coords&&coords.length>=2?Number(coords[1]).toFixed(2)+"°, "+Number(coords[0]).toFixed(2)+"°":"COORDS N/A";row.append(label,detail);host.append(row)});if(!fires.length){const row=document.createElement("div");row.className="fire-row";row.textContent="NO OPEN WILDFIRE EVENTS IN EONET CATALOG";host.append(row)}set("fire-updated","NASA EONET · "+time());}else{state.errors.push("NASA EONET: "+eonet.reason);set("eonet-count","N/A");set("fire-count","N/A");set("fire-updated","EONET DATA UNAVAILABLE");}if(solar.status==="fulfilled"){const list=solar.value;const last=Array.isArray(list)?list.slice(1).reverse().find(x=>Number.isFinite(Number(x.kp_index))):null;const kp=last?Number(last.kp_index):NaN;set("kp",Number.isFinite(kp)?fmt(kp,1):"N/A");set("solar-state",last?"NOAA SAMPLE · "+(last.time_tag||"LATEST"):"NO VALID SAMPLE");set("sw-kp",Number.isFinite(kp)?fmt(kp,1):"N/A");set("sw-status",Number.isFinite(kp)?(kp<4?"QUIET":kp<5?"UNSETTLED":"STORM"):"N/A");$("sw-kp-bar").style.width=Number.isFinite(kp)?Math.max(0,Math.min(9,kp))/9*100+"%":"0%";set("sw-updated","NOAA Kp · "+(last?.time_tag||time()));}else{state.errors.push("NOAA SWPC: "+solar.reason);set("kp","N/A");set("solar-state","DATA UNAVAILABLE");set("sw-kp","N/A");set("sw-status","OFFLINE");$("sw-kp-bar").style.width="0%";}if(solarWind.status==="fulfilled"){const rows=solarWind.value;const row=Array.isArray(rows)?rows.slice(1).reverse().find(r=>Array.isArray(r)&&Number.isFinite(Number(r[2]))):null;set("sw-speed",row?fmt(row[2],0):"N/A");}else{state.errors.push("Solar wind: "+solarWind.reason);set("sw-speed","N/A");}if(xrays.status==="fulfilled"){const rows=xrays.value;const row=Array.isArray(rows)?rows.slice().reverse().find(r=>r.energy==="0.1-0.8nm"&&Number.isFinite(Number(r.flux))):null;set("sw-xray",row?Number(row.flux).toExponential(2)+" W/m²":"N/A");set("sw-xray-band",row?String(row.energy)+" · "+String(row.time_tag||"LATEST"):"NO VALID SAMPLE");}else{state.errors.push("GOES X-ray: "+xrays.reason);set("sw-xray","N/A");set("sw-xray-band","DATA UNAVAILABLE");}
if(satellites.status==="fulfilled"&&Array.isArray(satellites.value)&&satellites.value.length){const list=satellites.value;showSatellites(list,"CELESTRAK LIVE");saveSatelliteCache(list);}else{const cached=readSatelliteCache();if(cached){showSatellites(cached.list,"CACHED "+new Date(cached.savedAt).toISOString().slice(0,16)+" UTC");state.cacheUsed=true;}else{set("sat-count","21*");const host=$("sat-list");host.replaceChildren();["ISS (ZARYA)","TIANGONG","CSS MODULE","ORBITAL OBJECT"].forEach((name,index)=>{const row=document.createElement("div");row.className="sat-item";const label=document.createElement("span");label.textContent=name;const value=document.createElement("strong");value.textContent=index===0?"REFERENCE":"—";row.append(label,value);host.append(row)});set("sat-updated","REFERENCE BASELINE · LIVE CATALOG OFFLINE");state.cacheUsed=true;}state.errors.push("CelesTrak: "+(satellites.status==="rejected"?satellites.reason:"invalid/empty response"));}}
function astronomy(){const d=new Date(),day=(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-Date.UTC(d.getUTCFullYear(),0,0))/86400000;const syn=29.530588853,known=Date.UTC(2000,0,6,18,14),age=((d.getTime()-known)/86400000%syn+syn)%syn,illum=(1-Math.cos(2*Math.PI*age/syn))/2;const phases=["NEW MOON","WAXING CRESCENT","FIRST QUARTER","WAXING GIBBOUS","FULL MOON","WANING GIBBOUS","LAST QUARTER","WANING CRESCENT"];const phase=phases[Math.floor((age/syn)*8+.5)%8];const moonKm=384400-25100*Math.cos(2*Math.PI*((d.getTime()-Date.UTC(2000,0,3))/86400000)/27.55455);const angle=2*Math.PI*(day-4)/365.256,sunKm=149.6*(1-.0167*Math.cos(angle));set("utc-clock","UTC "+d.toISOString().slice(11,19));set("utc-date",d.toISOString().slice(0,10));set("sidereal","DAY "+Math.floor(day));set("moon-phase",phase);set("moon-age",fmt(age,1)+" DAYS");set("moon-illum",Math.round(illum*100)+"% ILLUMINATION");set("moon-distance",Math.round(moonKm).toLocaleString("en-US")+" KM");set("sun-distance",fmt(sunKm,2)+" M KM");set("moon-date","UTC "+d.toISOString().slice(0,10));const shadow=$("moon-shadow");if(shadow){const waxing=age<syn/2;const rx=Math.abs(Math.cos(2*Math.PI*age/syn))*72;shadow.setAttribute("rx",Math.max(1,rx));shadow.setAttribute("cx",waxing?100-rx:100+rx);shadow.setAttribute("fill","#111");shadow.setAttribute("stroke","#777");shadow.setAttribute("stroke-width","1");}}
function drawStars(){const canvas=$("star-canvas"),ctx=canvas.getContext("2d");if(!ctx)return;let w=0,h=0,stars=[];function resize(){const r=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);w=Math.max(1,Math.floor(r.width*ratio));h=Math.max(1,Math.floor(r.height*ratio));canvas.width=w;canvas.height=h;stars=Array.from({length:Math.min(360,Math.floor(r.width*r.height/1000))},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.5+.2,a:Math.random()*.7+.2,p:Math.random()*Math.PI*2}));}function paint(t){if(!canvas.isConnected)return;ctx.clearRect(0,0,w,h);ctx.fillStyle="#050505";ctx.fillRect(0,0,w,h);for(const s of stars){const tw=.55+.45*Math.sin(t*.0006+s.p);ctx.globalAlpha=s.a*tw;ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=.22;ctx.strokeStyle="#aaa";ctx.lineWidth=1;for(let i=0;i<stars.length;i+=7){const a=stars[i],b=stars[(i+11)%stars.length];if(Math.hypot(a.x-b.x,a.y-b.y)<Math.min(w,h)*.23){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}ctx.globalAlpha=1;requestAnimationFrame(paint)}resize();new ResizeObserver(resize).observe(canvas);requestAnimationFrame(paint);}

async function resolveNASAClip(query,video,visual,labelId){
const cacheKey="earth-deck-video-"+video.id;
const tryVideo=async src=>{if(!/^https:\/\//i.test(src))return false;video.pause();video.src=src;video.muted=true;video.loop=true;video.playsInline=true;video.load();try{await Promise.race([new Promise((resolve,reject)=>{video.addEventListener("playing",resolve,{once:true});video.addEventListener("error",()=>reject(Error("media error")),{once:true});video.play().catch(reject)}),new Promise((_,reject)=>setTimeout(()=>reject(Error("play timeout")),12000))]);video.classList.add("is-ready");visual.classList.add("has-video");if(labelId)set(labelId,"NASA VIDEO · PLAYING");return true}catch{video.pause();video.removeAttribute("src");video.load();return false}};
try{const cached=localStorage.getItem(cacheKey);if(cached&&await tryVideo(cached))return true}catch{}
try{const search=await req("https://images-api.nasa.gov/search?q="+encodeURIComponent(query)+"&media_type=video&page_size=30",15000);
const items=search.collection?.items||[];
const ranked=items.slice().sort((a,b)=>{const score=item=>{const t=(item.data?.[0]?.title||"").toLowerCase();return (/(earth|planet|globe|rotation|blue marble|star|deep space|nebula|universe|cosmos)/.test(t)?3:0)+(item.links?.some(link=>link.rel==="preview")?1:0)};return score(b)-score(a)});
for(const item of ranked.slice(0,12)){if(!item.href)continue;try{const assets=await req(item.href,8000);if(!Array.isArray(assets))continue;const candidates=assets.filter(url=>typeof url==="string"&&/\.mp4(?:\?|$)/i.test(url)).sort((a,b)=>{const rank=s=>/~small\.mp4/i.test(s)?0:/~medium\.mp4/i.test(s)?1:/~orig\.mp4/i.test(s)?3:2;return rank(a)-rank(b)});for(const src of candidates.slice(0,2)){if(await tryVideo(src)){try{localStorage.setItem(cacheKey,src)}catch{}return true}}}catch{continue}}}catch{}
if(labelId){const label=$(labelId);if(label)label.textContent="";}return false;
}
function updateStatus(){const online=navigator.onLine;const status=$("net-status");status.classList.toggle("is-connected",online);status.classList.toggle("is-offline",!online);const langDict=I18N[document.documentElement.lang]||I18N.en;status.textContent=online?"● "+langDict.connected+(state.errors.length?(state.cacheUsed?" · CACHED / "+langDict.partial:" · "+langDict.partial):" · DATA LINK"):"○ "+langDict.offline;set("earth-state",online?langDict.connected:langDict.offline);set("last-update",state.updated?state.updated.slice(11,19)+" UTC":"—");set("data-status",state.errors.length?state.errors.length+" SOURCE(S) UNAVAILABLE · "+time():"PUBLIC SOURCES UPDATED · "+time());}
async function refreshAll(){const btn=$("refresh");btn.disabled=true;btn.textContent="↻ FETCHING";state.errors=[];state.cacheUsed=false;set("net-status","● FETCHING PUBLIC DATA");set("data-status","REQUESTING PUBLIC APIS");const tasks=await Promise.allSettled([loadWeather(),loadISS(),loadEarthData()]);for(const t of tasks)if(t.status==="rejected")state.errors.push(String(t.reason));state.updated=new Date().toISOString();updateStatus();btn.disabled=false;btn.textContent="↻ REFRESH";state.requests++;}
const names={earth:"EARTH / LIVE STATUS",stars:"DEEP SPACE / STAR FIELD",weather:"WEATHER / ATMOSPHERE",orbit:"ORBIT / ISS TELEMETRY",video:"NASA / ISS LIVE VIDEO",earthdata:"GLOBAL EARTH MONITOR",spaceweather:"SPACE WEATHER & SOLAR FLUX",wildfires:"GLOBAL WILDFIRES & THERMAL ANOMALIES",airquality:"AIR QUALITY & ATMOSPHERE",moon:"MOON / CELESTIAL CYCLE",satellites:"SATELLITE NETWORK"};
function panelDetails(id){const p=byPanel(id);if(!p)return "";const lines=[names[id]||id,"",...Array.from(p.querySelectorAll(".row,.metric,.small,.kicker,.footer")).map(el=>el.innerText.trim()).filter(Boolean)];if(id==="earthdata")lines.push("Source: USGS M2.5+ daily GeoJSON, NASA EONET public events, NOAA SWPC planetary K-index.");if(id==="spaceweather")lines.push("Sources: NOAA SWPC planetary K-index, solar-wind plasma and GOES X-ray flux. Kp < 4 QUIET, 4–<5 UNSETTLED, >=5 STORM.");if(id==="wildfires")lines.push("Source: NASA EONET open wildfire event catalog. EONET does not supply VIIRS/MODIS brightness temperature; NASA FIRMS satellite thermal anomaly data requires an API key.");if(id==="airquality")lines.push("Source: Open-Meteo Air Quality API model estimates for Pforzheim, Germany; not a regulatory ground monitor.");if(id==="weather")lines.push("Source: Open-Meteo forecast and air-quality APIs; location is Pforzheim, Germany. Model values are not ground-station measurements.");if(id==="orbit")lines.push("Source: WhereTheISS.at public ISS position endpoint. Position is a live sample and can be temporarily unavailable.");if(id==="stars")lines.push("Star field and connecting lines are a generated visual, not a validated astronomical catalog.");if(id==="moon")lines.push("Lunar phase and orbital distances are approximate calculations from time-based formulas.");if(id==="satellites")lines.push("Source: CelesTrak public GP catalog for the STATIONS group. The count represents objects returned by that specific group, not all satellites in orbit.");if(id==="video")lines.push("Live playback falls back to a direct NASA archive video or a local animated ambient scene. Archive/ambient modes are marked as not live.");return lines.join("\n");}
function openDetails(id){
 const dialog=$("details"), source=byPanel(id), body=$("dialog-body");
 $("dialog-title").textContent=names[id]||source?.querySelector("h2")?.textContent||"PANEL DETAILS";
 body.replaceChildren();
 const intro=document.createElement("p");intro.className="muted";intro.textContent=panelDetails(id);body.append(intro);
 if(source){
  const content=document.createElement("div");content.className="drill-panel-content";
  [...source.children].filter(el=>!el.classList.contains("panel-head")).forEach((el,index)=>{
   const card=document.createElement("section");card.className="drill-card";
   const title=document.createElement("h3");title.textContent=el.querySelector("h2")?.textContent||el.querySelector(".kicker")?.textContent||((index+1).toString().padStart(2,"0")+" / TELEMETRY");
   card.append(title);
   const clone=el.cloneNode(true);
   clone.querySelectorAll("[id]").forEach(node=>node.removeAttribute("id"));
   clone.querySelectorAll("button").forEach(button=>button.disabled=true);
   card.append(clone);content.append(card);
  });
  body.append(content);
 }
 dialog.dataset.panel=id;if(!dialog.open)dialog.showModal();
}
document.querySelectorAll("[data-monitor-tab]").forEach(button=>button.addEventListener("click",()=>{const mode=button.dataset.monitorTab;document.querySelectorAll("[data-monitor-tab]").forEach(tab=>{const active=tab===button;tab.classList.toggle("is-active",active);tab.setAttribute("aria-selected",String(active));});document.querySelectorAll("[data-monitor-view]").forEach(view=>{const active=view.dataset.monitorView===mode;view.classList.toggle("is-active",active);view.hidden=!active;});const titles={earthdata:"GLOBAL EARTH MONITOR",spaceweather:"SPACE WEATHER & SOLAR FLUX",wildfires:"GLOBAL WILDFIRES & THERMAL ANOMALIES",airquality:"AIR QUALITY & ATMOSPHERE"};set("earthdata-title",titles[mode]||"GLOBAL EARTH MONITOR");}));

const glossary={
norad:{title:"NORAD ID",ru:"Уникальный каталожный номер объекта на орбите. Например, 25544 — Международная космическая станция.",en:"A catalog identifier for an object in orbit. 25544 identifies the International Space Station."},
kp:{title:"Kp-INDEX",ru:"Индекс геомагнитной активности от 0 до 9. Чем выше значение, тем сильнее возмущение магнитного поля Земли.",en:"A 0–9 measure of geomagnetic activity. Higher values indicate stronger disturbances in Earth's magnetic field."},
aqi:{title:"AQI",ru:"Индекс качества воздуха. Он сводит уровень загрязнения к понятной шкале; категории зависят от используемой системы индекса.",en:"Air Quality Index: a scale summarizing pollution levels. Categories depend on the AQI standard used."},
tle:{title:"TLE",ru:"Two-Line Element — набор орбитальных параметров спутника. Это расчётные элементы орбиты, а не прямое измерение его положения в эту секунду.",en:"Two-Line Element set: orbital parameters used to propagate a satellite's orbit, not a live position measurement."}
};
function showTerm(key,anchor){const item=glossary[key];if(!item)return;set("term-title",item.title);set("term-copy",item.ru+" / "+item.en);const pop=$("term-popover");pop.hidden=false;const rect=anchor?.getBoundingClientRect();if(rect&&rect.top>window.innerHeight*.55){pop.style.bottom="auto";pop.style.top=Math.max(8,rect.top-8)+"px"}else{pop.style.top="auto";pop.style.bottom="18px"}}

const I18N={
en:{refresh:"↻ REFRESH",help:"[?] HELP",landscape:"↔ LANDSCAPE",h1:"EARTH / LIVE STATUS",h2:"DEEP SPACE / STAR FIELD",h3:"WEATHER / ATMOSPHERE",h4:"ORBIT / ISS TELEMETRY",h5:"NASA / ISS LIVE VIDEO",h6:"GLOBAL EARTH MONITOR",h7:"MOON / CELESTIAL CYCLE",h8:"SATELLITE NETWORK",camTitle:"REGIONAL CAMERAS / 300 KM RADIUS",rotateCams:"↻ ROTATE CAMS",local:"LOCAL TEMP",quakes:"QUAKES M2.5+ / 24H",feels:"FEELS LIKE",wind:"WIND",pressure:"PRESSURE",humidity:"HUMIDITY",latitude:"LATITUDE",longitude:"LONGITUDE",velocity:"VELOCITY",period:"ORBIT PERIOD (EST.)",position:"POSITION API",nasa:"NASA LIVE",openVideo:"OPEN VIDEO ↗",earth:"06 EARTH",space:"09 SPACE",fires:"10 FIRES",aqi:"11 AQI",usgs:"USGS FEED",eonet:"NASA EONET",swpc:"NOAA SWPC",intro:"OPERATOR INITIALIZATION",next:"NEXT ↗",skip:"SKIP",helpTitle:"OPERATOR REFERENCE / HELP",close:"CLOSE ✕",runTour:"RUN INTRO TOUR ↗",connected:"CONNECTED",partial:"PARTIAL DATA",offline:"OFFLINE"},
ru:{refresh:"↻ ОБНОВИТЬ",help:"[?] ПОМОЩЬ",landscape:"↔ ГОРИЗОНТАЛЬНО",h1:"ЗЕМЛЯ / ТЕКУЩИЙ СТАТУС",h2:"ДАЛЬНИЙ КОСМОС / ЗВЁЗДНОЕ ПОЛЕ",h3:"ПОГОДА / АТМОСФЕРА",h4:"ОРБИТА / ТЕЛЕМЕТРИЯ МКС",h5:"NASA / ВИДЕО МКС",h6:"МОНИТОР ЗЕМЛИ",h7:"ЛУНА / НЕБЕСНЫЙ ЦИКЛ",h8:"СЕТЬ СПУТНИКОВ",camTitle:"РЕГИОНАЛЬНЫЕ КАМЕРЫ / РАДИУС 300 КМ",rotateCams:"[ РОТАЦИЯ КАМЕР ]",local:"МЕСТНАЯ ТЕМП.",quakes:"ЗЕМЛЕТРЯСЕНИЯ M2.5+ / 24 Ч",feels:"ОЩУЩАЕТСЯ",wind:"ВЕТЕР",pressure:"ДАВЛЕНИЕ",humidity:"ВЛАЖНОСТЬ",latitude:"ШИРОТА",longitude:"ДОЛГОТА",velocity:"СКОРОСТЬ",period:"ПЕРИОД ОРБИТЫ (ОЦЕНКА)",position:"API ПОЗИЦИИ",nasa:"NASA LIVE",openVideo:"ОТКРЫТЬ ВИДЕО ↗",earth:"06 ЗЕМЛЯ",space:"09 КОСМОС",fires:"10 ПОЖАРЫ",aqi:"11 AQI",usgs:"ЛЕНТА USGS",eonet:"NASA EONET",swpc:"NOAA SWPC",intro:"ИНИЦИАЛИЗАЦИЯ ОПЕРАТОРА",next:"ДАЛЕЕ ↗",skip:"ПРОПУСТИТЬ",helpTitle:"СПРАВОЧНИК ОПЕРАТОРА",close:"ЗАКРЫТЬ ✕",runTour:"ЗАПУСТИТЬ ТУР ↗",connected:"ПОДКЛЮЧЕНО",partial:"ЧАСТИЧНЫЕ ДАННЫЕ",offline:"НЕТ СЕТИ"},
uk:{refresh:"↻ ОНОВИТИ",help:"[?] ДОВІДКА",landscape:"↔ ГОРИЗОНТАЛЬНО",h1:"ЗЕМЛЯ / ПОТОЧНИЙ СТАН",h2:"ДАЛЕКИЙ КОСМОС / ЗОРЯНЕ ПОЛЕ",h3:"ПОГОДА / АТМОСФЕРА",h4:"ОРБІТА / ТЕЛЕМЕТРІЯ МКС",h5:"NASA / ВІДЕО МКС",h6:"МОНІТОР ЗЕМЛІ",h7:"МІСЯЦЬ / НЕБЕСНИЙ ЦИКЛ",h8:"МЕРЕЖА КАМЕР / РАДІУС 300 КМ",camTitle:"РЕГІОНАЛЬНІ КАМЕРИ / РАДІУС 300 КМ",rotateCams:"↻ ЗМІНИТИ КАМЕРИ",local:"МІСЦЕВА ТЕМП.",quakes:"ЗЕМЛЕТРУСИ M2.5+ / 24 Г",feels:"ВІДЧУВАЄТЬСЯ",wind:"ВІТЕР",pressure:"ТИСК",humidity:"ВОЛОГІСТЬ",latitude:"ШИРОТА",longitude:"ДОВГОТА",velocity:"ШВИДКІСТЬ",period:"ПЕРІОД ОРБІТИ (ОЦІНКА)",position:"API ПОЗИЦІЇ",nasa:"NASA LIVE",openVideo:"ВІДКРИТИ ВІДЕО ↗",earth:"06 ЗЕМЛЯ",space:"09 КОСМОС",fires:"10 ПОЖЕЖІ",aqi:"11 AQI",usgs:"СТРІЧКА USGS",eonet:"NASA EONET",swpc:"NOAA SWPC",intro:"ІНІЦІАЛІЗАЦІЯ ОПЕРАТОРА",next:"ДАЛІ ↗",skip:"ПРОПУСТИТИ",helpTitle:"ДОВІДНИК ОПЕРАТОРА",close:"ЗАКРИТИ ✕",runTour:"ЗАПУСТИТИ ТУР ↗",connected:"ПІДКЛЮЧЕНО",partial:"ЧАСТКОВІ ДАНІ",offline:"НЕМАЄ МЕРЕЖІ"},
de:{refresh:"↻ AKTUALISIEREN",help:"[?] HILFE",landscape:"↔ QUERFORMAT",h1:"ERDE / LIVE-STATUS",h2:"TIEFER WELTRAUM / STERNENFELD",h3:"WETTER / ATMOSPHÄRE",h4:"ORBIT / ISS-TELEMETRIE",h5:"NASA / ISS-LIVEVIDEO",h6:"GLOBALE ERDBEOBACHTUNG",h7:"MOND / HIMMELSZYKLUS",h8:"SATELLITENNETZWERK",camTitle:"REGIONALE KAMERAS / 300-KM-RADIUS",rotateCams:"↻ KAMERAS WECHSELN",local:"ORTSTEMPERATUR",quakes:"ERDBEBEN M2.5+ / 24 H",feels:"GEFÜHLT",wind:"WIND",pressure:"LUFTDRUCK",humidity:"LUFTFEUCHTIGKEIT",latitude:"BREITENGRAD",longitude:"LÄNGENGRAD",velocity:"GESCHWINDIGKEIT",period:"UMLAUFZEIT (CA.)",position:"POSITIONS-API",nasa:"NASA LIVE",openVideo:"VIDEO ÖFFNEN ↗",earth:"06 ERDE",space:"09 WELTRAUM",fires:"10 BRÄNDE",aqi:"11 AQI",usgs:"USGS-DATEN",eonet:"NASA EONET",swpc:"NOAA SWPC",intro:"OPERATOR-INITIALISIERUNG",next:"WEITER ↗",skip:"ÜBERSPRINGEN",helpTitle:"OPERATOR-HANDBUCH",close:"SCHLIESSEN ✕",runTour:"EINFÜHRUNG STARTEN ↗",connected:"VERBUNDEN",partial:"TEILWEISE DATEN",offline:"OFFLINE"}};
function setLanguage(code,save=true){const lang=I18N[code]?code:"en",d=I18N[lang];document.documentElement.lang=lang;
const put=(s,v)=>{const e=document.querySelector(s);if(e&&v)e.textContent=v};
["h1","h2","h3","h4","h5","h6","h7","h8"].forEach((k,i)=>put([".panel-globe h2",".panel-stars h2",".panel-weather h2",".panel-orbit h2",".panel-video h2",".panel-earthdata h2",".panel-moon h2",".panel-satellites h2"][i],d[k]));
[[".panel-cameras h2","camTitle"],["#rotate-cams","rotateCams"],["#refresh","refresh"],["#help-open","help"],["#landscape","landscape"],["#intro-title","intro"],["#intro-next","next"],["#intro-skip","skip"],["#help-close","close"],["#help-start-tour","runTour"]].forEach(([s,k])=>put(s,d[k]));
const replacements=[[".panel-globe .metric:nth-child(1) small","local"],[".panel-globe .metric:nth-child(2) small","quakes"],[".panel-orbit .row:nth-child(1) span","latitude"],[".panel-orbit .row:nth-child(2) span","longitude"],[".panel-orbit .row:nth-child(3) span","velocity"],[".panel-orbit .row:nth-child(4) span","period"],[".panel-orbit .footer a:first-child","position"],[".panel-orbit .footer a:last-child","nasa"],[".panel-video .footer a:first-child","openVideo"],[".panel-video .footer a:last-child","nasa"],[".panel-earthdata .footer a:first-child","usgs"],[".panel-earthdata .footer a:nth-of-type(2)","eonet"],[".panel-earthdata .footer a:last-child","swpc"]];
replacements.forEach(([s,k])=>put(s,d[k]));
document.querySelectorAll("[data-monitor-tab]").forEach(e=>{const k={earth:"earth",space:"space",fires:"fires",airquality:"aqi"}[e.dataset.monitorTab];if(k)put('[data-monitor-tab="'+e.dataset.monitorTab+'"]',d[k])});
document.querySelectorAll("[data-language]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.language===lang)));
try{if(save)localStorage.setItem("earth-deck-language",lang)}catch{}}
document.querySelectorAll("[data-language]").forEach(b=>b.addEventListener("click",()=>setLanguage(b.dataset.language)));
let initialLang="en";try{initialLang=localStorage.getItem("earth-deck-language")||"en"}catch{}setLanguage(initialLang,false);


/* Public Autobahn webcam adapter. Direct JPEG URLs are discovered from the official API. */
const CAMERA_POOL=[
{id:"pf",name:"PFORZHEIM CTR",distanceKm:0,lat:48.8922,lon:8.6946,streamUrl:"",sourceUrl:"https://verkehr.autobahn.de/o/autobahn/A8/services/webcam",feedTitle:"",feedUpdated:0},
{id:"st",name:"STUTTGART CTR",distanceKm:38,lat:48.7758,lon:9.1829,streamUrl:"",sourceUrl:"https://verkehr.autobahn.de/o/autobahn/A8/services/webcam",feedTitle:"",feedUpdated:0},
{id:"ka",name:"KARLSRUHE CTR",distanceKm:25,lat:49.0069,lon:8.4037,streamUrl:"",sourceUrl:"https://verkehr.autobahn.de/o/autobahn/A5/services/webcam",feedTitle:"",feedUpdated:0},
{id:"str",name:"STRASBOURG CTR",distanceKm:65,lat:48.5734,lon:7.7521,streamUrl:"",sourceUrl:"https://www.stuttgart.de/tourismus/stadtportraet/stuttgarter-webcams",feedTitle:"",feedUpdated:0},
{id:"fra",name:"FRANKFURT CTR",distanceKm:145,lat:50.1109,lon:8.6821,streamUrl:"",sourceUrl:"https://verkehr.autobahn.de/o/autobahn/A5/services/webcam",feedTitle:"",feedUpdated:0},
{id:"bad",name:"BADEN-BADEN CTR",distanceKm:50,lat:48.7621,lon:8.2400,streamUrl:"",sourceUrl:"https://verkehr.autobahn.de/o/autobahn/A5/services/webcam",feedTitle:"",feedUpdated:0}
];
let cameraOffset=0;let cameraModalItem=null;
const cameraGrid=document.getElementById("camera-grid");
const cameraModal=document.createElement("div");cameraModal.className="camera-modal";cameraModal.id="camera-modal";cameraModal.innerHTML='<div class="camera-modal-dialog" role="dialog" aria-modal="true" aria-label="Regional camera"><div class="camera-modal-head"><strong id="camera-modal-title">REGIONAL CAMERA</strong><button type="button" id="close-camera">CLOSE CAM ✕</button></div><div class="camera-modal-screen" id="camera-modal-screen"></div></div>';document.body.appendChild(cameraModal);
function cameraTimestamp(){return new Date().toISOString().replace("T"," ").slice(0,19)+" UTC"}
const cameraArchiveCache=new Map();
function cameraArchiveQuery(item){const n=item.name.toLowerCase();if(n.includes("strasbourg"))return '"Strasbourg" city';if(n.includes("frankfurt"))return '"Frankfurt" traffic';if(n.includes("baden-baden"))return '"Baden-Baden" city';if(n.includes("stuttgart"))return '"Stuttgart" traffic';if(n.includes("karlsruhe"))return '"Karlsruhe" city';return '"Germany" autobahn traffic';}
async function resolveCameraArchive(item){const key=item.id;if(cameraArchiveCache.has(key))return cameraArchiveCache.get(key);const task=(async()=>{const q=cameraArchiveQuery(item);const api="https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrsearch="+encodeURIComponent("filetype:video "+q)+"&gsrlimit=12&prop=imageinfo&iiprop=url|timestamp|mime";try{const data=await req(api,12000);const pages=Object.values(data.query?.pages||{});const candidates=pages.map(p=>({title:p.title,info:p.imageinfo?.[0]})).filter(x=>x.info?.url&&/^video\//i.test(x.info.mime||"")&&/\.(mp4|webm|ogv)(?:$|\?)/i.test(x.info.url)).sort((a,b)=>String(b.info.timestamp||"").localeCompare(String(a.info.timestamp||"")));return candidates[0]||null}catch{return null}})();cameraArchiveCache.set(key,task);return task;}
function showCameraArchive(item,container,no){resolveCameraArchive(item).then(asset=>{if(!container.isConnected||!container.contains(no))return;if(!asset){startCameraAmbient(container,no,item);return;}const video=document.createElement("video");video.className="camera-archive-video";video.src=asset.info.url;video.autoplay=true;video.muted=true;video.loop=true;video.playsInline=true;video.controls=true;video.preload="metadata";video.setAttribute("aria-label",item.name+" archived video, not live");video.addEventListener("playing",()=>{no.textContent="ARCHIVE VIDEO · NOT LIVE";no.classList.add("archive-label");},{once:true});video.addEventListener("error",()=>{video.remove();startCameraAmbient(container,no,item);});container.insertBefore(video,no);video.play().catch(()=>{startCameraAmbient(container,no,item);});}).catch(()=>{if(no.isConnected)startCameraAmbient(container,no,item);});}
function startCameraAmbient(container,no,item){
if(!container.isConnected||!no.isConnected)return;no.remove();if(container.querySelector(".camera-ambient"))return;
const canvas=document.createElement("canvas");canvas.className="camera-ambient";canvas.setAttribute("aria-label",item.name+" simulated camera fallback");canvas.setAttribute("role","img");
const ctx=canvas.getContext("2d");if(!ctx)return;container.insertBefore(canvas,container.firstChild);let w=1,h=1,d=1,t=0,last=0;
const resize=()=>{const r=container.getBoundingClientRect();d=Math.min(window.devicePixelRatio||1,1.5);w=Math.max(1,Math.floor(r.width*d));h=Math.max(1,Math.floor(r.height*d));canvas.width=w;canvas.height=h;};resize();
const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;observer?.observe(container);
const draw=now=>{if(!canvas.isConnected){observer?.disconnect();return;}if(now-last<40){requestAnimationFrame(draw);return;}last=now;t+=.025;ctx.fillStyle="#070707";ctx.fillRect(0,0,w,h);const hz=h*.43;ctx.fillStyle="#141414";ctx.fillRect(0,0,w,hz);
for(let i=0;i<9;i++){const bw=w*(.035+(i%3)*.018),x=((i*w/7+Math.sin(t+i)*w*.012)%(w+bw))-bw,bh=h*(.12+(i%4)*.055);ctx.fillStyle=i%2?"#222":"#303030";ctx.fillRect(x,hz-bh,bw,bh);for(let y=hz-bh+3*d;y<hz-3*d;y+=7*d)for(let xx=x+3*d;xx<x+bw-2*d;xx+=6*d){ctx.fillStyle=(Math.floor(xx+y+i)%4===0)?"#aaa":"#454545";ctx.fillRect(xx,y,2*d,2*d);}}
ctx.fillStyle="#252525";ctx.beginPath();ctx.moveTo(w*.36,hz);ctx.lineTo(w*.64,hz);ctx.lineTo(w*1.08,h);ctx.lineTo(-w*.08,h);ctx.closePath();ctx.fill();ctx.strokeStyle="#666";ctx.lineWidth=Math.max(1,d);ctx.setLineDash([h*.035,h*.03]);ctx.beginPath();ctx.moveTo(w*.5,hz);ctx.lineTo(w*.5,h);ctx.stroke();ctx.setLineDash([]);
for(let i=0;i<7;i++){const p=((t*.12+i/7)%1),y=hz+(h-hz)*p*p,x=w*.5+Math.sin(t*.5+i)*w*.23*p,cw=(2+8*p)*d,ch=(3+10*p)*d;ctx.fillStyle=i%2?"#bdbdbd":"#666";ctx.fillRect(x-cw/2,y-ch/2,cw,ch);ctx.fillStyle="#ddd";ctx.fillRect(x-cw*.25,y-ch*.35,cw*.5,Math.max(1,ch*.2));}
ctx.fillStyle="#ffffff0d";for(let y=0;y<h;y+=4*d)ctx.fillRect(0,y,w,Math.max(1,d*.5));ctx.strokeStyle="#777";ctx.strokeRect(.5,.5,w-1,h-1);requestAnimationFrame(draw);};requestAnimationFrame(draw);
}
function renderCameraMedia(item,container,large=false){container.replaceChildren();const no=document.createElement("div");no.className="camera-no-signal";no.textContent="[ SIGNAL OFFLINE // RETRYING... ]";container.appendChild(no);const url=item.streamUrl;if(!url){showCameraArchive(item,container,no);return;}if(/\.m3u8(?:\?|$)/i.test(url)){showCameraArchive(item,container,no);return;}let media;if(/\.(mp4|webm|ogv)(?:\?|$)/i.test(url)){media=document.createElement("video");media.autoplay=true;media.muted=true;media.loop=true;media.playsInline=true;media.controls=large;media.preload="metadata";media.src=url;media.addEventListener("playing",()=>no.remove(),{once:true});media.addEventListener("error",()=>{media.remove();no.textContent="[ SIGNAL OFFLINE // RETRYING... ]";showCameraArchive(item,container,no);},{once:true});container.insertBefore(media,no);media.play().catch(()=>{});return;}media=document.createElement("img");media.alt=item.name+" current traffic camera frame";media.referrerPolicy="no-referrer";media.src=url+(url.includes("?")?"&":"?")+"t="+Date.now();media.onload=()=>no.remove();media.onerror=()=>{media.remove();no.textContent="[ SIGNAL OFFLINE // RETRYING... ]";showCameraArchive(item,container,no);};container.insertBefore(media,no);}
function openCamera(item){cameraModalItem=item;document.getElementById("camera-modal-title").textContent=item.name+" · "+item.distanceKm+" KM";const screen=document.getElementById("camera-modal-screen");renderCameraMedia(item,screen,true);cameraModal.classList.add("is-open")}
function closeCamera(){cameraModal.classList.remove("is-open");document.getElementById("camera-modal-screen").replaceChildren();cameraModalItem=null}
async function loadNasaArchiveFallback(){const wrap=document.querySelector(".video-wrap"),iframe=document.getElementById("nasa-video"),fallback=document.getElementById("video-fallback"),archive=document.getElementById("nasa-archive-video"),label=document.getElementById("nasa-archive-label"),badge=document.getElementById("nasa-live-badge"),ambient=document.getElementById("nasa-ambient-canvas");if(!wrap||!archive||archive.dataset.loading==="1")return;archive.dataset.loading="1";fallback.hidden=false;fallback.querySelector(".medium").textContent="[ SIGNAL OFFLINE ]";fallback.querySelector("#connect-nasa-stream").textContent="RETRY CONNECTION ↻";badge.textContent="[ ARCHIVE / AMBIENT MODE ]";try{const data=await req("https://images-api.nasa.gov/search?q="+encodeURIComponent("International Space Station Earth from space")+"&media_type=video&page_size=30",15000);const items=(data.collection?.items||[]).filter(x=>x.href).sort((a,b)=>String(b.data?.[0]?.date_created||"").localeCompare(String(a.data?.[0]?.date_created||"")));for(const item of items.slice(0,15)){try{const assets=await req(item.href,10000);if(!Array.isArray(assets))continue;const urls=assets.filter(u=>typeof u==="string"&&/\.mp4(?:\?|$)/i.test(u)).sort((a,b)=>(/\~small\.mp4/i.test(a)?-1:0)-(/\~small\.mp4/i.test(b)?-1:0));for(const src of urls.slice(0,2)){archive.src=src;archive.hidden=false;archive.loop=true;archive.muted=true;archive.controls=true;archive.playsInline=true;archive.preload="metadata";const mv=document.getElementById("iss-modal-fallback-video");mv.src=src;mv.muted=true;mv.loop=true;mv.playsInline=true;mv.autoplay=true;label.textContent="ARCHIVE VIDEO · NOT LIVE";badge.textContent="[ ARCHIVE VIDEO // ACTIVE ]";try{await Promise.race([new Promise((resolve,reject)=>{archive.addEventListener("playing",resolve,{once:true});archive.addEventListener("error",()=>reject(Error("archive media error")),{once:true});archive.play().catch(reject)}),new Promise((_,reject)=>setTimeout(()=>reject(Error("archive timeout")),12000))]);iframe.hidden=true;fallback.hidden=true;const issModal=document.getElementById("iss-live-modal");if(issModal.classList.contains("is-open")){document.getElementById("iss-modal-live-player").hidden=true;const modalVideo=document.getElementById("iss-modal-fallback-video");modalVideo.hidden=false;modalVideo.play().catch(()=>{});}return}catch{archive.pause();archive.removeAttribute("src");archive.load();archive.hidden=true;}}}catch{continue}}label.textContent="AMBIENT MODE · NOT LIVE";badge.textContent="[ AMBIENT FALLBACK // ACTIVE ]";iframe.hidden=true;fallback.hidden=true;ambient.hidden=false;startNasaAmbient(); }catch{label.textContent="AMBIENT MODE · NOT LIVE";badge.textContent="[ AMBIENT FALLBACK // ACTIVE ]";iframe.hidden=true;fallback.hidden=true;ambient.hidden=false;startNasaAmbient();}finally{archive.dataset.loading="0";}}
function startNasaAmbient(){const canvas=document.getElementById("nasa-ambient-canvas");if(!canvas||canvas.dataset.running==="1")return;canvas.dataset.running="1";const ctx=canvas.getContext("2d");if(!ctx)return;let w=0,h=0,stars=[];const resize=()=>{const r=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);w=Math.max(1,Math.floor(r.width*dpr));h=Math.max(1,Math.floor(r.height*dpr));canvas.width=w;canvas.height=h;stars=Array.from({length:Math.min(180,Math.floor(w*h/5000))},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.2+.2,a:Math.random()*.6+.2,v:Math.random()*.25+.05}));};resize();window.addEventListener("resize",resize,{passive:true});const draw=()=>{if(canvas.hidden)return;ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);for(const st of stars){st.y+=st.v;if(st.y>h){st.y=0;st.x=Math.random()*w;}ctx.globalAlpha=st.a;ctx.fillStyle="#ddd";ctx.fillRect(st.x,st.y,st.r,st.r);}ctx.globalAlpha=1;const radius=Math.min(w,h)*.24;const cx=w*.5,cy=h*.54;const g=ctx.createRadialGradient(cx-radius*.3,cy-radius*.4,radius*.1,cx,cy,radius*1.7);g.addColorStop(0,"#222");g.addColorStop(.65,"#090909");g.addColorStop(1,"#000");ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#353535";ctx.lineWidth=Math.max(1,w/900);ctx.beginPath();ctx.ellipse(cx,cy,radius,radius*.42,0,0,Math.PI*2);ctx.ellipse(cx,cy,radius*.52,radius,0,0,Math.PI*2);ctx.moveTo(cx-radius,cy);ctx.lineTo(cx+radius,cy);ctx.moveTo(cx,cy-radius);ctx.lineTo(cx,cy+radius);ctx.stroke();requestAnimationFrame(draw);};requestAnimationFrame(draw);}
function retryNasaLive(){const iframe=document.getElementById("nasa-video"),fallback=document.getElementById("video-fallback"),archive=document.getElementById("nasa-archive-video"),ambient=document.getElementById("nasa-ambient-canvas"),badge=document.getElementById("nasa-live-badge");archive.pause();archive.hidden=true;archive.removeAttribute("src");archive.load();ambient.hidden=true;iframe.hidden=false;badge.textContent="[ YOUTUBE LIVE // CONNECTING ]";fallback.hidden=false;fallback.querySelector(".medium").textContent="[ WAITING FOR PLAYER CONFIRMATION ]";clearTimeout(videoTimer);window.nasaYtPlaying=false;if(window.nasaYtPlayer&&window.YT){try{window.nasaYtPlayer.loadVideoById("M3HKLzjvKPc");window.nasaYtPlayer.playVideo()}catch{iframe.src="https://www.youtube-nocookie.com/embed/M3HKLzjvKPc?autoplay=1&mute=1&controls=1&rel=0&playsinline=1&enablejsapi=1&origin="+encodeURIComponent(location.origin)}}else{iframe.src="https://www.youtube-nocookie.com/embed/M3HKLzjvKPc?autoplay=1&mute=1&controls=1&rel=0&playsinline=1&enablejsapi=1&origin="+encodeURIComponent(location.origin);loadYouTubePlayerApi()}videoTimer=setTimeout(()=>{if(!window.nasaYtPlaying)loadNasaArchiveFallback()},18000);}
document.getElementById("connect-nasa-stream").addEventListener("click",retryNasaLive);
document.getElementById("close-camera").addEventListener("click",closeCamera);cameraModal.addEventListener("click",e=>{if(e.target===cameraModal)closeCamera()});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCamera()});
function renderCameraGrid(){if(!cameraGrid)return;cameraGrid.replaceChildren();const active=Array.from({length:4},(_,i)=>CAMERA_POOL[(cameraOffset+i)%CAMERA_POOL.length]);active.forEach((item,i)=>{const cell=document.createElement("button");cell.type="button";cell.className="camera-cell";cell.setAttribute("aria-label","Open "+item.name);renderCameraMedia(item,cell);const overlay=document.createElement("div");overlay.className="camera-overlay";const title=document.createElement("strong");title.textContent=item.name+" · "+item.distanceKm+" KM";const coords=document.createElement("span");coords.className="camera-coordinates";coords.textContent=item.lat.toFixed(4)+"°, "+item.lon.toFixed(4)+"°";const stamp=document.createElement("span");stamp.className="camera-timestamp";stamp.textContent=item.feedUpdated?new Date(item.feedUpdated).toISOString().slice(11,19)+" UTC":cameraTimestamp();const state=document.createElement("span");state.className="camera-state";state.textContent=item.streamUrl?"CAM IMAGE · "+String(i+1).padStart(2,"0"):"AUTO FEED · "+String(i+1).padStart(2,"0");overlay.append(title,coords);cell.append(overlay,stamp,state);cell.addEventListener("click",()=>openCamera(item));cameraGrid.appendChild(cell)})}
function geoDistanceKm(a,b){const rad=n=>n*Math.PI/180;const dLat=rad(a.lat-b.lat),dLon=rad(a.lon-b.lon),x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
async function loadRegionalCameraFeeds(){const roads=["A8","A5","A81","A6"];const results=await Promise.allSettled(roads.map(road=>req("https://verkehr.autobahn.de/o/autobahn/"+road+"/services/webcam",12000)));const feeds=[];results.forEach((r,index)=>{if(r.status==="fulfilled")for(const cam of (r.value.webcam||[])){const lat=Number(cam.coordinate?.lat),lon=Number(cam.coordinate?.long);if(Number.isFinite(lat)&&Number.isFinite(lon)&&cam.imageurl&&/^https:\/\//i.test(cam.imageurl))feeds.push({...cam,lat,lon,road:roads[index]})}});if(!feeds.length)return;const used=new Set();for(const target of CAMERA_POOL.slice(0,4)){const choices=feeds.map(cam=>({...cam,distance:geoDistanceKm(target,cam)})).filter(cam=>cam.distance<=300&&!used.has(cam.identifier||cam.imageurl)).sort((a,b)=>a.distance-b.distance);const best=choices[0];if(!best)continue;used.add(best.identifier||best.imageurl);target.streamUrl=best.imageurl;target.sourceUrl=best.linkurl||("https://verkehr.autobahn.de/o/autobahn/"+best.road+"/services/webcam");target.feedTitle=String(best.title||best.subtitle||best.road).replace(/\s+/g," ").slice(0,64);target.feedUpdated=Date.now();target.distanceKm=Math.round(geoDistanceKm(target,best));}renderCameraGrid();}
document.getElementById("rotate-cams").addEventListener("click",()=>{cameraOffset=(cameraOffset+1+Math.floor(Math.random()*(CAMERA_POOL.length-1)))%CAMERA_POOL.length;renderCameraGrid()});renderCameraGrid();loadRegionalCameraFeeds();setInterval(loadRegionalCameraFeeds,60000);setInterval(renderCameraGrid,60000);

document.querySelectorAll("[data-help-term]").forEach(btn=>btn.addEventListener("click",()=>showTerm(btn.dataset.helpTerm,btn)));
$("term-close").addEventListener("click",()=>{$("term-popover").hidden=true});
const helpEntries=[
["01 / EARTH / LIVE STATUS","UTC clock, local weather snapshot and recent M2.5+ earthquake count. Video backgrounds may fall back to animated graphics if a public clip cannot be loaded."],
["02 / DEEP SPACE / STAR FIELD","Atmospheric star-field visualization. It is explicitly a visualization, not a scientific star catalog."],
["03 / WEATHER / ATMOSPHERE","Open-Meteo weather data for Pforzheim. Forecast/model data may differ from a nearby physical weather station."],
["04 / ORBIT / ISS TELEMETRY","ISS altitude, coordinates and estimated orbital period. Position is a public API sample; use [?] for NORAD."],
["05 / NASA / ISS LIVE VIDEO","Embedded video may be blocked or unavailable. Use the official video links in the panel when playback fails."],
["06 / GLOBAL EARTH MONITOR","USGS earthquake feed, NASA EONET events and NOAA space-weather data. Switch tabs for SPACE, FIRES and AQI."],
["07 / MOON / CELESTIAL CYCLE","Calculated lunar phase, illumination and approximate Earth–Moon/Earth–Sun distances."],
["08 / SATELLITE NETWORK","CelesTrak station-group catalog. CACHED or REFERENCE BASELINE means the count is not a confirmed live catalog result."],
["09 / SPACE WEATHER","NOAA SWPC geomagnetic Kp, solar-wind speed and GOES X-ray flux. Public feeds may occasionally be delayed."],
["10 / WILDFIRES","NASA EONET open wildfire events and coordinates. EONET does not provide VIIRS/MODIS brightness temperature."],
["11 / AIR QUALITY","Open-Meteo modelled US AQI, PM2.5, PM10 and NO₂ estimates for the configured location."],
["REFRESH","Reload public data sources. Unavailable feeds may be reported as partial data."],
["A− / A+","Adjust interface text size."],
["LANDSCAPE","Requests fullscreen/landscape where the browser and device allow it."],

];
$("help-content").innerHTML=helpEntries.map(([title,body])=>'<div class="help-entry"><strong>'+title+'</strong><p>'+body+'</p></div>').join("");
$("help-open").addEventListener("click",()=>$("operator-help").showModal());
$("help-close").addEventListener("click",()=>$("operator-help").close());
$("operator-help").addEventListener("click",e=>{if(e.target===$("operator-help"))$("operator-help").close()});
const tourSteps=[
{selector:".panel-globe",title:"01 / EARTH STATUS",copy:"Start here: UTC clock, local conditions and a quick view of Earth-related indicators."},
{selector:".panel-stars",title:"02 / DEEP SPACE",copy:"This is a visual star field, not a scientific star catalog. Video playback may fall back to procedural animation."},
{selector:".panel-orbit",title:"04 / ISS TELEMETRY",copy:"Review the ISS altitude and coordinates. NORAD 25544 is the station's catalog identifier."},
];
let tourIndex=0;
function clearTourTarget(){document.querySelectorAll(".onboarding-target").forEach(el=>el.classList.remove("onboarding-target"))}
function renderTour(){clearTourTarget();const step=tourSteps[tourIndex];const target=document.querySelector(step.selector);if(target){target.classList.add("onboarding-target");target.scrollIntoView?.({block:"nearest",inline:"nearest",behavior:"smooth"})}set("intro-title","OPERATOR INITIALIZATION · "+step.title);set("intro-copy",step.copy);set("intro-progress","STEP "+String(tourIndex+1).padStart(2,"0")+" / "+String(tourSteps.length).padStart(2,"0"));$("intro-next").textContent=tourIndex===tourSteps.length-1?"FINISH ✓":"NEXT ↗"}
function startTour(){tourIndex=0;$("operator-help").close();$("intro-overlay").hidden=false;renderTour()}
function finishTour(){clearTourTarget();$("intro-overlay").hidden=true;try{localStorage.setItem("hasSeenIntro","1")}catch{}}
$("intro-next").addEventListener("click",()=>{if(tourIndex>=tourSteps.length-1){finishTour();return}tourIndex++;renderTour()});
$("intro-skip").addEventListener("click",finishTour);
$("help-start-tour").addEventListener("click",startTour);
if(!localStorage.getItem("hasSeenIntro"))setTimeout(startTour,450);

function openIssModal(){const m=document.getElementById("iss-live-modal"),p=document.getElementById("iss-modal-live-player"),v=document.getElementById("iss-modal-fallback-video");m.classList.add("is-open");m.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";v.hidden=true;p.hidden=false;p.src="https://www.youtube-nocookie.com/embed/M3HKLzjvKPc?autoplay=1&mute=1&controls=1&rel=0&playsinline=1&enablejsapi=1&origin="+encodeURIComponent(location.origin);document.getElementById("iss-modal-close").focus();}
function closeIssModal(){const m=document.getElementById("iss-live-modal"),p=document.getElementById("iss-modal-live-player"),v=document.getElementById("iss-modal-fallback-video");m.classList.remove("is-open");m.setAttribute("aria-hidden","true");p.src="about:blank";v.pause();v.removeAttribute("src");v.load();v.hidden=true;document.body.style.overflow="";}
document.getElementById("iss-modal-close").addEventListener("click",closeIssModal);document.getElementById("iss-live-modal").addEventListener("click",e=>{if(e.target.id==="iss-live-modal")closeIssModal()});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeIssModal()});
document.querySelectorAll("[data-expand]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.expand==="video")openIssModal();else openDetails(b.dataset.expand)}));
$("dialog-close").addEventListener("click",()=>$("details").close());$("dialog-refresh").addEventListener("click",()=>refreshAll());
$("refresh").addEventListener("click",()=>refreshAll());
$("font-down").addEventListener("click",()=>{state.font=Math.max(.85,state.font-.1);document.documentElement.style.fontSize=(12*state.font)+"px";});
$("font-up").addEventListener("click",()=>{state.font=Math.min(1.4,state.font+.1);document.documentElement.style.fontSize=(12*state.font)+"px";});
$("landscape").addEventListener("click",async()=>{try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock("landscape");$("landscape").textContent="LANDSCAPE";}catch{$("landscape").textContent="ROTATE DEVICE";}});
$("details").addEventListener("click",e=>{if(e.target===$("details"))$("details").close()});
const video=$("nasa-video");let videoTimer=setTimeout(loadNasaArchiveFallback,18000);window.nasaYtPlaying=false;window.nasaYtPlayer=null;let ytApiRequested=false;function loadYouTubePlayerApi(){if(ytApiRequested||window.YT?.Player)return;ytApiRequested=true;const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";s.async=true;s.onerror=()=>{ytApiRequested=false};document.head.appendChild(s)}window.onYouTubeIframeAPIReady=function(){const iframe=document.getElementById("nasa-video");if(!iframe||!window.YT?.Player)return;try{window.nasaYtPlayer=new YT.Player(iframe,{events:{onReady:e=>{try{e.target.mute();e.target.playVideo()}catch{}},onStateChange:e=>{const badge=document.getElementById("nasa-live-badge"),fallback=document.getElementById("video-fallback"),archive=document.getElementById("nasa-archive-video"),ambient=document.getElementById("nasa-ambient-canvas");if(e.data===YT.PlayerState.PLAYING){window.nasaYtPlaying=true;clearTimeout(videoTimer);fallback.hidden=true;archive.hidden=true;ambient.hidden=true;badge.textContent="[ YOUTUBE LIVE // PLAYING ]";document.getElementById("iss-modal-badge").textContent="[ ISS LIVE STREAM // ACTIVE ]";document.getElementById("iss-modal-fallback-video").hidden=true;}else if(e.data===YT.PlayerState.BUFFERING){badge.textContent="[ YOUTUBE LIVE // BUFFERING ]"}else if(e.data===YT.PlayerState.ENDED){window.nasaYtPlaying=false;loadNasaArchiveFallback()}},onError:e=>{window.nasaYtPlaying=false;document.getElementById("nasa-live-badge").textContent="[ YOUTUBE EMBED ERROR "+e.data+" ]";loadNasaArchiveFallback()}}})}catch{}};loadYouTubePlayerApi();
document.addEventListener("visibilitychange",()=>{if(!document.hidden)astronomy()});
window.addEventListener("online",()=>{set("net-status","● ONLINE · RETRYING");refreshAll()});window.addEventListener("offline",updateStatus);
astronomy();drawStars();resolveNASAClip("earth rotation", $("earth-ambient-video"), document.querySelector(".earth-video-visual"), "earth-video-label");resolveNASAClip("starfield", $("space-ambient-video"), document.querySelector(".space-video-visual"), "sky-label");refreshAll();setInterval(astronomy,1000);setInterval(refreshAll,300000);
})();

/* All panel headings are drill-down targets; the expand control remains available. */
document.querySelectorAll(".panel-head h2").forEach(heading=>{
 heading.tabIndex=0;
 heading.setAttribute("role","button");
 heading.setAttribute("aria-label","Open details: "+heading.textContent.trim());
 const open=()=>{const panel=heading.closest("[data-panel]");if(panel)openDetails(panel.dataset.panel);};
 heading.addEventListener("click",open);
 heading.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open();}});
});

/* AIRSPACE RADAR — OpenSky public state vectors with deterministic regional fallback. */
(()=>{
 const CENTER={lat:48.8907,lon:8.6987},RADIUS_KM=120;
 const $air=id=>document.getElementById(id);
 const canvas=$air("air-radar-canvas");
 if(!canvas)return;
 const ctx=canvas.getContext("2d");
 let aircraft=[],usingFallback=false,lastFetch=0,fetching=false,resizeObserver;
 const names=["DLH4KM","EWG7PX","CFG2LA","SWR3TN","BCS8MD","AUA6RJ","TUI5VP","RYR1QZ"];
 const toRad=v=>v*Math.PI/180;
 function distanceKm(a,b){const p1=toRad(a.lat),p2=toRad(b.lat),dp=p2-p1,dl=toRad(b.lon-a.lon);const q=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 6371*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));}
 function bearingDeg(a,b){const p1=toRad(a.lat),p2=toRad(b.lat),dl=toRad(b.lon-a.lon);return (Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))*180/Math.PI+360)%360;}
 function fmtAlt(m){return m==null?"ALT —":Math.round(m/0.3048).toLocaleString()+" FT";}
 function fmtSpeed(ms){return ms==null?"GS —":Math.round(ms*1.94384)+" KT";}
 function fallbackTraffic(){
  const now=Date.now()/1000;
  return names.slice(0,7).map((callsign,i)=>{
   const phase=now/900+i*1.71,range=18+(i*19)%88,angle=phase% (Math.PI*2);
   const lat=CENTER.lat+Math.cos(angle)*range/111,lon=CENTER.lon+Math.sin(angle)*range/(111*Math.cos(toRad(CENTER.lat)));
   return {icao24:"sim"+i,callsign,lat,lon,altitude:6500+(i*1370)%6000,velocity:165+(i*21)%105,heading:(angle*180/Math.PI+90)%360,onGround:false,simulated:true};
  });
 }
 function draw(){
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
  const cx=w/2,cy=h/2,r=Math.max(12,Math.min(w,h)*.43);
  ctx.strokeStyle="#333";ctx.lineWidth=1;
  for(const f of [.33,.66,1]){ctx.beginPath();ctx.arc(cx,cy,r*f,0,Math.PI*2);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();
  ctx.fillStyle="#777";ctx.font="9px monospace";ctx.fillText("N",cx-3,cy-r-4);ctx.fillText("120 KM",cx+r-35,cy+12);
  const sweep=(Date.now()/500)% (Math.PI*2);
  ctx.strokeStyle="#777";ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.sin(sweep)*r,cy-Math.cos(sweep)*r);ctx.stroke();
  aircraft.forEach(a=>{
   const range=distanceKm(CENTER,a);if(range>RADIUS_KM)return;
   const angle=toRad(bearingDeg(CENTER,a)),rr=(range/RADIUS_KM)*r,x=cx+Math.sin(angle)*rr,y=cy-Math.cos(angle)*rr;
   ctx.fillStyle=a.simulated?"#777":"#fff";ctx.fillRect(x-2,y-2,4,4);
  });
  ctx.fillStyle="#aaa";ctx.font="9px monospace";ctx.fillText(usingFallback?"SIMULATED TRAFFIC":"OPENSKY STATE VECTORS",6,h-7);
 }
 function renderList(){
  $air("air-count").textContent=String(aircraft.length).padStart(2,"0");
  const nearest=aircraft.filter(a=>Number.isFinite(a.lat)&&Number.isFinite(a.lon)).map(a=>({...a,distance:distanceKm(CENTER,a)})).sort((a,b)=>a.distance-b.distance)[0];
  if(nearest){$air("air-nearest").textContent=(nearest.callsign||nearest.icao24||"UNKNOWN").trim().slice(0,12);$air("air-nearest-meta").textContent=Math.round(nearest.distance)+" KM · "+fmtAlt(nearest.altitude)+" · "+fmtSpeed(nearest.velocity);}
  else{$air("air-nearest").textContent="NO CONTACT";$air("air-nearest-meta").textContent="NO AIRCRAFT IN REGION";}
  $air("air-source-status").textContent=usingFallback?"SIMULATION / API UNAVAILABLE":"OPENSKY / PUBLIC DATA";
  $air("air-updated").textContent=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  draw();
 }
 function renderTable(){
  const table=document.createElement("table");table.className="aircraft-table";
  table.innerHTML="<thead><tr><th>CALLSIGN / ICAO</th><th>RANGE</th><th>ALTITUDE</th><th>GROUND SPEED</th><th>HEADING</th><th>LAT / LON</th><th>MODE</th></tr></thead>";
  const tbody=document.createElement("tbody");
  aircraft.map(a=>({...a,distance:distanceKm(CENTER,a)})).sort((a,b)=>a.distance-b.distance).forEach(a=>{
   const tr=document.createElement("tr");
   [((a.callsign||"").trim()||a.icao24||"UNKNOWN"),Math.round(a.distance)+" km",fmtAlt(a.altitude),fmtSpeed(a.velocity),a.heading==null?"—":Math.round(a.heading)+"°",a.lat.toFixed(3)+" / "+a.lon.toFixed(3),a.simulated?"SIM":"LIVE"].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});
   tbody.append(tr);
  });
  table.append(tbody);return table;
 }
 function renderDrilldown(){
  const body=$air("dialog-body");body.replaceChildren();
  const note=document.createElement("p");note.className="muted";note.textContent="AIRSPACE RADAR · CENTER PFORZHEIM, DE · 120 KM RADIUS · "+(usingFallback?"SIMULATED FALLBACK — NOT LIVE FLIGHT DATA":"PUBLIC OPENSKY STATE VECTORS");body.append(note);
  const wrap=document.createElement("div");wrap.className="air-drill-grid";
  const plot=document.createElement("div");plot.className="air-drill-plot";const large=document.createElement("canvas");large.id="air-radar-large";large.setAttribute("aria-label","Expanded airspace radar");plot.append(large);
  const list=document.createElement("div");list.className="air-drill-table-wrap";list.append(renderTable());wrap.append(plot,list);body.append(wrap);
  const bigCtx=large.getContext("2d");
  const drawLarge=()=>{
   const r=large.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);if(!r.width||!r.height)return;
   large.width=Math.round(r.width*dpr);large.height=Math.round(r.height*dpr);bigCtx.setTransform(dpr,0,0,dpr,0,0);
   bigCtx.fillStyle="#000";bigCtx.fillRect(0,0,r.width,r.height);const cx=r.width/2,cy=r.height/2,rad=Math.max(10,Math.min(r.width,r.height)*.42);
   bigCtx.strokeStyle="#333";for(const f of [.25,.5,.75,1]){bigCtx.beginPath();bigCtx.arc(cx,cy,rad*f,0,Math.PI*2);bigCtx.stroke();}
   bigCtx.beginPath();bigCtx.moveTo(cx-rad,cy);bigCtx.lineTo(cx+rad,cy);bigCtx.moveTo(cx,cy-rad);bigCtx.lineTo(cx,cy+rad);bigCtx.stroke();
   aircraft.forEach(a=>{const km=distanceKm(CENTER,a);if(km>RADIUS_KM)return;const b=toRad(bearingDeg(CENTER,a)),rr=km/RADIUS_KM*rad;bigCtx.fillStyle=a.simulated?"#888":"#fff";bigCtx.fillRect(cx+Math.sin(b)*rr-3,cy-Math.cos(b)*rr-3,6,6);});
  };
  requestAnimationFrame(drawLarge);
 }
 async function refreshAirspaceRadar(){
  if(fetching||Date.now()-lastFetch<25000)return;fetching=true;lastFetch=Date.now();
  const bbox={lamin:CENTER.lat-RADIUS_KM/111,lamax:CENTER.lat+RADIUS_KM/111,lomin:CENTER.lon-RADIUS_KM/(111*Math.cos(toRad(CENTER.lat))),lomax:CENTER.lon+RADIUS_KM/(111*Math.cos(toRad(CENTER.lat)))};
  try{
   const qs=new URLSearchParams(Object.entries(bbox).map(([k,v])=>[k,v.toFixed(3)]));
   const response=await fetch("https://opensky-network.org/api/states/all?"+qs,{headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(9000)});
   if(!response.ok)throw new Error("OpenSky HTTP "+response.status);
   const data=await response.json();
   if(!Array.isArray(data.states))throw new Error("OpenSky state vector response missing");
   aircraft=data.states.map(s=>({icao24:s[0],callsign:String(s[1]||"").trim(),lon:s[5],lat:s[6],altitude:s[7]??s[13],onGround:s[8],velocity:s[9],heading:s[10],simulated:false})).filter(a=>Number.isFinite(a.lat)&&Number.isFinite(a.lon)&&distanceKm(CENTER,a)<=RADIUS_KM);
   usingFallback=false;
  }catch(error){aircraft=fallbackTraffic();usingFallback=true;}
  finally{fetching=false;renderList();const dlg=$air("details");if(dlg?.open&&dlg.dataset.panel==="radar")renderDrilldown();}
 }
 const observer=typeof ResizeObserver==="function"?new ResizeObserver(draw):null;observer?.observe(canvas);
 document.querySelectorAll('[data-expand="radar"]').forEach(b=>b.addEventListener("click",()=>openDetails("radar")));
 const heading=document.querySelector('[data-panel="radar"] .panel-head h2');
 if(heading){heading.tabIndex=0;heading.setAttribute("role","button");heading.addEventListener("click",()=>openDetails("radar"));heading.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openDetails("radar");}});}
 const originalOpenDetails=window.openDetails;
 // The existing openDetails function is global-scope lexical; wrap through the expand button path.
 document.addEventListener("click",e=>{const b=e.target.closest('[data-expand="radar"]');if(b)setTimeout(renderDrilldown,0);});
 const dialog=$air("details"),close=$air("dialog-close");
 close?.addEventListener("click",()=>{if(dialog?.open&&dialog.dataset.panel==="radar")dialog.close();});
 dialog?.addEventListener("close",()=>{if(dialog.dataset.panel==="radar")dialog.dataset.panel="";});
 // Replace panelDetails lookup via a narrowly scoped wrapper, preserving all existing panel content.
 const priorPanelDetails=panelDetails;
 panelDetails=function(id){if(id==="radar")return "AIRSPACE RADAR · PFORZHEIM · 120 KM RADIUS\nOpenSky public state-vector API; simulation is shown explicitly when the public feed is blocked or unavailable.";return priorPanelDetails(id);};
 const priorOpenDetails=openDetails;
 openDetails=function(id){priorOpenDetails(id);if(id==="radar")renderDrilldown();};
 refreshAirspaceRadar();setInterval(refreshAirspaceRadar,60000);


 // Public-source anomaly terminal: lazy loading, per-source TTL cache, bounded fetches.
 const anomalyState={active:"space",kp:null,alerts:[],updated:null,volcanoes:[],gauges:[],radiation:[],neos:[],launches:[],debris:[],dns:[],errors:{}};
 const anomalyTabs=[...document.querySelectorAll("[data-anomaly-tab]")];
 const anomalyContent=$("anomaly-content");
 const anomalyCache=new Map();
 const anomalyTTL={space:60000,lightning:300000,volcano:300000,cyber:300000,hydro:300000,dns:120000,radiation:300000,neo:600000,launches:300000,debris:900000};
 const safeText=v=>String(v??"—").replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
 const anomalyTime=()=>new Date().toISOString().replace("T"," ").slice(0,16)+" UTC";
 const anomalySources={
  space:{title:"SPACE WEATHER / NOAA SWPC",url:"https://services.swpc.noaa.gov/json/planetary_k_index_1m.json",label:"NOAA SWPC public JSON"},
  lightning:{title:"LIGHTNING / GLOBAL DETECTION",url:"https://www.lightningmaps.org/",label:"LightningMaps live map"},
  volcano:{title:"VOLCANOES / NASA EONET",url:"https://eonet.gsfc.nasa.gov/api/v3/events?status=open",label:"NASA EONET open events"},
  cyber:{title:"CYBER NET / INTERNET DISRUPTIONS",url:"https://radar.cloudflare.com/",label:"Cloudflare Radar public dashboard"},
  hydro:{title:"HYDRO / WATER LEVELS",url:"https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json?waters=true",label:"PEGELONLINE · German Federal Waterways"},
  dns:{title:"DNS // NET",url:"https://root-servers.org/",label:"Root Server Technical Operations Association"},
  radiation:{title:"RADIATION / SAFecast",url:"https://api.safecast.org/measurements.json?limit=20",label:"Safecast open measurements"},
  neo:{title:"NEO / JPL CLOSE APPROACH",url:"https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&date-max=%2B30&dist-max=0.05&diameter=true&fullname=true&sort=date&limit=20",label:"NASA/JPL CNEOS CAD API"},
  launches:{title:"LAUNCHES / LAUNCH LIBRARY 2",url:"https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=list",label:"The Space Devs Launch Library 2"},
  debris:{title:"ORBITAL DEBRIS / CELESTRAK",url:"https://celestrak.org/NORAD/elements/gp.php?NAME=COSMOS%202251%20DEB&FORMAT=JSON",label:"CelesTrak GP/OMM data"}
 };
 async function anomalyFetch(url,timeout=9000){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
  try{const res=await fetch(url,{signal:controller.signal,cache:"no-store",headers:{Accept:"application/json"}});if(!res.ok)throw new Error("HTTP "+res.status);return await res.json();}
  finally{clearTimeout(timer);}
 }
 async function anomalyCached(key,loader,force=false){
  const old=anomalyCache.get(key),ttl=anomalyTTL[key]||300000;
  if(!force&&old&&Date.now()-old.at<ttl)return old.value;
  if(old?.promise&&!force)return old.promise;
  const promise=Promise.resolve().then(loader).then(value=>{anomalyCache.set(key,{at:Date.now(),value});delete anomalyState.errors[key];return value;}).catch(error=>{anomalyState.errors[key]=error?.message||"feed unavailable";if(old?.value!==undefined)return old.value;throw error;});
  anomalyCache.set(key,{at:old?.at||0,value:old?.value,promise});
  try{return await promise;}finally{const current=anomalyCache.get(key);if(current?.promise===promise)delete current.promise;}
 }
 function pushCriticalAlert(source,message,url){
  const key=source+"|"+message;if(anomalyState.alerts.some(a=>a.key===key))return;
  anomalyState.alerts.unshift({key,source,message,url,at:Date.now()});anomalyState.alerts=anomalyState.alerts.slice(0,12);
 }
 function setAnomalyFlag(key,on){const node=document.querySelector('[data-anomaly-alert="'+key+'"]');if(node)node.hidden=!on;}
 function renderCriticalTicker(){
  const textNode=$("critical-ticker-text"),timeNode=$("critical-ticker-time");if(!textNode)return;
  const alert=anomalyState.alerts[0];
  textNode.textContent=alert?"⚠ "+alert.source+" · "+alert.message:"NO ACTIVE THRESHOLD ALERTS · LIVE MODULES LOAD ON DEMAND";
  timeNode.textContent=anomalyState.updated?new Date(anomalyState.updated).toISOString().slice(11,16)+" UTC":"UTC --:--";
 }
 function anomalyLink(url,label){return '<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+' ↗</a>';}
 function anomalyList(items,empty){return '<div class="anomaly-list"><ul>'+(items.length?items.join(""):"<li>"+empty+"</li>")+"</ul></div>";}
 function anomalyRender(){
  anomalyTabs.forEach(b=>{const on=b.dataset.anomalyTab===anomalyState.active;b.classList.toggle("is-active",on);b.setAttribute("aria-selected",String(on));});
  const key=anomalyState.active,s=anomalySources[key];let body="";
  const fail=anomalyState.errors[key],stamp=anomalyCache.get(key)?.at;
  const meta='<div class="anomaly-meta">SOURCE: '+safeText(s.label)+' · '+(stamp?new Date(stamp).toISOString().replace("T"," ").slice(0,16)+" UTC":"NO SUCCESSFUL SAMPLE")+(fail?' · LAST ERROR: '+safeText(fail):"")+'</div>';
  if(key==="space"){
   const kp=anomalyState.kp;body='<div class="anomaly-state"><strong>'+s.title+'</strong><span class="'+(kp!==null&&kp>=5?'anomaly-warn':'anomaly-good')+'">KP '+(kp===null?'—':kp.toFixed(1))+' / 9</span><p>'+(kp===null?'Live Kp feed unavailable; retrying.':kp>=5?'Geomagnetic storm threshold reached (Kp ≥ 5).':'No geomagnetic storm threshold detected in latest Kp sample.')+'</p>'+meta+anomalyLink(s.url,"OPEN OFFICIAL FEED")+'</div>';
  }else if(key==="volcano"){
   body='<div class="anomaly-state"><strong>'+s.title+'</strong><span>'+anomalyState.volcanoes.length+' OPEN EVENTS</span><p>Event catalogue, not official volcano alert levels.</p>'+anomalyList(anomalyState.volcanoes.slice(0,5).map(e=>'<li>'+safeText(e.title)+' · '+safeText(e.geometry?.[0]?.date?.slice(0,10)||"date unavailable")+'</li>'),"No open events returned, or feed unavailable.")+meta+anomalyLink(s.url,"OPEN NASA EONET")+'</div>';
  }else if(key==="hydro"){
   body='<div class="anomaly-state"><strong>'+s.title+'</strong><span>'+anomalyState.gauges.length+' STATIONS</span><p>Station metadata only; no water level is shown unless a measurement was fetched.</p>'+anomalyList(anomalyState.gauges.slice(0,5).map(g=>'<li>'+safeText(g.shortname||g.longname||g.uuid)+' · '+safeText(g.water?.shortname||g.water?.longname||"waterway")+'</li>'),"Station list unavailable or no regional matches.")+meta+anomalyLink(s.url,"OPEN PEGELONLINE")+'</div>';
  }else if(key==="lightning"){
   body='<div class="anomaly-state"><strong>'+s.title+'</strong><span class="anomaly-neutral">EXTERNAL LIVE MAP</span><p>No unrestricted stable global strike JSON feed is embedded. Strike counts are not fabricated.</p>'+meta+anomalyLink(s.url,"OPEN LIGHTNING MAP")+'</div>';
  }else if(key==="cyber"){
   body='<div class="anomaly-state"><strong>'+s.title+'</strong><span class="anomaly-neutral">PUBLIC DASHBOARD</span><p>Some Radar API endpoints require credentials. No secret is shipped in this client.</p>'+meta+anomalyLink(s.url,"OPEN CLOUDFLARE RADAR")+'</div>';
  }else if(key==="dns"){
   body='<div class="anomaly-state"><strong>'+s.title+'</strong><span>'+anomalyState.dns.filter(x=>x.ok).length+' / '+anomalyState.dns.length+' DNS RESOLVES</span><p>HTTPS DNS-over-HTTPS checks resolve root-server hostnames. Browser code cannot send ICMP ping or prove root-server service health; elapsed time is client-to-DoH latency, not authoritative server ping.</p>'+anomalyList(anomalyState.dns.map(x=>'<li><b>'+safeText(x.host)+'</b> · '+(x.ok?'RESOLVED':'FAILED')+' · '+(x.ms===null?'—':x.ms+' ms DoH request')+'</li>'),"DNS checks not run yet.")+meta+anomalyLink(s.url,"ROOT SERVER DIRECTORY")+'</div>';
  }else if(key==="radiation"){
   const rows=anomalyState.radiation,peak=rows.reduce((m,x)=>Math.max(m,Number(x.value)||0),0),alert=rows.some(x=>/usv/h|µsv/h|μsv/h/i.test(x.unit||"")&&Number(x.value)>0.5);
   setAnomalyFlag("radiation",alert);
   body='<div class="anomaly-state"><strong>'+s.title+'</strong><span class="'+(alert?'anomaly-warn':'anomaly-neutral')+'">'+(rows.length?rows.length+' RECENT READINGS':'NO READINGS')+'</span><p>'+(alert?'[!] Reading exceeds the dashboard review threshold of 0.5 µSv/h. This is a UI screening threshold, not a public-health or regulatory alarm.':'Safecast crowdsourced readings are not a continuous calibrated global sensor network. Values are shown with original units and timestamps.')+'</p>'+anomalyList(rows.slice(0,6).map(x=>'<li>'+safeText(x.value)+' '+safeText(x.unit)+' · '+safeText(x.captured_at||x.created_at||"timestamp unavailable")+' · '+safeText(x.latitude)+', '+safeText(x.longitude)+'</li>'),"Feed unavailable or no recent measurements.")+meta+anomalyLink(s.url,"OPEN SAFecast API")+'</div>';
  }else if(key==="neo"){
   const rows=anomalyState.neos,critical=rows.filter(x=>Number(x[4])<0.00257);setAnomalyFlag("neo",critical.length>0);
   body='<div class="anomaly-state"><strong>'+s.title+'</strong><span class="'+(critical.length?'anomaly-warn':'anomaly-neutral')+'">'+rows.length+' CLOSE APPROACHES</span><p>'+(critical.length?'[!] At least one listed approach is within one lunar distance (0.00257 AU). This is a proximity flag, not a predicted impact.':'[!] appears only for approaches within one lunar distance. Close approach alone does not mean collision risk.')+'</p>'+anomalyList(rows.slice(0,7).map(x=>'<li class="'+(Number(x[4])<0.00257?'anomaly-warn':'')+'">'+(Number(x[4])<0.00257?'[!] ':'')+safeText(x[13]||x[0])+' · '+safeText(x[3])+' · '+safeText((Number(x[4])*149597870.7).toLocaleString("en-US",{maximumFractionDigits:0}))+' km · '+safeText(x[7])+' km/s</li>'),"No approaches returned or JPL feed unavailable.")+meta+anomalyLink(s.url,"OPEN NASA/JPL CAD API")+'</div>';
  }else if(key==="launches"){
   body='<div class="anomaly-state"><strong>'+s.title+'</strong><span>'+anomalyState.launches.length+' UPCOMING</span>'+anomalyList(anomalyState.launches.slice(0,7).map(x=>'<li><b>'+safeText(x.name)+'</b> · '+safeText(x.net||x.window_start||"T- TBD")+' · '+safeText(x.pad?.location?.name||"launch site unavailable")+'</li>'),"Launch feed unavailable or no upcoming launches.")+meta+anomalyLink(s.url,"OPEN LAUNCH LIBRARY 2")+'</div>';
  }else if(key==="debris"){
   body='<div class="anomaly-state"><strong>'+s.title+'</strong><span>'+anomalyState.debris.length+' TRACKED OBJECTS</span><p>Sample of named debris clouds (COSMOS 2251, IRIDIUM 33, FENGYUN 1C). This is not a complete census of all orbital debris; orbital elements are not a collision forecast.</p>'+anomalyList(anomalyState.debris.slice(0,7).map(x=>'<li>'+safeText(x.OBJECT_NAME||x.object_name||x.OBJECT_ID||"DEBRIS OBJECT")+' · NORAD '+safeText(x.NORAD_CAT_ID||x.NORAD_CAT_ID||"—")+'</li>'),"CelesTrak feed unavailable or no matching catalogued objects.")+meta+anomalyLink(s.url,"OPEN CELESTRAK DATA")+'</div>';
  }
  anomalyContent.innerHTML=body;
  $("anomaly-updated").textContent=stamp?"CACHED SAMPLE "+new Date(stamp).toISOString().slice(11,16)+" UTC"+(fail?" · STALE / REQUEST FAILED":""):"WAITING FOR "+key.toUpperCase();
 }
 async function loadAnomalyTab(key,force=false){
  const loaders={
   space:async()=>{const d=await anomalyCached("space",()=>anomalyFetch(anomalySources.space.url),force);const row=Array.isArray(d)?d[d.length-1]:null;const kp=Number(row?.kp_index??row?.kp);anomalyState.kp=Number.isFinite(kp)?kp:null;if(anomalyState.kp!==null&&anomalyState.kp>=5)pushCriticalAlert("SPACE WEATHER","NOAA planetary Kp reached "+anomalyState.kp.toFixed(1)+" (storm threshold Kp ≥ 5).",anomalySources.space.url);},
   volcano:async()=>{const d=await anomalyCached("volcano",()=>anomalyFetch(anomalySources.volcano.url),force);anomalyState.volcanoes=(Array.isArray(d.events)?d.events:[]).filter(e=>(e.categories||[]).some(c=>/volcano/i.test(c.title||c.id||"")));},
   hydro:async()=>{const d=await anomalyCached("hydro",()=>anomalyFetch(anomalySources.hydro.url),force);const rows=Array.isArray(d)?d:[];anomalyState.gauges=rows.filter(g=>/enz|nagold|neckar|rhein/i.test((g.water?.shortname||"")+" "+(g.water?.longname||"")+" "+(g.shortname||"")+" "+(g.longname||"")));},
   dns:async()=>{const hosts=["a.root-servers.net","b.root-servers.net","c.root-servers.net","d.root-servers.net","e.root-servers.net","f.root-servers.net","g.root-servers.net","h.root-servers.net","i.root-servers.net","j.root-servers.net","k.root-servers.net","l.root-servers.net","m.root-servers.net"];anomalyState.dns=await Promise.all(hosts.map(async host=>{const started=performance.now();try{const d=await anomalyCached("dns:"+host,()=>anomalyFetch("https://cloudflare-dns.com/dns-query?name="+encodeURIComponent(host)+"&type=A",6000),force);return {host,ok:Array.isArray(d.Answer)&&d.Answer.length>0,ms:Math.round(performance.now()-started)};}catch{return {host,ok:false,ms:null};}}));},
   radiation:async()=>{const d=await anomalyCached("radiation",()=>anomalyFetch(anomalySources.radiation.url),force);anomalyState.radiation=Array.isArray(d)?d:Array.isArray(d.measurements)?d.measurements:[];},
   neo:async()=>{const d=await anomalyCached("neo",()=>anomalyFetch(anomalySources.neo.url),force);const fields=d.fields||[];const data=Array.isArray(d.data)?d.data:[];anomalyState.neos=data.map(row=>{const o={};fields.forEach((f,i)=>o[f]=row[i]);return [o.des,o.orbit_id,o.jd,o.cd,o.dist,o.dist_min,o.dist_max,o.v_rel,o.v_inf,o.t_sigma_f,o.h,o.diameter,o.diameter_sigma,o.fullname];});},
   launches:async()=>{const d=await anomalyCached("launches",()=>anomalyFetch(anomalySources.launches.url),force);anomalyState.launches=Array.isArray(d.results)?d.results:[];},
   debris:async()=>{const urls=["https://celestrak.org/NORAD/elements/gp.php?NAME=COSMOS%202251%20DEB&FORMAT=JSON","https://celestrak.org/NORAD/elements/gp.php?NAME=IRIDIUM%2033%20DEB&FORMAT=JSON","https://celestrak.org/NORAD/elements/gp.php?NAME=FENGYUN%201C%20DEB&FORMAT=JSON"];const sets=await Promise.all(urls.map((url,i)=>anomalyCached("debris"+i,()=>anomalyFetch(url),force).catch(()=>[])));anomalyState.debris=sets.flat().slice(0,100);},
   lightning:async()=>{},cyber:async()=>{}
  };
  if(!loaders[key])return;
  try{await loaders[key]();}catch(error){anomalyState.errors[key]=error?.message||"feed unavailable";}
  anomalyState.updated=Date.now();if(anomalyState.active===key)anomalyRender();renderCriticalTicker();
 }
 function refreshAnomalySources(){return loadAnomalyTab(anomalyState.active,true);}
 anomalyTabs.forEach(b=>b.addEventListener("click",()=>{anomalyState.active=b.dataset.anomalyTab;anomalyRender();loadAnomalyTab(anomalyState.active);}));
 $("anomaly-refresh")?.addEventListener("click",refreshAnomalySources);
 document.querySelector('[data-expand="anomalies"]')?.addEventListener("click",()=>{openDetails("anomalies");});
 const anomalyPriorDetails=panelDetails;
 panelDetails=function(id){if(id==="anomalies")return "GLOBAL ANOMALY TERMINAL\nTen lazy-loaded modules: NOAA SWPC, LightningMaps, NASA EONET, Cloudflare Radar, PEGELONLINE, DNS-over-HTTPS root-server hostname resolution, Safecast observations, NASA/JPL CAD close approaches, Launch Library 2 upcoming launches, and CelesTrak named debris-cloud samples. Values are cached by module; DNS-over-HTTPS is not ICMP ping; Safecast is crowdsourced; NEO proximity is not impact probability; debris sample is not a complete catalog.";return anomalyPriorDetails(id);};
 const anomalyPriorOpen=openDetails;
 openDetails=function(id){anomalyPriorOpen(id);if(id==="anomalies"){setTimeout(()=>{const body=$("dialog-body");if(body)body.innerHTML='<div class="anomaly-content">'+anomalyContent.innerHTML+'</div><div class="anomaly-list"><ul>'+anomalyState.alerts.map(a=>'<li><strong>'+safeText(a.source)+'</strong> · '+safeText(a.message)+' · <a href="'+a.url+'" target="_blank" rel="noopener noreferrer">SOURCE ↗</a></li>').join("")+'</ul></div>';},0);}};
 anomalyRender();loadAnomalyTab("space");setInterval(()=>{if(anomalyState.active==="space")loadAnomalyTab("space");},60000);

})();
