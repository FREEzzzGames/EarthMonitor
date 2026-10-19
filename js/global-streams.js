(()=>{"use strict";
const $=id=>document.getElementById(id);
const CACHE_PREFIX="earthmonitor-global-stream-v1:";
const CACHE_TTL=30*60*1000;
const SOURCES={
 lightning:{title:"LIGHTNING ACTIVITY",url:"https://www.lightningmaps.org/",description:"LightningMaps/Blitzortung exposes a live map, but no stable unauthenticated public global API is assumed here. This panel links to the live map instead of inventing strike counts."},
 cyber:{title:"CYBER THREAT FEEDS",url:"https://urlhaus.abuse.ch/downloads/json_recent/",description:"Recent URLhaus malware/phishing URL submissions. This is threat-intelligence metadata, not a global DDoS counter or a live attack-volume feed."},
 aurora:{title:"AURORA / SPACE WEATHER",url:"https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",description:"NOAA SWPC OVATION aurora probability grid plus solar-wind plasma observations. Aurora probability is a forecast, not a guarantee of visibility."},
 marine:{title:"MARITIME AIS",url:"https://www.marinetraffic.com/",description:"A global AIS stream requires a licensed provider or an authorized backend proxy. No vessel positions are fabricated when a credentialed feed is not configured."},
 energy:{title:"EUROPEAN ENERGY GRID",url:"https://transparency.entsoe.eu/",description:"ENTSO-E Transparency Platform API requires an access token and correctly scoped document queries. Keep the token on a server; this static client will not request or store it."}
};
const state={active:"lightning",busy:false,controllers:new Map(),lastUpdated:{}};
function readCache(key){try{const x=JSON.parse(localStorage.getItem(CACHE_PREFIX+key)||"null");return x&&x.savedAt&&x.data!==undefined?x:null}catch{return null}}
function writeCache(key,data){try{localStorage.setItem(CACHE_PREFIX+key,JSON.stringify({savedAt:Date.now(),data}))}catch{}}
function safeDate(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toISOString().replace("T"," ").replace(/\.\d{3}Z$/," UTC"):"timestamp unavailable"}
function setText(id,value){const n=$(id);if(n)n.textContent=value}
function setSource(id,url){const n=$(id);if(n)n.href=url}
function addMetric(label,value){const row=document.createElement("div");row.className="global-data-row";const k=document.createElement("span");k.textContent=label;const v=document.createElement("strong");v.textContent=String(value);row.append(k,v);return row}
function paintStatus(status,kind="neutral"){for(const id of ["global-detail-status","global-stream-status"]){const n=$(id);if(n){n.textContent=status;n.dataset.state=kind}}}
function paintCommon(key){const s=SOURCES[key];setText("global-stream-name",s.title);setText("global-detail-title",s.title);setText("global-detail-description",s.description);setText("global-stream-description",s.description);setSource("global-stream-source",s.url);setSource("global-detail-source",s.url);document.querySelectorAll("[data-global-select]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.globalSelect===key)));const host=$("global-detail-data");if(host)host.replaceChildren();const map=$("global-detail-map");if(map)map.replaceChildren()}
function paintCache(key,cache){if(!cache)return false;renderData(key,cache.data,true,cache.savedAt);return true}
function renderData(key,data,fromCache=false,savedAt=Date.now()){
 const host=$("global-detail-data");if(host)host.replaceChildren();
 const age=Date.now()-savedAt;const freshness=age<=CACHE_TTL?"CACHED DATA":"STALE CACHE";
 if(key==="cyber"){
  const entries=Array.isArray(data)?data:(data&&typeof data==="object"?Object.values(data):[]);
  const list=entries.filter(x=>x&&typeof x==="object").slice(0,8);
  if(host){host.append(addMetric("RECENT FEED RECORDS",entries.length));host.append(addMetric("SAMPLE SHOWN",list.length));}
  if(host&&list.length){const ul=document.createElement("ul");ul.className="global-threat-list";for(const item of list){const li=document.createElement("li");const label=[item.threat,item.url_status,item.host,item.url].filter(Boolean).join(" · ");li.textContent=label.slice(0,260)||"URLhaus record";ul.append(li)}host.append(ul)}
  paintStatus(fromCache?"[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE":"FEED CONNECTED · URLHAUS RECENT THREAT INTELLIGENCE",fromCache?"warning":"ok");
  setText("global-stream-status",fromCache?"[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE":"FEED CONNECTED · "+entries.length+" RECORDS");
 }else if(key==="aurora"){
  const coords=Array.isArray(data?.coordinates)?data.coordinates:[];
  let max=0,peak=null;for(const p of coords){if(Array.isArray(p)&&Number.isFinite(Number(p[2]))&&Number(p[2])>max){max=Number(p[2]);peak=p}}
  const wind=Array.isArray(data?.solarWind)?data.solarWind:null;
  if(host){host.append(addMetric("GRID POINTS",coords.length));host.append(addMetric("MAX AURORA PROBABILITY",coords.length?max+"%":"not available"));if(peak)host.append(addMetric("PEAK GRID COORDINATE",Number(peak[1]).toFixed(1)+"° lat / "+Number(peak[0]).toFixed(1)+"° lon"));if(wind?.length){const last=wind[wind.length-1];host.append(addMetric("SOLAR WIND SPEED",last.speed??"—"));host.append(addMetric("PROTON DENSITY",last.density??"—"));}}
  setText("global-stream-status",fromCache?"[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE":"NOAA SWPC FEED CONNECTED");
  paintStatus(fromCache?"[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE":"NOAA SWPC · OVATION AURORA FORECAST",fromCache?"warning":"ok");
 }else{
  if(host)host.append(addMetric("SOURCE",SOURCES[key].url));
  paintStatus("[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE","warning");
  setText("global-stream-status","[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE");
 }
 const stamp=savedAt?safeDate(savedAt):"timestamp unavailable";
 setText("global-detail-updated",(fromCache?freshness:"UPDATED")+" · "+stamp);
 setText("global-stream-status",fromCache?"[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE":(key==="cyber"?"FEED CONNECTED · URLHAUS":key==="aurora"?"NOAA SWPC · CONNECTED":"EXTERNAL SOURCE"));
}
async function fetchJson(url,signal){const response=await fetch(url,{method:"GET",headers:{Accept:"application/json"},cache:"no-store",signal});if(!response.ok)throw new Error("HTTP "+response.status);return response.json()}
async function loadCyber(){
 const url=SOURCES.cyber.url;const data=await fetchJson(url,state.controllers.get("cyber")?.signal);
 if(!data||typeof data!=="object")throw new Error("Unexpected URLhaus response");
 const entries=Array.isArray(data)?data:Object.values(data);
 if(!entries.length)throw new Error("Empty URLhaus response");
 writeCache("cyber",entries);renderData("cyber",entries,false,Date.now());
}
async function loadAurora(){
 const [aurora,solar]=await Promise.all([
  fetchJson(SOURCES.aurora.url,state.controllers.get("aurora")?.signal),
  fetchJson("https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json",state.controllers.get("aurora")?.signal).catch(()=>null)
 ]);
 if(!Array.isArray(aurora?.coordinates))throw new Error("Unexpected NOAA OVATION response");
 let solarWind=[];
 if(Array.isArray(solar)&&solar.length>1){const head=solar[0];solarWind=solar.slice(1).map(row=>Object.fromEntries(head.map((k,i)=>[k,row[i]]))).filter(x=>x.speed&&Number.isFinite(Number(x.speed))).slice(-12)}
 const data={...aurora,solarWind};writeCache("aurora",data);renderData("aurora",data,false,Date.now());
}
async function load(key){
 state.controllers.get(key)?.abort();const controller=new AbortController();state.controllers.set(key,controller);
 const timer=setTimeout(()=>controller.abort(),12000);
 paintCommon(key);paintStatus("CONNECTING TO PUBLIC SOURCE…","loading");setText("global-stream-status","CONNECTING TO PUBLIC SOURCE…");
 try{
  if(key==="cyber")await loadCyber();
  else if(key==="aurora")await loadAurora();
  else if(key==="lightning"){paintStatus("EXTERNAL LIVE MAP · NO PUBLIC API CLAIMED","neutral");setText("global-stream-status","LIVE MAP LINK · NOT AN API STREAM");setText("global-detail-updated","EXTERNAL VISUALIZATION · "+safeDate(Date.now()));}
  else{
   const config=window.EARTHMONITOR_GLOBAL_STREAM_CONFIG?.[key];
   if(config?.url){const data=await fetchJson(config.url,controller.signal);if(!data||typeof data!=="object")throw new Error("Unexpected proxy response");writeCache(key,data);renderData(key,data,false,Date.now());}
   else {const cached=readCache(key);if(cached)paintCache(key,cached);else{paintStatus("[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE","warning");setText("global-stream-status","[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE");setText("global-detail-updated","NO CACHED RECORD · PROVIDER CONFIGURATION REQUIRED");const host=$("global-detail-data");if(host){host.append(addMetric("LIVE DATA","Unavailable"));host.append(addMetric("REQUIRED","Configure a same-origin backend proxy"));}}}
  }
 }catch(error){
  if(error?.name==="AbortError")setText("global-detail-updated","REQUEST TIMEOUT / CANCELLED");
  const cached=readCache(key);
  if(cached)paintCache(key,cached);
  else {paintStatus("[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE","warning");setText("global-stream-status","[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE");setText("global-detail-updated","NO CACHE AVAILABLE · "+(error?.message||"SOURCE UNAVAILABLE"));const host=$("global-detail-data");if(host){host.replaceChildren();host.append(addMetric("DATA STATE","Unavailable"));host.append(addMetric("REASON",(error?.message||"Feed unavailable").slice(0,120)));}}
 }finally{clearTimeout(timer)}
}
function openDialog(key=state.active){const d=$("global-stream-dialog");if(d&&!d.open)d.showModal();select(key)}
function select(key){if(!SOURCES[key])return;state.active=key;paintCommon(key);load(key)}
document.querySelectorAll("[data-global-select]").forEach(b=>b.addEventListener("click",()=>select(b.dataset.globalSelect)));
document.querySelectorAll("[data-global-open]").forEach(b=>b.addEventListener("click",()=>openDialog()));
document.querySelectorAll("[data-global-close]").forEach(b=>b.addEventListener("click",()=> $("global-stream-dialog")?.close()));
document.querySelector("[data-global-refresh]")?.addEventListener("click",()=>load(state.active));
$("global-stream-dialog")?.addEventListener("close",()=>{state.controllers.get(state.active)?.abort()});
select("lightning");
})();