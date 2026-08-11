const state={token:sessionStorage.getItem("dorks-va-dashboard-token")||"",data:null,filter:"all"};
const byId=id=>document.getElementById(id);
const authOverlay=byId("auth-overlay");
const notice=byId("notice");

function showNotice(message,type="error"){
  notice.textContent=message;
  notice.className=`notice ${type}`;
  notice.hidden=false;
}

function clearNotice(){notice.hidden=true;notice.textContent="";}

async function api(method="GET",body){
  const response=await fetch("/api/monitor",{method,headers:{Authorization:`Bearer ${state.token}`,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"});
  const payload=await response.json().catch(()=>({error:"The monitor returned an invalid response."}));
  if(!response.ok)throw Object.assign(new Error(payload.error||`Request failed with HTTP ${response.status}.`),{status:response.status});
  return payload;
}

function dateLabel(value,withTime=true){
  if(!value)return "Never";
  const date=new Date(value);
  return new Intl.DateTimeFormat(undefined,withTime?{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"}:{month:"short",day:"numeric"}).format(date);
}

function setText(id,value){byId(id).textContent=String(value)}

function serviceLabel(element,ready,label){element.textContent=ready?label:"Not configured";element.classList.toggle("ready",ready)}

function renderMetrics(data){
  const open=data.exposures.filter(item=>item.status==="open");
  const resolved=data.exposures.filter(item=>item.status==="resolved");
  setText("metric-open",open.length);setText("metric-new",data.lastRun?.discovered||0);setText("metric-resolved",resolved.length);setText("metric-queries",data.queries.length);
  setText("domain-label",data.config.domain);setText("last-scan-label",data.lastRun?dateLabel(data.lastRun.at):"Never");setText("schedule-label",data.config.scheduleLabel);
  const status=byId("monitor-status");
  if(data.lastRun?.error){status.className="status-value error";status.innerHTML="<i></i>Scan failed"}else if(data.services.ready){status.className="status-value ready";status.innerHTML="<i></i>Active"}else{status.className="status-value";status.innerHTML="<i></i>Setup required"}
  setText("summary-file-types",data.config.fileTypes.map(item=>`.${item}`).join(" · ")||"None");setText("summary-keywords",data.config.keywords.join(" · ")||"None");setText("summary-admin-paths",data.config.adminPaths.join(" · ")||"None");
  serviceLabel(byId("slack-state"),data.services.slack,"Enabled");serviceLabel(byId("email-state"),data.services.email,"Enabled");serviceLabel(byId("provider-state"),data.services.ready,data.services.provider);
  serviceLabel(byId("slack-detail"),data.services.slack,"Enabled");serviceLabel(byId("email-detail"),data.services.email,"Enabled");serviceLabel(byId("provider-detail"),data.services.ready,`${data.services.provider} ready`);
  if(data.lastRun?.error)showNotice(`Last scan failed: ${data.lastRun.error}`);else if(data.lastRun?.alertWarnings?.length)showNotice(`Scan completed, but alert delivery reported: ${data.lastRun.alertWarnings.join(" ")}`);else if(!data.services.ready)showNotice(`Search provider setup is incomplete. Configure the required ${data.services.provider==="google-cse"?"GOOGLE_API_KEY and GOOGLE_CX":"SERPER_API_KEY"} environment variable before running a scan.`);
}

function severityTag(value){const span=document.createElement("span");span.className=`tag tag-${value}`;span.textContent=value;return span}

function matchCell(exposure){
  const td=document.createElement("td");td.className="match-cell";
  const title=document.createElement("strong");title.textContent=exposure.title;
  const link=document.createElement("a");link.href=exposure.url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=exposure.url;
  td.append(title,link);return td;
}

function rowFor(exposure,withAction=false){
  const row=document.createElement("tr");
  const first=document.createElement("td");first.textContent=dateLabel(exposure.firstSeen);
  const kind=document.createElement("td");kind.textContent=exposure.kind.replaceAll("-"," ");
  const severity=document.createElement("td");severity.append(severityTag(exposure.severity));
  const status=document.createElement("td");status.className=exposure.status==="open"?"status-open":"status-resolved";status.textContent=exposure.status.toUpperCase();
  row.append(first,kind,matchCell(exposure),severity,status);
  if(withAction){const action=document.createElement("td");if(exposure.status==="open"){const button=document.createElement("button");button.type="button";button.className="resolve-button";button.textContent="Mark resolved";button.addEventListener("click",()=>resolveExposure(exposure.id,button));action.append(button)}else{action.textContent="—"}row.append(action)}
  return row;
}

function renderTables(data){
  const latest=data.exposures.slice(0,8);const latestBody=byId("latest-body");latestBody.replaceChildren(...latest.map(item=>rowFor(item)));byId("latest-empty").hidden=latest.length>0;
  const filtered=data.exposures.filter(item=>state.filter==="all"||item.status===state.filter);const body=byId("exposures-body");body.replaceChildren(...filtered.map(item=>rowFor(item,true)));byId("exposures-empty").hidden=filtered.length>0;
}

function renderSeverity(data){
  const open=data.exposures.filter(item=>item.status==="open");const colors={critical:"#ff4343",high:"#ff850a",medium:"#ffd400",low:"#9aa1a7"};const counts=Object.fromEntries(Object.keys(colors).map(level=>[level,open.filter(item=>item.severity===level).length]));
  setText("severity-total",open.length);const list=byId("severity-list");list.replaceChildren();let position=0;const stops=[];
  Object.entries(colors).forEach(([level,color])=>{const count=counts[level];const start=position;position+=open.length?(count/open.length)*100:0;if(count)stops.push(`${color} ${start}% ${position}%`);const li=document.createElement("li");const label=document.createElement("span");const swatch=document.createElement("i");swatch.style.background=color;label.append(swatch,document.createTextNode(level[0].toUpperCase()+level.slice(1)));const value=document.createElement("strong");value.textContent=`${count} (${open.length?Math.round(count/open.length*100):0}%)`;li.append(label,value);list.append(li)});
  byId("severity-ring").style.background=stops.length?`conic-gradient(${stops.join(",")})`:"var(--line)";
}

function drawTrend(scans){
  const canvas=byId("trend-chart");const rect=canvas.getBoundingClientRect();const scale=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(600,Math.floor(rect.width*scale));canvas.height=Math.floor(230*scale);const context=canvas.getContext("2d");context.scale(scale,scale);const width=canvas.width/scale,height=canvas.height/scale;context.clearRect(0,0,width,height);
  const data=scans.slice(-30);const pad={left:38,right:14,top:14,bottom:30};const innerWidth=width-pad.left-pad.right,innerHeight=height-pad.top-pad.bottom;const maximum=Math.max(5,...data.flatMap(item=>[item.open,item.discovered,item.resolved]));context.font="11px Inter";context.strokeStyle="#292e32";context.fillStyle="#899096";context.lineWidth=1;
  for(let step=0;step<=4;step+=1){const y=pad.top+innerHeight*(step/4);context.beginPath();context.moveTo(pad.left,y);context.lineTo(width-pad.right,y);context.stroke();context.fillText(String(Math.round(maximum*(1-step/4))),4,y+4)}
  if(!data.length){context.fillStyle="#899096";context.fillText("Trend data appears after the first scan.",pad.left+20,pad.top+innerHeight/2);return}
  const x=index=>pad.left+(data.length===1?innerWidth/2:index/(data.length-1)*innerWidth);const y=value=>pad.top+innerHeight-(value/maximum)*innerHeight;
  const series=[{key:"open",color:"#ff4343"},{key:"discovered",color:"#ff850a"},{key:"resolved",color:"#49c842"}];
  series.forEach(seriesItem=>{context.beginPath();data.forEach((item,index)=>{const px=x(index),py=y(item[seriesItem.key]);if(index===0)context.moveTo(px,py);else context.lineTo(px,py)});context.strokeStyle=seriesItem.color;context.lineWidth=2;context.stroke();data.forEach((item,index)=>{context.beginPath();context.arc(x(index),y(item[seriesItem.key]),3,0,Math.PI*2);context.fillStyle=seriesItem.color;context.fill()})});
  context.fillStyle="#899096";[0,Math.floor((data.length-1)/2),data.length-1].filter((value,index,array)=>array.indexOf(value)===index).forEach(index=>context.fillText(dateLabel(data[index].at,false),Math.max(pad.left,x(index)-22),height-7));
}

function renderForm(data){
  byId("domain-input").value=data.config.domain;byId("keywords-input").value=data.config.keywords.join("\n");byId("filetypes-input").value=data.config.fileTypes.join("\n");byId("adminpaths-input").value=data.config.adminPaths.join("\n");const list=byId("query-list");list.replaceChildren(...data.queries.map(query=>{const item=document.createElement("li");item.textContent=query;return item}));
}

function render(data){state.data=data;clearNotice();renderMetrics(data);renderTables(data);renderSeverity(data);renderForm(data);requestAnimationFrame(()=>drawTrend(data.scans));byId("access-label").textContent="Token authenticated"}

async function unlock(token){state.token=token;const data=await api();sessionStorage.setItem("dorks-va-dashboard-token",token);authOverlay.classList.add("unlocked");render(data)}

async function resolveExposure(id,button){button.disabled=true;try{render(await api("POST",{action:"resolve",id}));showNotice("Exposure marked as resolved.","success")}catch(error){showNotice(error.message)}finally{button.disabled=false}}

function splitRules(value){return value.split(/[\n,]/).map(item=>item.trim()).filter(Boolean)}

document.querySelectorAll("[data-view]").forEach(control=>control.addEventListener("click",()=>{const view=control.dataset.view;document.querySelectorAll(".dashboard-view").forEach(panel=>panel.classList.toggle("active",panel.id===`view-${view}`));document.querySelectorAll(".monitor-nav button").forEach(button=>button.classList.toggle("active",button.dataset.view===view));document.querySelector(".monitor-sidebar").classList.remove("open");if(view==="overview"&&state.data)requestAnimationFrame(()=>drawTrend(state.data.scans))}));
byId("auth-form").addEventListener("submit",async event=>{event.preventDefault();const button=event.currentTarget.querySelector("button");button.disabled=true;byId("auth-error").textContent="";try{await unlock(byId("token-input").value)}catch(error){byId("auth-error").textContent=error.status===401?"That token was not accepted.":error.message}finally{button.disabled=false}});
byId("run-scan").addEventListener("click",async event=>{const button=event.currentTarget;button.disabled=true;button.lastChild.textContent="Scanning…";clearNotice();try{render(await api("POST",{action:"scan"}));showNotice("Scan completed and monitoring history was updated.","success")}catch(error){showNotice(error.message)}finally{button.disabled=false;button.lastChild.textContent="Run scan"}});
byId("rules-form").addEventListener("submit",async event=>{event.preventDefault();const button=event.currentTarget.querySelector(".primary-action");button.disabled=true;try{const config={domain:byId("domain-input").value,keywords:splitRules(byId("keywords-input").value),fileTypes:splitRules(byId("filetypes-input").value),adminPaths:splitRules(byId("adminpaths-input").value)};render(await api("PUT",config));showNotice("Monitoring rules saved.","success")}catch(error){showNotice(error.message)}finally{button.disabled=false}});
byId("rules-form").addEventListener("reset",event=>{event.preventDefault();if(state.data)renderForm(state.data)});
byId("status-filter").addEventListener("change",event=>{state.filter=event.target.value;if(state.data)renderTables(state.data)});
document.querySelector(".sidebar-toggle").addEventListener("click",()=>document.querySelector(".monitor-sidebar").classList.toggle("open"));
window.addEventListener("resize",()=>{if(state.data&&byId("view-overview").classList.contains("active"))drawTrend(state.data.scans)});
if(state.token)unlock(state.token).catch(()=>{sessionStorage.removeItem("dorks-va-dashboard-token");state.token=""});
if(["127.0.0.1","localhost"].includes(location.hostname)&&new URLSearchParams(location.search).has("preview")){
  const now=Date.now();
  const sampleExposures=[
    ["a1","Database backup discovered","https://example.com/backups/site-2026-08.sql","backup","critical","open",1],
    ["a2","Environment configuration","https://example.com/.env.production","sensitive-file","critical","open",2],
    ["a3","Administration sign in","https://example.com/admin/login","admin-portal","medium","open",3],
    ["a4","Archived deployment package","https://example.com/archive/release-old.zip","backup","high","open",5],
    ["a5","Internal operations document","https://example.com/docs/internal-operations.pdf","keyword","high","resolved",7],
    ["a6","Legacy dashboard","https://example.com/administrator/","admin-portal","medium","resolved",10]
  ].map(([id,title,url,kind,severity,status,days])=>({id,title,url,kind,severity,status,query:`site:example.com inurl:${kind}`,firstSeen:new Date(now-Number(days)*86400000).toISOString(),lastSeen:new Date(now-86400000).toISOString()}));
  const sampleScans=[8,9,10,9,8,7,6].map((open,index)=>({at:new Date(now-(6-index)*86400000).toISOString(),open,discovered:[3,1,2,0,1,0,2][index],resolved:[0,0,1,2,2,3,2][index],queries:4,durationMs:2200}));
  const sampleData={version:1,config:{domain:"example.com",keywords:["confidential","internal use only","restricted","password","secret","api_key"],fileTypes:["env","sql","bak","old","zip","yml","json"],adminPaths:["admin","administrator","login","dashboard"],scheduleLabel:"Daily at 06:00 UTC"},exposures:sampleExposures,scans:sampleScans,lastRun:sampleScans.at(-1),queries:["site:example.com (ext:env OR ext:sql)","site:example.com (ext:bak OR ext:old OR ext:zip)","site:example.com (inurl:admin OR inurl:login)","site:example.com (confidential OR restricted)"],services:{provider:"serper",ready:true,slack:true,email:true}};
  authOverlay.classList.add("unlocked");
  render(sampleData);
}
