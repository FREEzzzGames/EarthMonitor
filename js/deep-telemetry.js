(()=>{"use strict";
const $=id=>document.getElementById(id), PREFIX="earthmonitor-deep-v1:", MAX_AGE=30*60*1000;
const FEEDS={
 dsn:{title:"DEEP SPACE NETWORK",url:"https://eyes.nasa.gov/dsn/dsn.html",description:"NASA DSN Now is the live public antenna/spacecraft activity visualization. The NASA API endpoint is used only if the deployment provides a valid proxy; this panel does not infer Voyager/Mars link status from a static page."},
 orbit:{title:"ORBITAL OBJECT CATALOG",url:"https://celestrak.org/NORAD/elements/",description:"Live public GP orbital elements from CelesTrak for the active satellite catalog. These elements are not a re-entry prediction; precise decay estimates require additional orbital analysis."},
 argo:{title:"ARGO OCEAN FLOATS",url:"https://dataselection.euro-argo.eu/",description:"Argo is a profile/observation archive with delayed data, not a universal second-by-second live stream. This client uses the public ERDDAP griddap interface when available."},
 dart:{title:"DART TSUNAMI BUOYS",url:"https://www.ndbc.noaa.gov/dart.shtml",description:"NOAA NDBC DART buoy observations and event status. Buoy data may be delayed and a lack of an event is not a tsunami safety statement."},
 cables:{title:"SUBSEA CABLE INFRASTRUCTURE",url:"https://www.submarinecablemap.com/",description:"Subsea cable maps are public reference maps, not a universal live cable health API. No cable outage status is fabricated; a licensed or operator feed is required for live status."},
 carbon:{title:"GRID CARBON INTENSITY",url:"https://app.electricitymaps.com/",description:"Electricity Maps offers carbon intensity and generation mix, but API access and geographic coverage depend on provider authorization. Use a server-side proxy for tokens."}
};
const state={active:"dsn",controller:null};
function text(id,v){const n=$(id);if(n)n.textContent=v}
function link(id,v){const n=$(id);if(n)n.href=v}
function cacheGet(k){try{const x=JSON.parse(localStorage.getItem(PREFIX+k)||"null");return x&&x.savedAt&&x.data!==undefined?x:null}catch{return null}}
function cacheSet(k,data){try{localStorage.setItem(PREFIX+k,JSON.stringify({savedAt:Date.now(),data}))}catch{}}
function time(v){try{return new Date(v).toISOString().replace("T"," ").replace(/\.\d{3}Z$/," UTC")}catch{return "timestamp unavailable"}}
function metric(k,v){const row=document.createElement("div");row.className="deep-data-row";const a=document.createElement("span"),b=document.createElement("strong");a.textContent=k;b.textContent=String(v??"—");row.append(a,b);return row}
function status(v,kind="neutral"){for(const id of ["deep-detail-status","deep-summary-status"]){const n=$(id);if(n){n.textContent=v;n.dataset.state=kind}}}
function setup(k){state.active=k;const f=FEEDS[k];text("deep-summary-title",f.title);text("deep-detail-title",f.title);text("deep-detail-description",f.description);link("deep-detail-source",f.url);document.querySelectorAll("[data-deep-select]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.deepSelect===k)));$("deep-detail-data")?.replaceChildren();$("deep-detail-list")?.replaceChildren()}
function listRecords(host,items,make){if(!host)return;for(const item of items.slice(0,15)){const box=document.createElement("article");box.className="deep-record";make(box,item);host.append(box)}}
function render(k,data,cached=false,savedAt=Date.now()){
 const host=$("deep-detail-data"),list=$("deep-detail-list");host?.replaceChildren();list?.replaceChildren();
 if(k==="dsn"){
  const stations=Array.isArray(data)?data:(Array.isArray(data?.antennas)?data.antennas:(Array.isArray(data?.stations)?data.stations:[]));
  if(host){host.append(metric("RECORDS",stations.length));host.append(metric("DATA SOURCE","NASA DSN proxy/API"))}
  listRecords(list,stations,(box,x)=>{const h=document.createElement("strong");h.textContent=[x.name,x.antennaName,x.id].filter(Boolean).join(" · ")||"DSN antenna";box.append(h);const p=document.createElement("p");p.textContent=[x.spacecraft,x.target,x.status,x.signal].filter(Boolean).join(" · ")||JSON.stringify(x).slice(0,240);box.append(p)});
 }else if(k==="argo"){
  const rows=Array.isArray(data)?data:(Array.isArray(data?.table?.rows)?data.table.rows:[]);
  if(host)host.append(metric("PROFILE / ROWS",rows.length));
  listRecords(list,rows,(box,x)=>{const p=document.createElement("p");p.textContent=(Array.isArray(x)?x:Object.values(x)).slice(0,8).join(" · ");box.append(p)});
 }else if(k==="dart"){
  const rows=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:[]);
  if(host)host.append(metric("OBSERVATIONS",rows.length));
  listRecords(list,rows,(box,x)=>{const p=document.createElement("p");p.textContent=(Array.isArray(x)?x:Object.entries(x).map(([a,b])=>a+": "+b)).slice(0,10).join(" · ");box.append(p)});
 }else if(k==="orbit"){
  const objects=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:[]);
  if(host)host.append(metric("CATALOG OBJECTS",objects.length),metric("SOURCE","CelesTrak public GP JSON"));
  listRecords(list,objects,(box,x)=>{const h=document.createElement("strong");h.textContent=x.OBJECT_NAME||x.object_name||x.name||"Unnamed orbital object";box.append(h);const p=document.createElement("p");p.textContent=["NORAD "+(x.NORAD_CAT_ID||x.norad_cat_id||"—"),"Epoch "+(x.EPOCH||x.epoch||"—"),"Inclination "+(x.INCLINATION??x.inclination??"—"),"Mean motion "+(x.MEAN_MOTION??x.mean_motion??"—")].join(" · ");box.append(p)});
 }else{
  if(host){host.append(metric("PROVIDER",FEEDS[k].url));host.append(metric("LIVE API","No public unauthenticated endpoint configured"));host.append(metric("DATA STATE","Source link available; live API integration requires provider access"))}
 }
 const age=Date.now()-savedAt;
 text("deep-detail-updated",(cached?(age>MAX_AGE?"STALE CACHE":"CACHED DATA"):"UPDATED")+" · "+time(savedAt));
 status(cached?"[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE":(k==="argo"||k==="dart"||k==="dsn"?"PUBLIC FEED CONNECTED":"PROXY REQUIRED"),cached?"warning":"ok");
 text("deep-summary-status",cached?"[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE":(k==="argo"||k==="dart"||k==="dsn"?"PUBLIC FEED CONNECTED":"PROXY REQUIRED"));
}
async function getJson(url,signal){const r=await fetch(url,{headers:{Accept:"application/json"},cache:"no-store",signal});if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}
async function load(k){
 state.controller?.abort();const ctrl=new AbortController();state.controller=ctrl;const timeout=setTimeout(()=>ctrl.abort(),12000);setup(k);status("CONNECTING TO PUBLIC ENDPOINT…","loading");
 try{
  const config=window.EARTHMONITOR_DEEP_CONFIG?.[k];let url=config?.url,data;
  if(!url&&k==="orbit")url="https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=JSON";
  if(!url&&k==="argo")url="https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats.json?latitude%2Clongitude%2Ctime%2Cpres%2Ctemp%2Cpsal&time%3E=now-30days&orderBy(%22time%22)&limit(40)";
  if(!url&&k==="dart")url="https://www.ndbc.noaa.gov/data/realtime2/21413.dart";
  if(!url)throw new Error("Live API endpoint requires a provider-specific server proxy");
  if(k==="dart"&&!config?.url){
   const r=await fetch(url,{cache:"no-store",signal:ctrl.signal});if(!r.ok)throw new Error("HTTP "+r.status);const raw=await r.text();const lines=raw.trim().split(/\r?\n/);data=lines.slice(0,16).map(line=>line.trim().split(/\s+/));if(lines.length<2)throw new Error("No DART observations");
  }else data=await getJson(url,ctrl.signal);
  if(!data||(typeof data!=="object"&& !Array.isArray(data)))throw new Error("Unexpected provider response");
  cacheSet(k,data);render(k,data,false,Date.now());
 }catch(e){
  const cached=cacheGet(k);
  if(cached)render(k,cached.data,true,cached.savedAt);
  else{status("LIVE SOURCE UNAVAILABLE","warning");text("deep-summary-status","LIVE SOURCE UNAVAILABLE");text("deep-detail-updated","NO CACHED RESPONSE · "+(e?.message||"source unavailable"));const host=$("deep-detail-data");host?.replaceChildren();host?.append(metric("DATA STATE","Unavailable"),metric("SOURCE",FEEDS[k].url),metric("REASON",(e?.message||"feed unavailable").slice(0,150)))}
 }finally{clearTimeout(timeout)}
}
function open(){const d=$("deep-telemetry-dialog");if(d&&!d.open)d.showModal();load(state.active)}

document.querySelectorAll("[data-deep-select]").forEach(b=>b.addEventListener("click",()=>load(b.dataset.deepSelect)));
document.querySelectorAll("[data-deep-open]").forEach(b=>b.addEventListener("click",open));
document.querySelectorAll("[data-deep-close]").forEach(b=>b.addEventListener("click",()=>$("deep-telemetry-dialog")?.close()));
document.querySelector("[data-deep-refresh]")?.addEventListener("click",()=>load(state.active));
$("deep-telemetry-dialog")?.addEventListener("close",()=>state.controller?.abort());
load("dsn");
})();