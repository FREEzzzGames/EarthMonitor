(()=>{"use strict";
const $=id=>document.getElementById(id);
const PREFIX="earthmonitor-niche-v1:";
const CACHE_MAX_AGE=30*60*1000;
const FEEDS={
 aircraft:{title:"RADIO / AVIATION",url:"https://glidernet.org/",description:"OGN provides glider/FLARM-oriented tracking through its own ecosystem. ADS-B Exchange access is provider-controlled; this client does not claim unrestricted military or unfiltered aircraft coverage."},
 sensors:{title:"CROWDSOURCED AIR SENSORS",url:"https://api.sensor.community/",description:"Sensor.Community publishes community sensor observations. Station coverage and freshness vary; a nearby-station query is used when browser CORS permits."},
 gbfs:{title:"MICROMOBILITY / GBFS",url:"https://github.com/MobilityData/gbfs",description:"GBFS is a discovery/availability standard. A provider-specific station feed URL is needed; no single universal global GBFS endpoint exists."},
 github:{title:"GITHUB PUBLIC ACTIVITY",url:"https://api.github.com/events",description:"Public GitHub Events API provides a sampled, rate-limited stream of public events; it is not a complete global commit counter."},
 shodan:{title:"SHODAN NETWORK NOISE",url:"https://developer.shodan.io/api",description:"Shodan InternetDB is host-oriented enrichment and is not a global scan-rate stream. Live scan telemetry requires authorized Shodan access or a licensed backend feed."}
};
const state={active:"aircraft",controller:null,requestId:0};
function txt(id,value){const n=$(id);if(n)n.textContent=value}
function href(id,url){const n=$(id);if(n)n.href=url}
function cacheRead(k){try{const v=JSON.parse(localStorage.getItem(PREFIX+k)||"null");return v&&v.savedAt&&v.data!==undefined?v:null}catch{return null}}
function cacheWrite(k,data){try{localStorage.setItem(PREFIX+k,JSON.stringify({savedAt:Date.now(),data}))}catch{}}
function stamp(t){try{return new Date(t).toISOString().replace("T"," ").replace(/\.\d{3}Z$/," UTC")}catch{return "timestamp unavailable"}}
function metric(label,value){const row=document.createElement("div");row.className="niche-data-row";const a=document.createElement("span"),b=document.createElement("strong");a.textContent=label;b.textContent=String(value??"—");row.append(a,b);return row}
function status(value,kind="neutral"){for(const id of ["niche-detail-status","niche-summary-status"]){const n=$(id);if(n){n.textContent=value;n.dataset.state=kind}}}
function setActive(k){state.active=k;const f=FEEDS[k];if(!f)return;txt("niche-summary-title",f.title);txt("niche-detail-title",f.title);txt("niche-detail-description",f.description);href("niche-detail-source",f.url);document.querySelectorAll("[data-niche-select]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.nicheSelect===k)));const data=$("niche-detail-data"),list=$("niche-detail-list");if(data)data.replaceChildren();if(list)list.replaceChildren()}
function render(k,data,cached=false,savedAt=Date.now()){
 const host=$("niche-detail-data"),list=$("niche-detail-list");if(host)host.replaceChildren();if(list)list.replaceChildren();
 if(k==="sensors"){
  const items=Array.isArray(data)?data:[];
  const readings=items.map(x=>({id:x.sensor?.id,location:x.location,values:x.sensordatavalues||[],timestamp:x.timestamp})).slice(0,20);
  if(host)host.append(metric("STATIONS RETURNED",items.length));
  if(list){for(const s of readings.slice(0,12)){const box=document.createElement("article");box.className="niche-record";const head=document.createElement("strong");head.textContent="SENSOR #"+(s.id??"—");box.append(head);const vals=s.values.map(v=>v.value_type+": "+v.value+(v.value_type?.includes("P")?" µg/m³":"")).join(" · ");const p=document.createElement("p");p.textContent=vals||"No published measurements";box.append(p);const foot=document.createElement("small");foot.textContent=[s.location?.city,s.location?.country,s.timestamp?stamp(s.timestamp):""].filter(Boolean).join(" · ");box.append(foot);list.append(box)}}
  status(cached?"[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE":"SENSOR.COMMUNITY · PUBLIC OBSERVATIONS",cached?"warning":"ok");
 }else if(k==="gbfs"){
  const systems=Array.isArray(data.systems)?data.systems:[];
  if(host){host.append(metric("DISCOVERED SYSTEMS",systems.length));host.append(metric("FEED TYPE","GBFS discovery"));host.append(metric("LIVE STATIONS","Select a provider feed URL"))}
  if(list){for(const s of systems.slice(0,15)){const a=document.createElement("a");a.className="niche-record-link";a.href=s.url||"#";a.target="_blank";a.rel="noopener noreferrer";a.textContent=(s.name||s.id||"GBFS system")+" · "+(s.location?.country||"");list.append(a)}}
  status(cached?"[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE":"GBFS DISCOVERY FEED",cached?"warning":"ok");
 }else if(k==="github"){
  const events=Array.isArray(data)?data:[];
  if(host){host.append(metric("PUBLIC EVENTS IN RESPONSE",events.length));host.append(metric("API LIMITATION","Sampled / rate limited"));host.append(metric("LATEST EVENT",events[0]?.created_at?stamp(events[0].created_at):"—"))}
  if(list){for(const e of events.slice(0,12)){const a=document.createElement("a");a.className="niche-record-link";a.href=e.repo?.url?e.repo.url.replace("api.github.com/repos/","github.com/"):"https://github.com/";a.target="_blank";a.rel="noopener noreferrer";a.textContent=[e.type,e.repo?.name,e.actor?.login,e.created_at].filter(Boolean).join(" · ");list.append(a)}}
  status(cached?"[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE":"GITHUB PUBLIC EVENTS · CONNECTED",cached?"warning":"ok");
 }else{
  if(host){host.append(metric("SOURCE",FEEDS[k].url));host.append(metric("LIVE TELEMETRY","Provider endpoint not configured"));host.append(metric("DATA STATE","No live readings fabricated"))}
  status("[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE","warning");
 }
 const age=Date.now()-savedAt;txt("niche-detail-updated",(cached?(age>CACHE_MAX_AGE?"STALE CACHE":"CACHED DATA"):"UPDATED")+" · "+stamp(savedAt));
 txt("niche-summary-status",cached?"[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE":(k==="sensors"?"SENSOR FEED CONNECTED":k==="gbfs"?"GBFS FEED CONNECTED":k==="github"?"GITHUB EVENTS CONNECTED":"[!] FEED TEMPORARILY UNAVAILABLE - USING CACHE"));
}
async function fetchJson(url,signal){const res=await fetch(url,{headers:{Accept:"application/json"},cache:"no-store",signal});if(!res.ok)throw new Error("HTTP "+res.status);return res.json()}
async function load(k){
 if(state.controller)state.controller.abort();
 const requestId=++state.requestId;
 const controller=new AbortController();state.controller=controller;
 const timeout=setTimeout(()=>controller.abort(),12000);setActive(k);status("CONNECTING TO PUBLIC ENDPOINT…","loading");
 try{
  let data;
  if(k==="sensors"){
   // Local-area sensor query uses approximate city coordinates, not user device location.
   const url="https://data.sensor.community/airrohr/v1/filter/area=48.89,8.70,25";
   data=await fetchJson(url,controller.signal);if(!Array.isArray(data))throw new Error("Unexpected Sensor.Community response");
  }else if(k==="gbfs"){
   const cfg=window.EARTHMONITOR_NICHE_CONFIG?.gbfs;
   const discovery=cfg?.url||"https://gbfs.citibikenyc.com/gbfs/gbfs.json";
   data=await fetchJson(discovery,controller.signal);
   if(!data||typeof data!=="object")throw new Error("Unexpected GBFS discovery response");
  }else if(k==="github"){
   data=await fetchJson("https://api.github.com/events?per_page=30",controller.signal);
   if(!Array.isArray(data))throw new Error("Unexpected GitHub Events response");
  }else{
   const cfg=window.EARTHMONITOR_NICHE_CONFIG?.[k];
   if(!cfg?.url)throw new Error("Provider-specific live endpoint is not configured");
   data=await fetchJson(cfg.url,controller.signal);
  }
  if(requestId!==state.requestId)return;
  cacheWrite(k,data);render(k,data,false,Date.now());
 }catch(error){
  if(requestId!==state.requestId)return;
  const old=cacheRead(k);
  if(old)render(k,old.data,true,old.savedAt);
  else{
   status("LIVE SOURCE UNAVAILABLE","warning");
   txt("niche-summary-status","LIVE SOURCE UNAVAILABLE");
   txt("niche-detail-updated","NO CACHE AVAILABLE · "+(error?.message||"source unavailable"));
   const host=$("niche-detail-data");if(host){host.replaceChildren();host.append(metric("DATA STATE","Unavailable"));host.append(metric("REASON",(error?.message||"Feed unavailable").slice(0,150)))}
  }
 }finally{clearTimeout(timeout)}
}
function open(k=state.active){const d=$("niche-telemetry-dialog");if(d&&!d.open)d.showModal();load(k)}
document.querySelectorAll("[data-niche-select]").forEach(b=>b.addEventListener("click",()=>load(b.dataset.nicheSelect)));
document.querySelectorAll("[data-niche-open]").forEach(b=>b.addEventListener("click",()=>open()));
document.querySelectorAll("[data-niche-close]").forEach(b=>b.addEventListener("click",()=> $("niche-telemetry-dialog")?.close()));
document.querySelector("[data-niche-refresh]")?.addEventListener("click",()=>load(state.active));
$("niche-telemetry-dialog")?.addEventListener("close",()=>state.controller?.abort());
load("aircraft");
})();