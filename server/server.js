import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 10000);
const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS || "https://freezzzgames.github.io").split(",").map(s=>s.trim()).filter(Boolean));
const MAX_BODY = 1024 * 1024;
const TIMEOUT_MS = 9000;
const buckets = new Map();
const ROUTES = {
  "dns": {url:"https://cloudflare-dns.com/dns-query",allowed:["name","type"]},
  "transit-nearby": {url:"https://v6.db.transport.rest/locations/nearby",allowed:["latitude","longitude","distance","results","poi"]},
  "transit-departures": {url:"https://v6.db.transport.rest/stops/",suffix:"/departures",allowed:["duration","results","when"]},
  "usgs-earthquakes": {url:"https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",fixed:true},
  "noaa-space-weather": {url:"https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json",fixed:true}
};
function json(res,status,data){res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(data));}
function rateLimit(req){const key=req.socket.remoteAddress||"unknown",now=Date.now();let b=buckets.get(key);if(!b||now-b.start>60000)b={start:now,count:0};b.count++;buckets.set(key,b);return b.count<=90;}
function upstreamUrl(route,query){
  if(route==="transit-departures"){
    const id=query.get("id")||"";if(!/^\d{1,20}$/.test(id))throw new Error("Invalid stop id");
    const u=new URL(ROUTES[route].url+encodeURIComponent(id)+ROUTES[route].suffix);
    for(const k of ROUTES[route].allowed)if(query.has(k))u.searchParams.set(k,query.get(k));
    return u;
  }
  const cfg=ROUTES[route];const u=new URL(cfg.url);
  if(!cfg.fixed)for(const k of cfg.allowed)if(query.has(k))u.searchParams.set(k,query.get(k));
  return u;
}
const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(origin && !ALLOWED_ORIGINS.has(origin)){json(res,403,{ok:false,error:"origin_not_allowed"});return;}
  if(origin)res.setHeader("access-control-allow-origin",origin);
  res.setHeader("vary","Origin");
  res.setHeader("access-control-allow-methods","GET, OPTIONS");
  res.setHeader("access-control-allow-headers","content-type");
  if(req.method==="OPTIONS"){res.writeHead(204);res.end();return;}
  if(req.method!=="GET"){json(res,405,{ok:false,error:"method_not_allowed"});return;}
  if(!rateLimit(req)){json(res,429,{ok:false,error:"rate_limited"});return;}
  const url=new URL(req.url,"http://localhost");
  if(url.pathname==="/health"){json(res,200,{ok:true,service:"earth-monitor-api",time:new Date().toISOString()});return;}
  const match=url.pathname.match(/^\/api\/v1\/([a-z-]+)$/);
  if(!match||!ROUTES[match[1]]){json(res,404,{ok:false,error:"route_not_found"});return;}
  if(url.pathname.includes("transit-departures")&&!url.searchParams.has("id")){json(res,400,{ok:false,error:"missing_stop_id"});return;}
  let target;try{target=upstreamUrl(match[1],url.searchParams);}catch{json(res,400,{ok:false,error:"invalid_parameters"});return;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const headers={"accept":"application/json"};
    if(match[1]==="dns")headers.accept="application/dns-json";
    const response=await fetch(target,{headers,signal:controller.signal,redirect:"error"});
    if(!response.ok){json(res,502,{ok:false,error:"upstream_error",upstreamStatus:response.status,source:match[1]});return;}
    const text=await response.text();if(text.length>MAX_BODY){json(res,502,{ok:false,error:"upstream_response_too_large"});return;}
    let data;try{data=JSON.parse(text);}catch{json(res,502,{ok:false,error:"upstream_invalid_json"});return;}
    res.setHeader("cache-control","public, max-age=20, stale-while-revalidate=40");
    json(res,200,{ok:true,source:match[1],fetchedAt:new Date().toISOString(),data});
  }catch(e){json(res,502,{ok:false,error:e?.name==="AbortError"?"upstream_timeout":"upstream_unavailable",source:match[1]});}
  finally{clearTimeout(timer);}
});
server.listen(PORT,"0.0.0.0",()=>console.log("Earth Monitor API listening on "+PORT));
