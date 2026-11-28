const SUPABASE_URL="https://bnekbuwfloagqjzselxp.supabase.co",SUPABASE_PUBLISHABLE_KEY="sb_publishable_Xs8qdDm4RTa2Adjw34SLKw_rS-c-ikB";
const FACEBOOK_URL="https://www.facebook.com/share/19JD1ACiCu/";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const calendar=document.getElementById("calendar"),monthLabel=document.getElementById("monthLabel"),slotsEl=document.getElementById("slots"),selectedDateText=document.getElementById("selectedDateText"),summaryText=document.getElementById("summaryText"),scheduleNotice=document.getElementById("scheduleNotice"),clientStart=document.getElementById("clientStart"),clientEnd=document.getElementById("clientEnd"),durationSummary=document.getElementById("durationSummary"),copyButton=document.getElementById("copyButton"),copyOpenButton=document.getElementById("copyOpenButton"),groupSizeWrap=document.getElementById("groupSizeWrap"),groupSize=document.getElementById("groupSize"),publicParticipantList=document.getElementById("publicParticipantList"),rememberPrimaryDetails=document.getElementById("rememberPrimaryDetails"),forgetRememberedDetails=document.getElementById("forgetRememberedDetails");
let view=new Date();view.setDate(1);let selectedDate=null,selectedStart=null,selectedEnd=null,selectedPackage=null,selectedRate=null,selectedPlayers=null,scheduleMap=new Map(),scheduleDetailMap=new Map(),selectedGoalFocus=null,selectedGoalLabel=null,selectedProgramInterest=null,publicPrograms=[];
const pad=n=>String(n).padStart(2,"0"),keyDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,niceDate=d=>d.toLocaleDateString("en-PH",{weekday:"long",month:"long",day:"numeric",year:"numeric"}),hourName=h=>h===24?"12:00 MN":`${h%12||12}:00 ${h<12?"AM":"PM"}`,hourLabel=h=>`${hourName(h)} – ${hourName(h+1)}`,statusFor=(date,h)=>scheduleMap.get(`${date}|${h}`)||"available",publicReasonFor=(date,h)=>scheduleDetailMap.get(`${date}|${h}`)?.public_reason||"";

// Menu
const menuBtn=document.getElementById("menuBtn"),mainNav=document.getElementById("mainNav");
menuBtn.onclick=()=>{const open=mainNav.classList.toggle("open");menuBtn.setAttribute("aria-expanded",String(open));};
mainNav.querySelectorAll("a").forEach(a=>a.onclick=()=>{mainNav.classList.remove("open");menuBtn.setAttribute("aria-expanded","false");});

// Mixed motivational + coaching tips
const sayings=[
{type:"PICKYLA SAYS",text:"Train the feet, trust the hands."},
{type:"QUICK TIP",text:"Return deep when possible. It gives you more time to move forward."},
{type:"COURT NOTE",text:"Consistency wins more rallies than one lucky winner."},
{type:"QUICK TIP",text:"At the kitchen, keep the paddle ready and the swing compact."},
{type:"PICKYLA SAYS",text:"Good fundamentals make pressure feel simple."},
{type:"QUICK TIP",text:"Move early, set your feet, then choose the smart shot."},
{type:"COURT NOTE",text:"Small improvements become big points."},
{type:"QUICK TIP",text:"A soft reset is often better than forcing a winner from a bad position."},
{type:"PICKYLA SAYS",text:"Control first. Power follows."},
{type:"COURT NOTE",text:"Every rally is feedback — use it."},
{type:"QUICK TIP",text:"Recover toward good court position after every shot, not after the point."},
{type:"PICKYLA SAYS",text:"Better positioning creates easier shots."}
];
const heroQuote=document.getElementById("heroQuote"),heroQuoteLabel=document.getElementById("heroQuoteLabel");let quoteIndex=-1;
function nextQuote(){let n;do{n=Math.floor(Math.random()*sayings.length)}while(n===quoteIndex&&sayings.length>1);quoteIndex=n;heroQuote.classList.add("fade");setTimeout(()=>{const q=sayings[n];if(heroQuoteLabel)heroQuoteLabel.textContent=q.type;heroQuote.textContent='“'+q.text+'”';heroQuote.classList.remove("fade");},250);}
nextQuote();setInterval(nextQuote,15000);

async function loadMonthSchedule(){scheduleNotice.className="schedule-notice";scheduleNotice.textContent="Loading live schedule…";const start=new Date(view.getFullYear(),view.getMonth(),1),end=new Date(view.getFullYear(),view.getMonth()+1,0);const {data,error}=await fetchPublicScheduleRange20(keyDate(start),keyDate(end));scheduleMap=new Map();scheduleDetailMap=new Map();if(error){scheduleNotice.classList.add("error");scheduleNotice.textContent="Live schedule could not load. Please refresh.";}else{(data||[]).forEach(r=>{const k=`${r.slot_date}|${Number(r.start_hour)}`;scheduleMap.set(k,r.status);scheduleDetailMap.set(k,r);});scheduleNotice.textContent="Live schedule updated.";}renderCalendar();renderSlots();populateStartTimes();}
function dayState(date){let b=0,u=0,a=0;for(let h=8;h<24;h++){const s=statusFor(date,h);if(s==="booked")b++;else if(s==="unavailable")u++;else a++;}if(b===16)return{cls:"full-booked",label:"Fully booked"};if(a===0)return{cls:"full-unavailable",label:"No availability"};if(b>0)return{cls:"partial-booked",label:`${b} booked`};if(u>0)return{cls:"partial-unavailable",label:"Limited"};return{cls:"",label:"Open"};}
function renderCalendar(){calendar.innerHTML="";monthLabel.textContent=view.toLocaleDateString("en-PH",{month:"long",year:"numeric"});const y=view.getFullYear(),m=view.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate(),today=new Date();today.setHours(0,0,0,0);for(let i=0;i<first;i++){const b=document.createElement("span");b.className="day blank";calendar.appendChild(b);}for(let n=1;n<=days;n++){const d=new Date(y,m,n),btn=document.createElement("button"),state=dayState(keyDate(d));btn.className="day";btn.innerHTML=`<span>${n}</span><small class="day-status">${state.label}</small>`;if(state.cls)btn.classList.add(state.cls);if(d<today)btn.classList.add("past");if(d.getTime()===today.getTime())btn.classList.add("today");if(selectedDate&&keyDate(d)===keyDate(selectedDate))btn.classList.add("selected");if(d>=today)btn.onclick=()=>{selectedDate=d;selectedStart=null;selectedEnd=null;renderCalendar();renderSlots();populateStartTimes();updateSummary();};calendar.appendChild(btn);}}
function renderSlots(){slotsEl.innerHTML="";if(!selectedDate){selectedDateText.textContent="Choose a date";return;}const ds=keyDate(selectedDate);selectedDateText.textContent=niceDate(selectedDate);for(let h=8;h<24;h++){const b=document.createElement("button"),s=statusFor(ds,h);b.className="slot";b.textContent=hourLabel(h);b.type="button";if(s==="booked"){b.classList.add("booked");b.disabled=true;}else if(s==="unavailable"){b.classList.add("unavailable");b.disabled=true;}else{if(selectedStart!==null&&selectedEnd!==null&&h>=selectedStart&&h<selectedEnd)b.classList.add("in-range");b.onclick=()=>{selectedStart=h;populateEndTimes();renderSlots();updateSummary();};}slotsEl.appendChild(b);}}
function populateStartTimes(){clientStart.innerHTML="";clientEnd.innerHTML="";if(!selectedDate){clientStart.disabled=true;clientEnd.disabled=true;clientStart.innerHTML="<option>Choose a date first</option>";clientEnd.innerHTML="<option>Choose start time</option>";durationSummary.textContent="Select a start and end time.";return;}const ds=keyDate(selectedDate),available=[];for(let h=8;h<24;h++)if(statusFor(ds,h)==="available")available.push(h);if(!available.length){clientStart.disabled=true;clientEnd.disabled=true;clientStart.innerHTML="<option>No available times</option>";clientEnd.innerHTML="<option>Fully booked / unavailable</option>";durationSummary.textContent="No available coaching time on this date.";return;}available.forEach(h=>{const o=document.createElement("option");o.value=h;o.textContent=hourName(h);clientStart.appendChild(o);});clientStart.disabled=false;if(selectedStart===null||!available.includes(selectedStart))selectedStart=available[0];clientStart.value=selectedStart;populateEndTimes();}
function populateEndTimes(){clientEnd.innerHTML="";if(!selectedDate||selectedStart===null)return;const ds=keyDate(selectedDate);let last=selectedStart;for(let h=selectedStart;h<24;h++){if(statusFor(ds,h)!=="available")break;last=h+1;const o=document.createElement("option");o.value=last;o.textContent=hourName(last);clientEnd.appendChild(o);}if(!clientEnd.options.length){clientEnd.disabled=true;selectedEnd=null;durationSummary.textContent="No consecutive time available from this start time.";}else{clientEnd.disabled=false;if(selectedEnd===null||selectedEnd<=selectedStart||selectedEnd>last)selectedEnd=selectedStart+1;clientEnd.value=selectedEnd;updateDuration();}}
function updateDuration(){if(selectedStart===null||selectedEnd===null)return;const hrs=selectedEnd-selectedStart;durationSummary.textContent=`Selected: ${hourName(selectedStart)} – ${hourName(selectedEnd)} • ${hrs} hour${hrs>1?"s":""}`;renderSlots();updateSummary();}
clientStart.onchange=()=>{selectedStart=Number(clientStart.value);selectedEnd=null;populateEndTimes();};clientEnd.onchange=()=>{selectedEnd=Number(clientEnd.value);updateDuration();};
function blockReasonKey20(reason){const s=String(reason||"").toLowerCase();if(s.includes("tournament"))return"tournament";if(s.includes("training"))return"training";if(s.includes("personal"))return"personal";if(s.includes("rest"))return"rest";if(s.includes("unavailable"))return"unavailable";return"other";}
async function fetchPublicScheduleRange20(start,end){let q=await db.from("public_schedule").select("slot_date,start_hour,status,public_reason").gte("slot_date",start).lte("slot_date",end);if(q.error&&String(q.error.message||"").toLowerCase().includes("public_reason"))q=await db.from("public_schedule").select("slot_date,start_hour,status").gte("slot_date",start).lte("slot_date",end);return q;}
// ===== v17-D participant identity + browser autofill =====
const PRIMARY_MEMORY_KEY="pickyla-v17d-primary",RECENT_PLAYERS_KEY="pickyla-v17d-recent-players";
const sendRequestButton=document.getElementById("sendRequestButton"),requestSubmitStatus=document.getElementById("requestSubmitStatus");
function cleanSpaces(v){return String(v||"").trim().replace(/\s+/g," ");}
function smartName(v){return cleanSpaces(v).split(" ").map(word=>word.split(/([-'])/).map(part=>/[-']/.test(part)?part:(part?part.charAt(0).toUpperCase()+part.slice(1).toLowerCase():part)).join("")).join(" ");}
function fullPlayerName(p){return cleanSpaces(`${p.first_name||""} ${p.last_name||""}`);}
function readLocalJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||"");return v??fallback;}catch{return fallback;}}
function rememberedPrimary(){return readLocalJson(PRIMARY_MEMORY_KEY,null);}
function recentPlayers(){const rows=readLocalJson(RECENT_PLAYERS_KEY,[]);return Array.isArray(rows)?rows:[];}
function participantDrafts(){if(!publicParticipantList)return[];return [...publicParticipantList.querySelectorAll(".public-participant-card")].map(card=>({first_name:card.querySelector("[data-first]")?.value||"",last_name:card.querySelector("[data-last]")?.value||"",contact:card.querySelector("[data-contact]")?.value||""}));}
function getPublicParticipants(strict=false){const rows=participantDrafts().map(p=>({first_name:smartName(p.first_name),last_name:smartName(p.last_name),contact:cleanSpaces(p.contact)||null}));if(strict&&rows.some(p=>!p.first_name||!p.last_name))return null;return rows;}
function showPlayerSuggestions(card){const first=card.querySelector("[data-first]"),last=card.querySelector("[data-last]"),box=card.querySelector(".participant-suggestions"),q=cleanSpaces(`${first.value} ${last.value}`).toLowerCase();if(!q){box.classList.add("hidden");box.innerHTML="";return;}const matches=recentPlayers().filter(p=>fullPlayerName(p).toLowerCase().includes(q)||String(p.contact||"").toLowerCase().includes(q)).slice(0,5);if(!matches.length){box.classList.add("hidden");box.innerHTML="";return;}box.innerHTML=matches.map((p,i)=>`<button type="button" data-suggest="${i}"><strong>${escapePublic(fullPlayerName(p))}</strong><small>${escapePublic(p.contact||"No contact saved")}</small></button>`).join("");box.classList.remove("hidden");box.querySelectorAll("button").forEach((b,i)=>b.onclick=()=>{const p=matches[i];first.value=p.first_name||"";last.value=p.last_name||"";card.querySelector("[data-contact]").value=p.contact||"";box.classList.add("hidden");updateSummary();});}
function renderPublicParticipants(count=1){if(!publicParticipantList)return;count=Math.min(8,Math.max(1,Number(count)||1));const prev=participantDrafts(),saved=rememberedPrimary();publicParticipantList.innerHTML="";for(let i=0;i<count;i++){const draft=prev[i]||(i===0&&saved?saved:{}),card=document.createElement("article");card.className="public-participant-card";card.dataset.order=String(i+1);card.innerHTML=`<div class="participant-card-head"><div><span>PLAYER ${i+1}</span><strong>${i===0?"Primary / person booking":"Participant"}</strong></div>${i===0?'<span class="primary-chip">PRIMARY</span>':''}</div><div class="participant-fields"><label>First name <em>required</em><input data-first type="text" maxlength="60" autocomplete="${i===0?'given-name':'off'}" placeholder="First name" required></label><label>Last name <em>required</em><input data-last type="text" maxlength="80" autocomplete="${i===0?'family-name':'off'}" placeholder="Last name" required></label><label class="participant-contact">Contact <small>optional</small><input data-contact type="text" maxlength="120" autocomplete="${i===0?'tel':'off'}" placeholder="Messenger / mobile"></label></div><div class="participant-suggestions hidden"></div>`;card.querySelector("[data-first]").value=draft.first_name||"";card.querySelector("[data-last]").value=draft.last_name||"";card.querySelector("[data-contact]").value=draft.contact||"";card.querySelectorAll("input").forEach(inp=>{inp.addEventListener("input",()=>{showPlayerSuggestions(card);updateSummary();});inp.addEventListener("blur",()=>{if(inp.hasAttribute("data-first")||inp.hasAttribute("data-last"))inp.value=smartName(inp.value);setTimeout(()=>card.querySelector(".participant-suggestions")?.classList.add("hidden"),180);updateSummary();});});publicParticipantList.appendChild(card);}if(saved&&rememberPrimaryDetails){rememberPrimaryDetails.checked=true;forgetRememberedDetails?.classList.remove("hidden");}updateSummary();}
function saveParticipantMemory(rows){if(!rememberPrimaryDetails?.checked||!rows?.length)return;localStorage.setItem(PRIMARY_MEMORY_KEY,JSON.stringify(rows[0]));const combined=[...rows,...recentPlayers()],seen=new Set(),clean=[];for(const p of combined){const k=`${fullPlayerName(p).toLowerCase()}|${String(p.contact||"").toLowerCase()}`;if(!fullPlayerName(p)||seen.has(k))continue;seen.add(k);clean.push(p);if(clean.length>=16)break;}localStorage.setItem(RECENT_PLAYERS_KEY,JSON.stringify(clean));forgetRememberedDetails?.classList.remove("hidden");}
if(forgetRememberedDetails)forgetRememberedDetails.onclick=()=>{localStorage.removeItem(PRIMARY_MEMORY_KEY);localStorage.removeItem(RECENT_PLAYERS_KEY);if(rememberPrimaryDetails)rememberPrimaryDetails.checked=false;forgetRememberedDetails.classList.add("hidden");renderPublicParticipants(selectedPlayers||1);};
function setPlayerCountOptions(min,max){groupSize.innerHTML="";for(let n=min;n<=max;n++){const o=document.createElement("option");o.value=String(n);o.textContent=`${n} player${n===1?"":"s"}`;groupSize.appendChild(o);}selectedPlayers=min;renderPublicParticipants(selectedPlayers);}
document.querySelectorAll(".package-options button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".package-options button").forEach(x=>x.classList.remove("active"));b.classList.add("active");selectedPackage=b.dataset.package;selectedRate=b.dataset.rate;const min=Number(b.dataset.min||b.dataset.players||1),max=Number(b.dataset.max||min);selectedPlayers=Number(b.dataset.players||min);if(max>1){setPlayerCountOptions(min,max);groupSizeWrap.classList.remove("hidden");selectedPlayers=Number(groupSize.value);}else{groupSizeWrap.classList.add("hidden");renderPublicParticipants(1);}updateSummary();});
groupSize.onchange=()=>{selectedPlayers=Number(groupSize.value);renderPublicParticipants(selectedPlayers);updateSummary();};
function bookingMessage(){const players=getPublicParticipants(true);if(!selectedDate||selectedStart===null||selectedEnd===null||!selectedPackage||!players||players.length!==Number(selectedPlayers||players.length))return"";const hrs=selectedEnd-selectedStart,primary=players[0],context=[selectedGoalLabel?`Goal: ${selectedGoalLabel}`:"",selectedProgramInterest?`Program Interest: ${selectedProgramInterest.name}`:""].filter(Boolean).join("\n"),roster=players.map((p,i)=>`Player ${i+1}: ${fullPlayerName(p)}${p.contact?` | Contact: ${p.contact}`:" | Contact: Not provided"}`).join("\n");return `Hi Kyla! I would like to request a pickleball coaching session.\n\nName: ${fullPlayerName(primary)}\nContact: ${primary.contact||"Not provided"}\nDate: ${niceDate(selectedDate)}\nTime: ${hourName(selectedStart)} - ${hourName(selectedEnd)} (${hrs} hour${hrs>1?"s":""})\nPlayers: ${players.length}\n${roster}\nCoaching: ${selectedPackage}\nCoaching Rate: ${selectedRate}${context?`\n${context}`:""}\nCourt Fee: Not included (usually ₱100–₱600 depending on venue and time)\nVenue: Santiago City, Isabela\n\nPlease confirm if this schedule is still available. Thank you!`;}
function updateSummary(){const players=getPublicParticipants(false),validPlayers=players.length===Number(selectedPlayers||players.length)&&players.every(p=>p.first_name&&p.last_name),ready=selectedDate&&selectedStart!==null&&selectedEnd!==null&&selectedPackage&&validPlayers;if(ready){const hrs=selectedEnd-selectedStart,primary=fullPlayerName(players[0]);summaryText.textContent=`${primary} • ${niceDate(selectedDate)} • ${hourName(selectedStart)}–${hourName(selectedEnd)} • ${hrs} hr • ${players.length} player(s) • ${selectedPackage}`;copyButton.classList.remove("disabled");copyOpenButton.classList.remove("disabled");sendRequestButton?.classList.remove("disabled");}else{summaryText.textContent="Select a date, time range, coaching type, and complete all player first/last names.";copyButton.classList.add("disabled");copyOpenButton.classList.add("disabled");sendRequestButton?.classList.add("disabled");}if(requestSubmitStatus&&!requestSubmitStatus.dataset.keep){requestSubmitStatus.className="request-submit-status hidden";requestSubmitStatus.textContent="";}}
async function copyDetails(){const text=bookingMessage(),players=getPublicParticipants(true);if(!text||!players)return false;saveParticipantMemory(players);try{await navigator.clipboard.writeText(text);showToast();return true;}catch(e){const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");document.body.removeChild(ta);if(ok)showToast();return ok;}}
function showToast(){const t=document.getElementById("copyToast");t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800);}copyButton.onclick=copyDetails;copyOpenButton.onclick=async()=>{if(!bookingMessage())return;await copyDetails();setTimeout(()=>window.open(FACEBOOK_URL,"_blank"),180);};
document.getElementById("prevMonth").onclick=()=>{view.setMonth(view.getMonth()-1);selectedDate=null;selectedStart=null;selectedEnd=null;loadMonthSchedule();};document.getElementById("nextMonth").onclick=()=>{view.setMonth(view.getMonth()+1);selectedDate=null;selectedStart=null;selectedEnd=null;loadMonthSchedule();};loadMonthSchedule();
if(sendRequestButton)sendRequestButton.onclick=async()=>{const players=getPublicParticipants(true),text=bookingMessage();if(!text||!players){updateSummary();return;}const original=sendRequestButton.textContent;sendRequestButton.disabled=true;sendRequestButton.textContent="Sending…";if(requestSubmitStatus){requestSubmitStatus.dataset.keep="1";requestSubmitStatus.className="request-submit-status hidden";}try{saveParticipantMemory(players);const primary=players[0],{data,error}=await db.rpc("submit_public_inquiry_v17d",{p_preferred_date:keyDate(selectedDate),p_start_hour:selectedStart,p_end_hour:selectedEnd,p_participant_count:players.length,p_coaching_type:selectedPackage,p_quoted_rate:Number(String(selectedRate||"").replace(/[^0-9.]/g,""))||null,p_source_text:text,p_goal_focus:selectedGoalLabel||null,p_program_interest:selectedProgramInterest?.name||null,p_participants:players});if(error)throw error;requestSubmitStatus.className="request-submit-status ok";requestSubmitStatus.textContent="Request sent to Pickyla Admin. Your slot is still subject to final confirmation by Kyla.";}catch(e){requestSubmitStatus.className="request-submit-status error";requestSubmitStatus.textContent=e.message||"Could not send your request. Please try Messenger instead.";}finally{sendRequestButton.disabled=false;sendRequestButton.textContent=original;setTimeout(()=>{if(requestSubmitStatus)delete requestSubmitStatus.dataset.keep;},1200);}};
window.pickylaV27ResetRegularBooking=function(){
  selectedDate=null;selectedStart=null;selectedEnd=null;
  selectedPackage=null;selectedRate=null;selectedPlayers=1;
  selectedGoalFocus=null;selectedGoalLabel=null;selectedProgramInterest=null;
  document.querySelectorAll('.package-options button').forEach(b=>b.classList.remove('active'));
  if(groupSizeWrap)groupSizeWrap.classList.add('hidden');
  renderPublicParticipants(1);
  publicParticipantList?.querySelectorAll('input').forEach(i=>i.value='');
  if(document.getElementById('v20PublicCourt')){
    document.getElementById('v20PublicCourt').value='';
    if(document.getElementById('v20PublicCourtOther'))document.getElementById('v20PublicCourtOther').value='';
    window.pickylaV20PublicCourt?.syncOther?.();
  }
  document.querySelectorAll('[data-self-score]').forEach(el=>el.value='');
  const note=document.getElementById('v17fSelfAssessmentNote');if(note)note.value='';
  renderCalendar();renderSlots();populateStartTimes();updateSummary();
};
renderPublicParticipants(1);
const weekPreviewModal=document.getElementById("weekPreviewModal"),publicWeekGrid=document.getElementById("publicWeekGrid"),publicWeekRange=document.getElementById("publicWeekRange");
function publicSunday(d=new Date()){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-x.getDay());return x;}
function publicWeekDates(){const s=publicSunday(),out=[];for(let i=0;i<7;i++){const d=new Date(s);d.setDate(s.getDate()+i);out.push(d);}return out;}
async function loadPublicWeekPreview(){
  const days=publicWeekDates(),start=keyDate(days[0]),end=keyDate(days[6]);publicWeekRange.textContent=`${days[0].toLocaleDateString("en-PH",{month:"short",day:"numeric"})} – ${days[6].toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"})}`;
  publicWeekGrid.innerHTML='<div class="pw-cell pw-head">TIME</div>'+days.map(d=>`<div class="pw-cell pw-head">${d.toLocaleDateString("en-PH",{weekday:"short"}).toUpperCase()}<small>${d.toLocaleDateString("en-PH",{month:"short",day:"numeric"})}</small></div>`).join("");
  const {data,error}=await fetchPublicScheduleRange20(start,end);
  if(error){publicWeekGrid.innerHTML=`<div class="pw-cell pw-time" style="grid-column:1/-1">Could not load schedule. Please close and try again.</div>`;return;}
  const map=new Map((data||[]).map(r=>[`${r.slot_date}|${Number(r.start_hour)}`,r])),now=new Date();
  for(let h=8;h<24;h++){
    publicWeekGrid.insertAdjacentHTML("beforeend",`<div class="pw-cell pw-time">${hourLabel(h)}</div>`);
    for(const d of days){const ds=keyDate(d),row=map.get(`${ds}|${h}`)||{status:"available",public_reason:""},status=row.status,slot=new Date(d);slot.setHours(h,0,0,0);let cls,label,clickable=false;if(status==="booked"){cls="pw-booked-cell";label="BOOKED";}else if(status==="unavailable"){const reason=String(row.public_reason||"").trim();cls="pw-blocked-cell"+(reason?" block-"+blockReasonKey20(reason):"");label=reason||"BLOCKED";}else if(slot<=now){cls="pw-past-cell";label="PAST";}else{cls="pw-available-cell";label="AVAILABLE";clickable=true;}const b=document.createElement(clickable?"button":"div");b.className=`pw-cell ${cls}`;b.textContent=label;if(clickable){b.type="button";b.onclick=()=>jumpFromWeekToBooking(ds,h);}publicWeekGrid.appendChild(b);}
  }
}
async function jumpFromWeekToBooking(ds,h){const [y,m,d]=ds.split("-").map(Number);selectedDate=new Date(y,m-1,d);selectedStart=h;selectedEnd=null;view=new Date(y,m-1,1);weekPreviewModal.classList.add("hidden");await loadMonthSchedule();selectedStart=h;populateEndTimes();clientStart.value=String(h);document.getElementById("booking").scrollIntoView({behavior:"smooth",block:"start"});updateSummary();}
async function openWeekPreview(){weekPreviewModal.classList.remove("hidden");await loadPublicWeekPreview();}
[document.getElementById("weekPreviewBtn"),document.getElementById("weekPreviewNav")].filter(Boolean).forEach(b=>b.onclick=async()=>{mainNav.classList.remove("open");menuBtn.setAttribute("aria-expanded","false");await openWeekPreview();});
if(document.getElementById("closeWeekPreview"))document.getElementById("closeWeekPreview").onclick=()=>weekPreviewModal.classList.add("hidden");
if(weekPreviewModal)weekPreviewModal.onclick=e=>{if(e.target===weekPreviewModal)weekPreviewModal.classList.add("hidden");};


// ===== v17-B public engagement, programs, testimonials, live availability, PWA =====
const focusLabels={beginner:"Beginner Fundamentals","serve-return":"Serve & Return",footwork:"Footwork",dinking:"Dinking & Kitchen Play",consistency:"Consistency",strategy:"Game Strategy",tournament:"Tournament Preparation"};
const focusKeywords={beginner:["beginner","fundamental","foundation","basic","starting"],"serve-return":["serve","return"],footwork:["footwork","movement","move"],dinking:["dink","kitchen","nvz"],consistency:["consistency","control","rally"],strategy:["strategy","positioning","decision"],tournament:["tournament","competition","match","pressure"]};
function updateCoachingContext(){const el=document.getElementById("coachingContext");if(!el)return;const bits=[];if(selectedGoalLabel)bits.push(`<strong>Goal:</strong> ${selectedGoalLabel}`);if(selectedProgramInterest)bits.push(`<strong>Program interest:</strong> ${selectedProgramInterest.name}`);if(!bits.length){el.classList.add("hidden");el.innerHTML="";return;}el.classList.remove("hidden");el.innerHTML=`<div>${bits.join(" &nbsp;•&nbsp; ")}</div><p>This context will be included in your booking request so Kyla knows what you want to work on.</p>`;}
function programMatchesFocus(p,focus){const areas=Array.isArray(p.focus_areas)?p.focus_areas:[];if(areas.includes(focus))return true;const text=`${p.name||""} ${p.description||""} ${p.overall_goal||""}`.toLowerCase();return (focusKeywords[focus]||[]).some(k=>text.includes(k));}
function chooseGoal(focus,label){selectedGoalFocus=focus;selectedGoalLabel=label||focusLabels[focus];document.querySelectorAll("#goalOptions button").forEach(b=>b.classList.toggle("active",b.dataset.focus===focus));renderGoalRecommendation();updateCoachingContext();updateSummary();}
function renderGoalRecommendation(){const box=document.getElementById("goalRecommendation");if(!box||!selectedGoalFocus)return;const matches=publicPrograms.filter(p=>programMatchesFocus(p,selectedGoalFocus));const best=matches[0];box.classList.remove("hidden");if(best){box.innerHTML=`<div><span class="eyebrow dark">RECOMMENDED PATH</span><h3>${escapePublic(best.name)}</h3><p>${escapePublic(best.overall_goal||best.description||`A structured ${best.session_count}-session coaching program.`)} <strong>${pesoPublic(best.fixed_price)}</strong> fixed package.</p></div><div class="goal-recommendation-actions"><button type="button" class="rec-primary" id="useRecommendedProgram">Choose This Program</button><a class="rec-secondary" href="#booking">Book a Schedule</a></div>`;document.getElementById("useRecommendedProgram").onclick=()=>selectProgramInterest(best,true);}else{box.innerHTML=`<div><span class="eyebrow dark">YOUR FOCUS</span><h3>${escapePublic(selectedGoalLabel)}</h3><p>No active package is tagged for this goal yet. You can still book a regular coaching session and Kyla will see this focus in your request.</p></div><div class="goal-recommendation-actions"><a class="rec-primary" href="#booking">Find a Schedule</a></div>`;}}
function escapePublic(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function pesoPublic(v){return `₱${Number(v||0).toLocaleString("en-PH",{minimumFractionDigits:0,maximumFractionDigits:2})}`;}
function selectProgramInterest(p,scroll=true){selectedProgramInterest=p;if(Array.isArray(p.focus_areas)&&p.focus_areas.length&&!selectedGoalFocus){chooseGoal(p.focus_areas[0],focusLabels[p.focus_areas[0]]||p.focus_areas[0]);}updateCoachingContext();updateSummary();document.querySelectorAll(".public-program-card").forEach(c=>c.classList.toggle("featured",c.dataset.programId===p.id));if(scroll)document.getElementById("booking")?.scrollIntoView({behavior:"smooth",block:"start"});}
// Promos are marketing content too: never show a blank section after one mobile
// connection failure. Keep booking locked until a fresh live query succeeds.
function renderPromoConnectionFallback(grid){
  const backup=[
    {type:'one',name:'1-ON-1',players:'PRIVATE COACHING',price:'₱2,000',bonus:'Save ₱400'},
    {type:'duo',name:'DUO',players:'2 PLAYERS',price:'₱3,000',bonus:'Save ₱600'},
    {type:'group',name:'GROUP TRAINING',players:'4 PLAYERS',price:'₱5,000',bonus:'+₱1,000 per additional player'}
  ];
  grid.innerHTML='<div class="pickyla-promo-offline-note" role="status"><strong>Having trouble connecting to the live schedule.</strong> These are the advertised promo packages. Booking and current availability are temporarily locked until we reconnect.<button type="button" class="pickyla-promo-retry">Retry Connection</button></div>'+
    backup.map(p=>'<article class="public-program-card pickyla-promo-card pickyla-promo-'+p.type+'">'+
      '<span class="pickyla-promo-card-topline">5+1 COACHING HOURS PROMO</span>'+
      '<h3>'+p.name+'</h3><span class="pickyla-promo-format">'+p.players+'</span>'+
      '<span class="pickyla-promo-offer">3 days × 2 hours</span>'+
      '<div class="program-public-price">'+p.price+'</div>'+
      '<p class="pickyla-promo-price-label">FULL 6-HOUR PACKAGE</p>'+
      '<div class="pickyla-promo-savings">'+p.bonus+'</div>'+
      '<p class="pickyla-promo-reconnect-note">Live availability required before booking.</p>'+
      '<div class="program-public-actions"><button type="button" class="pickyla-promo-retry">Reconnect to Schedule</button></div>'+
    '</article>').join('');
  grid.querySelectorAll('.pickyla-promo-retry').forEach(btn=>btn.addEventListener('click',()=>{
    grid.querySelectorAll('.pickyla-promo-retry').forEach(b=>{b.disabled=true;b.textContent='Connecting…';});
    loadPublicPrograms();
  }));
}
let lastPromoRequest=0;
async function loadPublicPrograms(){
  const grid=document.getElementById("publicProgramGrid");if(!grid)return;
  const request=++lastPromoRequest;
  let result={data:null,error:new Error('Not connected')};
  for(let attempt=0;attempt<3;attempt++){
    try{
      result=await db.from("coaching_programs")
        .select("id,name,session_count,session_duration_hours,fixed_price,package_additional_player_price,package_format,package_min_participants,package_max_participants,is_active")
        .eq("is_active",true).order("created_at");
    }catch(err){result={data:null,error:err};}
    if(request!==lastPromoRequest)return;
    if(!result.error&&Array.isArray(result.data)&&result.data.length)break;
    if(attempt<2)await new Promise(resolve=>setTimeout(resolve,(attempt+1)*650));
  }
  if(request!==lastPromoRequest)return;
  if(result.error||!result.data?.length){
    console.warn('[Pickyla Promos] Public program query failed:',result.error?.code||'',result.error?.message||'No active programs returned');
    if(!grid.querySelector('.program-interest'))renderPromoConnectionFallback(grid);
    return;
  }
  const programs=result.data;
  let sessions=[];
  try{
    const details=await db.from("coaching_program_sessions")
      .select("program_id,session_number,title,goal").order("session_number");
    if(!details.error)sessions=details.data||[];
    else console.warn('[Pickyla Promos] Session goals could not load:',details.error?.code||'');
  }catch(_){ /* The promo cards do not depend on optional goal descriptions. */ }
  if(request!==lastPromoRequest)return;
  const byProgram=new Map();
  (sessions||[]).forEach(row=>{
    if(!byProgram.has(row.program_id))byProgram.set(row.program_id,[]);
    byProgram.get(row.program_id).push(row);
  });
  publicPrograms=(programs||[]).map(p=>({...p,sessions:byProgram.get(p.id)||[]}));
  if(!publicPrograms.length){
    grid.innerHTML='<div class="public-loading">Coaching promos are being prepared. Regular coaching is available below.</div>';
    return;
  }
  const kindOrder={one:0,duo:1,group:2};
  const ordered=[...publicPrograms].sort((a,b)=>(kindOrder[a.package_format]??3)-(kindOrder[b.package_format]??3));
  grid.innerHTML="";
  ordered.forEach(p=>{
    const type=p.package_format||(/group/i.test(p.name)?"group":/duo/i.test(p.name)?"duo":"one");
    const sessionHours=Number(p.session_count||0)*Number(p.session_duration_hours||0);
    const formatNames={one:"1-ON-1",duo:"DUO",group:"GROUP TRAINING"};
    const icons={one:"♙",duo:"♙ ♙",group:"♙ ♙ ♙"};
    const persons={one:"PRIVATE COACHING",duo:"2 PLAYERS",group:(Number(p.package_min_participants||4))+" PLAYERS PER GROUP"};
    const save={one:"Save ₱400",duo:"Save ₱600"};
    const extra=Number(p.package_additional_player_price||0);
    const extras=type==="group"&&extra>0?
      '<span class="pickyla-promo-extra">+'+pesoPublic(extra)+' per additional player</span>':'';
    const goals=(p.sessions||[]).slice(0,Math.min(14,Number(p.session_count)||3)).map(item=>
      '<div class="program-goal-public"><b>'+escapePublic(item.session_number)+'</b><div><strong>'+escapePublic(item.title)+'</strong>'+
      (item.goal?'<small>'+escapePublic(item.goal)+'</small>':'')+'</div></div>'
    ).join("");
    const card=document.createElement("article");
    card.className="public-program-card pickyla-promo-card pickyla-promo-"+type;
    card.dataset.programId=p.id;
    card.innerHTML=
      '<span class="pickyla-promo-card-topline">'+(type==="duo"?"BETTER TOGETHER":type==="group"?"TRAIN AS A TEAM":"PERSONAL COACHING")+'</span>'+
      '<div class="pickyla-promo-card-symbol" aria-hidden="true">'+icons[type]+'</div>'+
      '<h3>'+escapePublic(formatNames[type])+'</h3>'+
      '<span class="pickyla-promo-format">'+escapePublic(persons[type])+'</span>'+
      '<span class="pickyla-promo-offer">5+1 COACHING HOURS</span>'+
      '<div class="program-public-price">'+pesoPublic(p.fixed_price)+'</div>'+
      '<p class="pickyla-promo-price-label">FULL 6-HOUR PACKAGE</p>'+
      '<div class="pickyla-promo-benefits">'+
        '<div><span aria-hidden="true">✓</span> 5 paid hours + 1 FREE hour</div>'+
        '<div><span aria-hidden="true">✓</span> '+escapePublic(p.session_count)+' coaching days × '+escapePublic(p.session_duration_hours)+' consecutive hours</div>'+
        '<div><span aria-hidden="true">✓</span> '+sessionHours+' hours total • Valid within 14 days</div>'+
        (type==="group"?'<div><span aria-hidden="true">✓</span> '+pesoPublic(Number(p.fixed_price)/Math.max(1,Number(p.package_min_participants||4)))+' per player at base group size</div>':type==="duo"?'<div><span aria-hidden="true">✓</span> '+pesoPublic(Number(p.fixed_price)/2)+' per player</div>':'')+
      '</div>'+
      '<div class="pickyla-promo-savings">'+(save[type]||'GROUP VALUE PACKAGE')+'</div>'+
      extras+
      (goals?'<details class="pickyla-promo-details"><summary>See coaching session goals</summary><div class="program-goals-public">'+goals+'</div></details>':'')+
      '<div class="program-public-actions"><button type="button" class="program-interest">Choose Promo Schedule</button></div>';
    card.querySelector(".program-interest").onclick=()=>selectProgramInterest(p,true);
    grid.appendChild(card);
  });
  if(selectedGoalFocus)renderGoalRecommendation();
}
window.addEventListener('online',()=>{
  const grid=document.getElementById('publicProgramGrid');
  if(grid&&!grid.querySelector('.program-interest'))loadPublicPrograms();
});
document.addEventListener('visibilitychange',()=>{
  const grid=document.getElementById('publicProgramGrid');
  if(document.visibilityState==='visible'&&grid&&grid.querySelector('.pickyla-promo-offline-note'))loadPublicPrograms();
});
async function loadTestimonials(){const section=document.getElementById("testimonialsSection"),grid=document.getElementById("testimonialGrid");if(!section||!grid)return;section.classList.remove("hidden");const {data,error}=await db.from("testimonials").select("display_name,player_level,quote,sort_order").eq("is_published",true).eq("review_status","approved").order("sort_order").order("created_at");if(error||!(data||[]).length){grid.innerHTML='<div class="testimonial-empty">Published player stories will appear here. You can be the first to share your experience.</div>';return;}grid.innerHTML=(data||[]).map(t=>`<article class="testimonial-card"><div class="quote-mark">“</div><blockquote>${escapePublic(t.quote)}</blockquote><strong>${escapePublic(t.display_name)}</strong><small>${escapePublic(t.player_level||"Pickyla Client")}</small></article>`).join("");}
async function loadLiveAvailabilityIndicator(){const badge=document.getElementById("liveAvailabilityBadge");if(!badge)return;const now=new Date(),sun=new Date(now);sun.setHours(0,0,0,0);sun.setDate(sun.getDate()-sun.getDay());const sat=new Date(sun);sat.setDate(sun.getDate()+6);const {data,error}=await db.from("public_schedule").select("slot_date,start_hour,status").gte("slot_date",keyDate(sun)).lte("slot_date",keyDate(sat));if(error){badge.querySelector("strong").textContent="Live schedule available below";return;}const map=new Map((data||[]).map(r=>[`${r.slot_date}|${Number(r.start_hour)}`,r.status]));let open=0,todayOpen=0;for(let i=0;i<7;i++){const d=new Date(sun);d.setDate(sun.getDate()+i);for(let h=8;h<24;h++){const slot=new Date(d);slot.setHours(h,0,0,0);if(slot<=now)continue;if((map.get(`${keyDate(d)}|${h}`)||"available")==="available"){open++;if(keyDate(d)===keyDate(now))todayOpen++;}}}badge.classList.remove("limited","full");if(open===0){badge.classList.add("full");badge.querySelector("strong").textContent="No open hours left this week";}else if(open<=5){badge.classList.add("limited");badge.querySelector("strong").textContent=`Limited availability • ${open} open hour${open===1?"":"s"} this week`;}else{badge.querySelector("strong").textContent=todayOpen?`${todayOpen} open hour${todayOpen===1?"":"s"} today • ${open} this week`:`${open} open coaching hours this week`;}}
// v17-E public testimonial submission -> admin review first.
const publicTestimonialDialog=document.getElementById("publicTestimonialDialog"),publicTestimonialForm=document.getElementById("publicTestimonialForm"),publicTestimonialStatus=document.getElementById("publicTestimonialStatus");
function setPublicTestimonialStatus(kind,text){if(!publicTestimonialStatus)return;publicTestimonialStatus.className=`public-testimonial-status ${kind}`;publicTestimonialStatus.textContent=text;}
function closePublicTestimonial(){publicTestimonialDialog?.close();if(publicTestimonialStatus){publicTestimonialStatus.className="public-testimonial-status hidden";publicTestimonialStatus.textContent="";}}
if(document.getElementById("writeTestimonialBtn"))document.getElementById("writeTestimonialBtn").onclick=()=>{publicTestimonialForm?.reset();if(publicTestimonialStatus)publicTestimonialStatus.className="public-testimonial-status hidden";publicTestimonialDialog?.showModal();};
if(document.getElementById("closePublicTestimonial"))document.getElementById("closePublicTestimonial").onclick=closePublicTestimonial;if(document.getElementById("cancelPublicTestimonial"))document.getElementById("cancelPublicTestimonial").onclick=closePublicTestimonial;
if(publicTestimonialForm)publicTestimonialForm.onsubmit=async e=>{e.preventDefault();const first=smartName(document.getElementById("testimonialFirstName").value),last=smartName(document.getElementById("testimonialLastName").value),level=cleanSpaces(document.getElementById("publicTestimonialLevel").value),quote=cleanSpaces(document.getElementById("publicTestimonialQuote").value);if(!first||!last)return setPublicTestimonialStatus("error","Please enter your first and last name.");if(quote.length<8)return setPublicTestimonialStatus("error","Please write a little more about your experience.");if(!document.getElementById("publicTestimonialConsent").checked)return setPublicTestimonialStatus("error","Please confirm permission for Pickyla to review and publish your testimonial.");const submit=publicTestimonialForm.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent="Submitting…";const {error}=await db.rpc("submit_public_testimonial_v17e",{p_display_name:`${first} ${last}`,p_player_level:level||null,p_quote:quote});submit.disabled=false;submit.textContent="Submit for Review";if(error)return setPublicTestimonialStatus("error",error.message||"Could not submit your testimonial. Please try again.");publicTestimonialForm.reset();setPublicTestimonialStatus("ok","Thank you! Your testimonial was sent to Pickyla Admin for review. It will only appear publicly after approval.");};

document.querySelectorAll("#goalOptions button").forEach(b=>b.onclick=()=>chooseGoal(b.dataset.focus,b.dataset.label));
loadPublicPrograms();loadTestimonials();loadLiveAvailabilityIndicator();

// PWA: static shell only. Supabase data remains network-fresh.
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}));}
let deferredInstallPrompt=null;const installBtn=document.getElementById("installPickylaBtn");window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;if(installBtn)installBtn.classList.remove("hidden");});if(installBtn)installBtn.onclick=async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;installBtn.classList.add("hidden");};window.addEventListener("appinstalled",()=>{if(installBtn)installBtn.classList.add("hidden");});
