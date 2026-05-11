
const $ = (id) => document.getElementById(id);
const LS_KEY = window.WFC_CONFIG.LOCAL_STORAGE_KEY;

const PAST_EVENTS = [
  ["[ S03E03 ]","2026-03-04"],["[ S03E04 ]","2026-03-11"],["[ S03E05 ]","2026-03-18"],
  ["[ S03E06 ]","2026-03-25"],["[ S03E07 ]","2026-04-01"],["[ S03E08 ]","2026-04-08"],
  ["[ S03E09 ]","2026-04-15"],["[ S03E10 ]","2026-04-22"],["[ S03E11 ]","2026-04-29"],
  ["[ S03E12 ]","2026-05-06"]
].map(([code,date]) => ({
  code, title: "WARSAW FC MATCHDAY", date, season: "S03", status: "completed",
  players: [], matches: [], goals: []
}));

const DEFAULT_PLAYERS = [
  ["Bartosz Piwiński","WFC 1"],["Bartek Nowak","WFC 1"],["Mateusz Żywulski","WFC 1"],
  ["Karol Machulski","WFC 2"],["Marcel Michalczyk","WFC 2"],["Kamil Junior","WFC 2"],
  ["Michał Rycaj","WFC 3"],["Weronika Samulska","WFC 3"],["Bartek Barzał","WFC 3"],
  ["Damian Gawrych","WFC 4"],["Daniel Kleber","WFC 4"],["Patryk Junior","WFC 4"],
  ["Kamil Machulski","WFC 5"],["Hubert Majewski","WFC 5"],["Szymon Kwiatkowski","WFC 5"],
  ["Fernando Morales","WFC 6"],["Marcin Szejba","WFC 6"],["Bartosz Jabłoński","WFC 6"]
].map(([name,team]) => ({ name, team, present: true, level: 2, goals: 0, position: "", instagram: "", photo: "", notes: "" }));

let state = {
  role: "guest",
  user: null,
  mode: "public",
  currentView: "live",
  event: { code: "[ S03E12 ]", title: "WARSAW FC MATCHDAY" },
  teams: Array.from({length: 6}, (_,i)=>`WFC ${i+1}`),
  players: DEFAULT_PLAYERS,
  rounds: [],
  currentRound: 0,
  duration: 300,
  remaining: 300,
  timerId: null,
  scores: {},
  goalEvents: {},
  history: PAST_EVENTS
};

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify({...state, timerId: null}));
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY));
    if (saved) state = {...state, ...saved, timerId: null};
  } catch {}
}

function initials(name) {
  return (name || "WFC").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
}

function setMode(mode) {
  state.mode = mode;
  document.body.classList.toggle("public-mode", mode === "public");
  document.body.classList.toggle("tv-mode", mode === "tv");
  $("modeLabel").textContent = mode.toUpperCase();
  save();
}

function setRole(role) {
  state.role = role;
  if (role !== "admin") setMode("public");
  else setMode("admin");
  renderSession();
}

function showView(view) {
  const allowed = ["live","season","ranking","profiles","schedule","tvSimple"];
  if (!allowed.includes(view)) view = "live";
  if (state.mode === "tv" && view !== "tvSimple") setMode(state.role === "admin" ? "admin" : "public");
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll("[data-view]").forEach(b => b.classList.remove("active"));
  const el = $(view + "View");
  if (el) el.classList.add("active");
  document.querySelectorAll(`[data-view="${view}"]`).forEach(b => b.classList.add("active"));
  state.currentView = view;
  window.scrollTo({top:0, behavior:"smooth"});
}

function renderSession() {
  $("sessionText").textContent = state.user ? `${state.user.name} · ${state.role}` : `Guest · ${state.role}`;
}

function openAuth(tab="login") {
  $("authModal").classList.add("active");
  switchAuthTab(tab);
}

function closeAuth() {
  $("authModal").classList.remove("active");
}

function switchAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll("[data-auth-tab]").forEach(b=>b.classList.remove("active"));
  $(tab + "Tab").classList.add("active");
  document.querySelector(`[data-auth-tab="${tab}"]`)?.classList.add("active");
}

async function login() {
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value.trim();
  if (!email || !password) return alert("Wpisz email i hasło.");
  try {
    const user = await WFC_SUPABASE.signIn(email, password);
    let profile = await WFC_SUPABASE.getProfile(user.id);
    if (!profile) profile = await WFC_SUPABASE.upsertProfile(user, {nickname: email.split("@")[0], role:"player"});
    state.user = { id: user.id, email: user.email, name: profile.nickname || profile.full_name || user.email };
    setRole(profile.role || "player");
    closeAuth();
    await pullProfiles();
    render();
  } catch (e) {
    alert("Logowanie nieudane: " + e.message);
  }
}

async function register() {
  const name = $("registerName").value.trim();
  const email = $("registerEmail").value.trim();
  const password = $("registerPassword").value.trim();
  if (!name || !email || !password) return alert("Wpisz nick, email i hasło.");
  try {
    const user = await WFC_SUPABASE.signUp(email, password, { nickname: name });
    const profile = await WFC_SUPABASE.upsertProfile(user, {
      nickname: name,
      full_name: name,
      position: $("registerPosition").value.trim(),
      instagram: $("registerInstagram").value.trim(),
      role: "player"
    });
    state.user = { id: user.id, email: user.email, name };
    setRole(profile.role || "player");
    addOrUpdatePlayer({name, present:true, team:"", level:2, goals:0, position:profile.position, instagram:profile.instagram, photo:"", notes:""});
    closeAuth();
    render();
  } catch (e) {
    alert("Rejestracja nieudana: " + e.message);
  }
}

async function logout() {
  await WFC_SUPABASE.signOut();
  state.user = null;
  setRole("guest");
  showView("live");
  save();
  render();
}

async function switchAccount() {
  await logout();
  openAuth("login");
}

function continueGuest() {
  state.user = null;
  setRole("guest");
  closeAuth();
  showView("live");
}

function requireAdmin() {
  if (state.role !== "admin") {
    alert("Ta akcja jest dostępna tylko dla admina.");
    return false;
  }
  return true;
}

function addOrUpdatePlayer(player) {
  const found = state.players.find(p => p.name.toLowerCase() === player.name.toLowerCase());
  if (found) Object.assign(found, player);
  else state.players.push(player);
}

async function pullProfiles() {
  try {
    const profiles = await WFC_SUPABASE.fetchProfiles();
    profiles.forEach(p => addOrUpdatePlayer({
      name: p.nickname || p.full_name || "Player",
      present: false,
      team: "",
      level: 2,
      goals: Number(p.goals || 0),
      position: p.position || "",
      instagram: p.instagram || "",
      photo: p.avatar_url || "",
      notes: p.bio || ""
    }));
    save();
    render();
  } catch (e) {
    console.warn(e.message);
  }
}

function setupTeams() {
  const count = Number($("teamCount").value || 6);
  state.teams = Array.from({length: count}, (_,i)=>`WFC ${i+1}`);
}

function buildSchedule() {
  const teams = state.teams;
  const pitchCount = Number($("pitchCount").value || 3);
  const mode = $("scheduleMode").value;
  const matches = [];
  for (let i=0;i<teams.length;i++) for (let j=i+1;j<teams.length;j++) matches.push([teams[i], teams[j], false, "MECZ"]);
  if (mode === "double") for (let i=0;i<teams.length;i++) for (let j=i+1;j<teams.length;j++) matches.push([teams[j], teams[i], false, "REWANŻ"]);

  const remaining = matches.slice();
  const rounds = [];
  while (remaining.length) {
    const used = new Set();
    const slot = [];
    for (let i=0;i<remaining.length && slot.length<pitchCount;i++) {
      const [a,b] = remaining[i];
      if (!used.has(a) && !used.has(b)) {
        slot.push(remaining[i]);
        used.add(a); used.add(b);
        remaining.splice(i,1); i--;
      }
    }
    while (slot.length < pitchCount && teams.length >= pitchCount*2) {
      const available = teams.filter(t => !used.has(t));
      if (available.length < 2) break;
      slot.push([available[0], available[1], true, "BONUS"]);
      used.add(available[0]); used.add(available[1]);
    }
    rounds.push(slot);
  }
  return rounds;
}

function generateSchedule() {
  if (!requireAdmin()) return;
  setupTeams();
  state.duration = Number($("matchMinutes").value || 5) * 60;
  state.remaining = state.duration;
  state.currentRound = 0;
  state.rounds = buildSchedule();
  state.scores = {};
  state.goalEvents = {};
  save();
  render();
}

function formatTime(sec) {
  return `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
}

function currentLabels() {
  return Array.from({length:Number($("pitchCount").value || 3)}, (_,i)=>`BOISKO NR ${i+1}`);
}

function matchId(round, pitch) {
  return `${round}-${pitch}`;
}

function setScore(id, idx, value) {
  if (!requireAdmin()) return;
  state.scores[id] = state.scores[id] || ["",""];
  state.scores[id][idx] = value;
  save(); render();
}

function addGoal(id, playerName, team) {
  if (!requireAdmin()) return;
  state.goalEvents[id] = state.goalEvents[id] || [];
  state.goalEvents[id].push({playerName, team, at:new Date().toISOString()});
  syncScoreFromGoals(id);
  rebuildPlayerGoals();
  save(); render();
}

function removeGoal(id, playerName, team) {
  if (!requireAdmin()) return;
  const list = state.goalEvents[id] || [];
  for (let i=list.length-1;i>=0;i--) {
    if (list[i].playerName === playerName && list[i].team === team) { list.splice(i,1); break; }
  }
  syncScoreFromGoals(id);
  rebuildPlayerGoals();
  save(); render();
}

function syncScoreFromGoals(id) {
  const [r,p] = id.split("-").map(Number);
  const match = state.rounds[r]?.[p];
  if (!match) return;
  const goals = state.goalEvents[id] || [];
  state.scores[id] = [
    String(goals.filter(g=>g.team===match[0]).length),
    String(goals.filter(g=>g.team===match[1]).length)
  ];
}

function rebuildPlayerGoals() {
  state.players.forEach(p=>p.goals=0);
  Object.values(state.goalEvents).flat().forEach(g => {
    const p = state.players.find(x=>x.name===g.playerName);
    if (p) p.goals++;
  });
}

function goalCount(id, playerName) {
  return (state.goalEvents[id] || []).filter(g=>g.playerName===playerName).length;
}

function startTimer() {
  if (!requireAdmin()) return;
  pauseTimer(false);
  state.timerId = setInterval(() => {
    if (state.remaining > 0) {
      state.remaining--;
      render(false);
    } else pauseTimer(false);
  }, 1000);
}

function pauseTimer(shouldRender=true) {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
  if (shouldRender) render(false);
}

function resetTimer() {
  if (!requireAdmin()) return;
  pauseTimer(false);
  state.remaining = state.duration;
  save(); render();
}

function goRound(delta) {
  if (!requireAdmin()) return;
  const next = state.currentRound + delta;
  if (next >= 0 && next < state.rounds.length) {
    state.currentRound = next;
    state.remaining = state.duration;
    save(); render();
  }
}

function jumpRound(i) {
  if (!requireAdmin()) return;
  state.currentRound = i;
  state.remaining = state.duration;
  save(); render();
}

function addPlayer() {
  if (!requireAdmin()) return;
  const name = $("newPlayerName").value.trim();
  if (!name) return;
  addOrUpdatePlayer({name, present:true, team:"", level:2, goals:0, position:"", instagram:"", photo:"", notes:""});
  $("newPlayerName").value = "";
  save(); render();
}

function markAll() {
  if (!requireAdmin()) return;
  state.players.forEach(p=>p.present=true);
  save(); render();
}

function clearPlayers() {
  if (!requireAdmin()) return;
  if (!confirm("Wyczyścić zawodników?")) return;
  state.players = [];
  save(); render();
}

function updatePlayer(index, field, value) {
  const p = state.players[index];
  if (!p) return;
  if (state.role !== "admin" && !["position","instagram","photo","notes"].includes(field)) return alert("Brak uprawnień.");
  if (field === "present") p.present = value;
  else if (field === "level") p.level = Number(value);
  else if (field === "goals") p.goals = Number(value);
  else p[field] = value;
  save(); render();
}

function balanceTeams() {
  if (!requireAdmin()) return;
  const present = state.players.filter(p=>p.present);
  if (present.length > state.teams.length * 4) return alert(`Za dużo zawodników. Maks: ${state.teams.length*4}`);
  state.players.forEach(p=>p.team="");
  const buckets = state.teams.map(t=>({team:t, players:[], power:0}));
  present.sort((a,b)=>b.level-a.level || Math.random()-.5).forEach(p => {
    let choices = buckets.filter(b=>b.players.length<3);
    if (!choices.length) choices = buckets.filter(b=>b.players.length<4);
    choices.sort((a,b)=>a.power-b.power || a.players.length-b.players.length);
    choices[0].players.push(p);
    choices[0].power += p.level;
    p.team = choices[0].team;
  });
  save(); render();
}

function standings() {
  const table = {};
  state.teams.forEach(t=>table[t]={team:t,m:0,p:0,gf:0,ga:0,gd:0});
  state.rounds.forEach((round,ri)=>round.forEach((m,pi)=>{
    if (m[2]) return;
    const s = state.scores[matchId(ri,pi)];
    if (!s || s[0] === "" || s[1] === "") return;
    const a = Number(s[0]), b = Number(s[1]);
    const A = table[m[0]], B = table[m[1]];
    if (!A || !B) return;
    A.m++; B.m++; A.gf+=a; A.ga+=b; B.gf+=b; B.ga+=a;
    if (a>b) A.p+=3; else if (b>a) B.p+=3; else {A.p++;B.p++;}
  }));
  return Object.values(table).map(x=>({...x,gd:x.gf-x.ga})).sort((a,b)=>b.p-a.p || b.gd-a.gd || b.gf-a.gf);
}

function saveEvent() {
  if (!requireAdmin()) return;
  const ev = {
    code: state.event.code,
    title: state.event.title,
    date: new Date().toISOString().slice(0,10),
    season: "S03",
    status: "completed",
    players: state.players.filter(p=>p.present).map(p=>({...p})),
    matches: state.rounds,
    goals: state.goalEvents,
    standings: standings()
  };
  const idx = state.history.findIndex(e=>e.code===ev.code);
  if (idx >= 0 && !confirm("Nadpisać ustawkę?")) return;
  if (idx>=0) state.history[idx] = ev; else state.history.push(ev);
  save(); render();
}

async function saveEventOnline() {
  if (!requireAdmin()) return;
  try {
    await WFC_SUPABASE.upsertEvent({
      code: state.event.code,
      title: state.event.title,
      date: new Date().toISOString().slice(0,10),
      season: "S03",
      status: "completed"
    });
    alert("Zapisano event online.");
  } catch(e) {
    alert("Błąd Supabase: " + e.message);
  }
}

function exportBase() {
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "warsaw-fc-base.json";
  a.click();
}

function importBase(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = {...state, ...JSON.parse(reader.result), timerId:null};
      save(); render();
    } catch { alert("Błędny plik."); }
  };
  reader.readAsText(file);
}

function resetLocal() {
  if (!confirm("Wyczyścić lokalne dane?")) return;
  localStorage.removeItem(LS_KEY);
  location.reload();
}

function openPlayerProfile(name) {
  const p = state.players.find(x=>x.name===name);
  if (!p) return;
  const events = state.history.filter(e => (e.players||[]).some(ep=>ep.name===name));
  const goals = p.goals + events.reduce((sum,e)=>sum + Object.values(e.goals||{}).flat().filter(g=>g.playerName===name).length, 0);
  $("playerProfile").innerHTML = `
    <div class="brand-row">
      <div class="logo">${initials(p.name)}</div>
      <div>
        <h2>${p.name}</h2>
        <p class="muted">${p.team || "bez teamu"} · ${p.position || "pozycja —"}</p>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="muted">Gole</div><div class="value">${goals}</div></div>
      <div class="kpi"><div class="muted">Ustawki</div><div class="value">${events.length}</div></div>
      <div class="kpi"><div class="muted">Instagram</div><div class="value" style="font-size:18px">${p.instagram || "—"}</div></div>
      <div class="kpi"><div class="muted">Poziom</div><div class="value" style="font-size:18px">${p.level===3?"pro":p.level===2?"medium":"beginner"}</div></div>
    </div>
    <h3>Historia</h3>
    ${(events.length ? events.map(e=>`<div class="card">${e.code} · ${e.date}</div>`).join("") : `<p class="muted">Brak zapisanych występów.</p>`)}
  `;
  $("playerModal").classList.add("active");
}

function closePlayerProfile() {
  $("playerModal").classList.remove("active");
}

function render() {
  state.event.code = $("eventCode").value;
  state.event.title = $("eventTitle").value;
  $("screenTitle").textContent = state.event.title;
  $("screenEventCode").textContent = state.event.code;
  $("currentRoundLabel").textContent = state.currentRound + 1;
  $("roundTotalLabel").textContent = Math.max(1,state.rounds.length);
  $("timer").textContent = formatTime(state.remaining);
  $("tvTimer").textContent = formatTime(state.remaining);
  $("tvRound").textContent = state.currentRound + 1;
  $("tvTotal").textContent = Math.max(1,state.rounds.length);

  renderSession();
  renderKpis();
  renderRounds();
  renderPitches();
  renderRosters();
  renderStandings();
  renderScorers();
  renderHistory();
  renderRanking();
  renderProfiles();
  renderSchedule();
  renderTv();
  save();
}

function renderKpis() {
  const matches = state.rounds.reduce((a,r)=>a+r.filter(m=>!m[2]).length,0);
  $("kpis").innerHTML = [
    ["Zespoły",state.teams.length],["Gracze",state.players.filter(p=>p.present).length],["Boiska",$("pitchCount").value],["Mecze",matches]
  ].map(([k,v])=>`<div class="kpi"><div class="muted">${k}</div><div class="value">${v}</div></div>`).join("");
}

function renderRounds() {
  $("roundPills").innerHTML = state.rounds.map((_,i)=>`<button class="${i===state.currentRound?"active":""}" data-round="${i}">${i+1}</button>`).join("");
}

function renderPitches() {
  const round = state.rounds[state.currentRound] || [];
  const labels = currentLabels();
  $("pitches").innerHTML = labels.map((label,i)=>{
    const m = round[i];
    if (!m) return `<div class="pitch"><div class="pitch-title">${label}</div><div class="teams">BRAK</div></div>`;
    const id = matchId(state.currentRound,i);
    const score = state.scores[id] || ["",""];
    const teamPlayers = (team) => state.players.filter(p=>p.present && p.team===team).map(p=>`
      <div class="scorer-row">
        <span class="player-link" data-player="${p.name}">${p.name}</span>
        <button class="admin-only" data-remove-goal="${id}" data-player-name="${p.name}" data-team="${team}">−</button>
        <b>${goalCount(id,p.name)}</b>
        <button class="admin-only" data-add-goal="${id}" data-player-name="${p.name}" data-team="${team}">+</button>
      </div>
    `).join("") || `<p class="muted">Brak zawodników</p>`;
    return `
      <div class="pitch">
        <div class="pitch-title">${label}</div>
        <div class="teams">${m[0]}<div class="vs">${m[2]?"BONUS":m[3]}</div>${m[1]}</div>
        <div class="score admin-only">
          <input value="${score[0]}" data-score="${id}" data-side="0" />
          <input value="${score[1]}" data-score="${id}" data-side="1" />
        </div>
        <div class="scorer-panel admin-only">
          <b>${m[0]}</b>${teamPlayers(m[0])}
          <b>${m[1]}</b>${teamPlayers(m[1])}
        </div>
      </div>
    `;
  }).join("");
}

function renderRosters() {
  $("rosters").innerHTML = state.teams.map(team=>{
    const ps = state.players.filter(p=>p.present && p.team===team);
    return `<div class="card"><b>${team}</b><p class="muted">${ps.length}/4</p>${ps.map(p=>`<div><span class="player-link" data-player="${p.name}">${p.name}</span> (${p.goals||0}g)</div>`).join("") || "—"}</div>`;
  }).join("");
}

function renderStandings() {
  $("standings").innerHTML = standings().map((r,i)=>`<tr><td>${i+1}</td><td>${r.team}</td><td>${r.m}</td><td>${r.p}</td><td>${r.gd>=0?"+":""}${r.gd}</td></tr>`).join("");
}

function renderScorers() {
  const scorers = state.players.filter(p=>p.present).slice().sort((a,b)=>(b.goals||0)-(a.goals||0));
  $("topScorers").innerHTML = scorers.slice(0,10).map((p,i)=>`<div class="card">#${i+1} <span class="player-link" data-player="${p.name}">${p.name}</span> — <b>${p.goals||0}</b></div>`).join("");
  const goals = Object.values(state.goalEvents).flat().slice(-8).reverse();
  $("lastGoals").innerHTML = goals.map(g=>`<div class="card"><span class="player-link" data-player="${g.playerName}">${g.playerName}</span> · ${g.team}</div>`).join("") || `<p class="muted">Brak goli.</p>`;
}

function renderHistory() {
  $("historyList").innerHTML = state.history.map(e=>`<div class="card"><b>${e.code}</b><p class="muted">${e.date || ""} · ${(e.players||[]).length} graczy</p></div>`).join("");
  const totalPlayers = new Set();
  state.history.forEach(e=>(e.players||[]).forEach(p=>totalPlayers.add(p.name)));
  $("seasonOverview").innerHTML = [
    ["Ustawki",state.history.length],["Unikalni gracze",totalPlayers.size],["Obecna lista",state.players.length],["Sezon","S03"]
  ].map(([k,v])=>`<div class="kpi"><div class="muted">${k}</div><div class="value">${v}</div></div>`).join("");
}

function renderRanking() {
  const map = {};
  state.history.forEach(e=>(e.players||[]).forEach(p=>{
    map[p.name] = map[p.name] || {name:p.name,events:0,goals:0};
    map[p.name].events++;
  }));
  state.players.forEach(p=>{
    map[p.name] = map[p.name] || {name:p.name,events:0,goals:0};
    map[p.name].goals += Number(p.goals||0);
  });
  const rows = Object.values(map).sort((a,b)=>b.goals-a.goals || b.events-a.events);
  $("rankingTable").innerHTML = rows.map((p,i)=>`<tr><td>${i+1}</td><td><span class="player-link" data-player="${p.name}">${p.name}</span></td><td>${p.events}</td><td>${p.goals}</td><td>${p.events?(p.goals/p.events).toFixed(1):"0.0"}</td></tr>`).join("");
}

function renderProfiles() {
  $("profilesGrid").innerHTML = state.players.slice().sort((a,b)=>a.name.localeCompare(b.name)).map((p,i)=>`
    <div class="card profile-card" data-player="${p.name}">
      <b>${p.name}</b>
      <p class="muted">${p.team || "bez teamu"} · ${p.position || "pozycja —"}</p>
      <p>${p.goals||0} goli</p>
      <div class="admin-only">
        <input placeholder="pozycja" value="${p.position||""}" data-player-field="${i}:position" />
        <input placeholder="instagram" value="${p.instagram||""}" data-player-field="${i}:instagram" />
      </div>
    </div>
  `).join("");
}

function renderSchedule() {
  $("fullSchedule").innerHTML = state.rounds.map((round,ri)=>`
    <div class="card">
      <b>Start ${ri+1}</b>
      ${round.map((m,pi)=>`<div>${currentLabels()[pi]} · ${m[0]} vs ${m[1]} · ${m[2]?"BONUS":m[3]}</div>`).join("")}
    </div>
  `).join("");
}

function renderTv() {
  const round = state.rounds[state.currentRound] || [];
  $("tvCurrent").innerHTML = round.map(m=>`<div class="card"><b>${m[0]}</b><div class="vs">${m[2]?"BONUS":m[3]}</div><b>${m[1]}</b></div>`).join("");
  const next = state.rounds[state.currentRound+1] || [];
  $("tvNext").innerHTML = next.map(m=>`<div class="card">${m[0]} vs ${m[1]}</div>`).join("") || `<p class="muted">Koniec terminarza.</p>`;
  $("tvStandings").innerHTML = `<table>${standings().slice(0,8).map((r,i)=>`<tr><td>${i+1}</td><td>${r.team}</td><td>${r.p}</td></tr>`).join("")}</table>`;
  $("tvScorers").innerHTML = state.players.filter(p=>p.present).sort((a,b)=>(b.goals||0)-(a.goals||0)).slice(0,8).map((p,i)=>`<div class="card">#${i+1} ${p.name} — ${p.goals||0}</div>`).join("");
}

function bindEvents() {
  document.addEventListener("click", async (e)=>{
    const viewBtn = e.target.closest("[data-view]");
    if (viewBtn) return showView(viewBtn.dataset.view);

    const player = e.target.closest("[data-player]");
    if (player && !e.target.closest("button")) return openPlayerProfile(player.dataset.player);

    const round = e.target.closest("[data-round]");
    if (round) return jumpRound(Number(round.dataset.round));

    const add = e.target.closest("[data-add-goal]");
    if (add) return addGoal(add.dataset.addGoal, add.dataset.playerName, add.dataset.team);

    const rem = e.target.closest("[data-remove-goal]");
    if (rem) return removeGoal(rem.dataset.removeGoal, rem.dataset.playerName, rem.dataset.team);
  });

  document.addEventListener("change", (e)=>{
    const score = e.target.dataset.score;
    if (score) return setScore(score, Number(e.target.dataset.side), e.target.value);

    const pf = e.target.dataset.playerField;
    if (pf) {
      const [i,field] = pf.split(":");
      updatePlayer(Number(i), field, e.target.value);
    }
  });

  document.querySelectorAll("[data-auth-tab]").forEach(b=>b.addEventListener("click",()=>switchAuthTab(b.dataset.authTab)));
  $("loginBtn").addEventListener("click", login);
  $("registerBtn").addEventListener("click", register);
  $("guestBtn").addEventListener("click", continueGuest);
  $("openAuthBtn").addEventListener("click", ()=>openAuth("login"));
  $("switchAccountBtn").addEventListener("click", switchAccount);
  $("logoutBtn").addEventListener("click", logout);
  $("modeAdminBtn").addEventListener("click", ()=>{ if(requireAdmin()) setMode("admin"); });
  $("modePublicBtn").addEventListener("click", ()=>setMode("public"));
  $("tvBtn").addEventListener("click", ()=>{ setMode("tv"); showView("live"); });
  $("tvSimpleBtn").addEventListener("click", ()=>{ setMode("tv"); showView("tvSimple"); });
  $("exitTvBtn").addEventListener("click", ()=>{ setMode(state.role==="admin"?"admin":"public"); showView("live"); });
  $("generateBtn").addEventListener("click", generateSchedule);
  $("startTimerBtn").addEventListener("click", startTimer);
  $("pauseTimerBtn").addEventListener("click", pauseTimer);
  $("resetTimerBtn").addEventListener("click", resetTimer);
  $("prevRoundBtn").addEventListener("click", ()=>goRound(-1));
  $("nextRoundBtn").addEventListener("click", ()=>goRound(1));
  $("addPlayerBtn").addEventListener("click", addPlayer);
  $("balanceTeamsBtn").addEventListener("click", balanceTeams);
  $("markAllBtn").addEventListener("click", markAll);
  $("clearPlayersBtn").addEventListener("click", clearPlayers);
  $("saveEventBtn").addEventListener("click", saveEvent);
  $("exportBtn").addEventListener("click", exportBase);
  $("importBtn").addEventListener("click", ()=>$("importFile").click());
  $("importFile").addEventListener("change", (e)=> e.target.files[0] && importBase(e.target.files[0]));
  $("resetLocalBtn").addEventListener("click", resetLocal);
  $("closePlayerModal").addEventListener("click", closePlayerProfile);

  ["eventCode","eventTitle","matchMinutes","pitchCount","teamCount","scheduleMode"].forEach(id=>{
    $(id).addEventListener("change", ()=>{ if(id==="teamCount") setupTeams(); save(); render(); });
  });
}

async function init() {
  for (let i=6;i<=20;i++) $("teamCount").innerHTML += `<option value="${i}" ${i===6?"selected":""}>${i} zespołów</option>`;
  load();
  $("eventCode").value = state.event.code || window.WFC_CONFIG.DEFAULT_EVENT_CODE;
  $("eventTitle").value = state.event.title || "WARSAW FC MATCHDAY";
  $("teamCount").value = String(state.teams.length || 6);
  bindEvents();

  const session = await WFC_SUPABASE.getSession();
  if (session?.user) {
    try {
      const profile = await WFC_SUPABASE.getProfile(session.user.id);
      state.user = { id: session.user.id, email: session.user.email, name: profile?.nickname || session.user.email };
      setRole(profile?.role || "player");
    } catch { setRole("guest"); }
  } else setRole("guest");

  if (!state.rounds.length) {
    state.duration = Number($("matchMinutes").value || 5)*60;
    state.remaining = state.duration;
    state.rounds = buildSchedule();
  }
  render();
}

init();
