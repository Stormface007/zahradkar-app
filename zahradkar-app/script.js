// URL vašeho Google Apps Scriptu
const SERVER_URL = "https://script.google.com/macros/s/AKfycby5Q582sTjMVzHDwInTpUQqQDbMMaZoAT90Lv1hEiB8rcRVs3XX21JUKYNmg16nYsGW/exec";

let aktualniZahon = null;

// -------- Přihlášení / odhlášení --------
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  try {
    const res  = await fetch(`${SERVER_URL}?action=login`, {
      method: "POST",
      body: new URLSearchParams({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem("userID", data.userID);
      document.getElementById("loginDiv").style.display = "none";
      document.getElementById("appDiv").style.display   = "block";
      loadZahony();
    } else {
      document.getElementById("loginMsg").innerText = "Neplatné přihlašovací údaje.";
    }
  } catch (e) {
    console.error("Login error:", e);
    document.getElementById("loginMsg").innerText = "Chyba při přihlášení.";
  }
}

function logout() {
  localStorage.removeItem("userID");
  document.getElementById("loginDiv").style.display = "block";
  document.getElementById("appDiv").style.display   = "none";
}

// -------- Práce se záhony --------
function loadZahony() {
  const userID = localStorage.getItem("userID");
  if (!userID) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${userID}`)
    .then(r => r.json())
    .then(data => {
      const tbody = document.querySelector("#zahonyTable tbody");
      tbody.innerHTML = "";
      data.forEach(z => {
        const row     = document.createElement("tr");
        const tdCheck = document.createElement("td");
        const chk     = document.createElement("input");
        chk.type      = "checkbox";
        chk.dataset.id= z.ZahonID;
        tdCheck.appendChild(chk);

        const tdName = document.createElement("td");
        const link   = document.createElement("a");
        link.href    = "#";
        link.textContent = z.NazevZahonu;
        link.onclick = () => otevriModal(z);
        tdName.appendChild(link);

        const plocha = z.Velikost_m2 != null
          ? z.Velikost_m2
          : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        const tdSize = document.createElement("td");
        tdSize.textContent = `${plocha} m²`;

        row.appendChild(tdCheck);
        row.appendChild(tdName);
        row.appendChild(tdSize);
        tbody.appendChild(row);
      });
    })
    .catch(e => console.error("Chyba načtení záhonů:", e));
}

function deleteSelected() {
  const checks = document.querySelectorAll(
    '#zahonyTable tbody input[type="checkbox"]:checked'
  );
  if (!checks.length) return;
  checks.forEach(cb => {
    const id = cb.dataset.id;
    const p  = new URLSearchParams();
    p.append("action","deleteZahon");
    p.append("ZahonID",id);
    fetch(SERVER_URL,{method:"POST",body:p})
      .then(r=>r.text())
      .then(txt=>{
        if (txt.trim()==="OK") loadZahony();
        else console.error("Mazání neúspěšné:",txt);
      })
      .catch(e=>console.error("Chyba mazání:",e));
  });
}

function addZahon() {
  const userID = localStorage.getItem("userID");
  const nazev  = document.getElementById("newNazev").value.trim();
  const delka  = parseFloat(document.getElementById("newDelka").value) || 0;
  const sirka  = parseFloat(document.getElementById("newSirka").value) || 0;
  if (!nazev || delka<=0 || sirka<=0) {
    alert("Vyplňte správně údaje.");
    return;
  }
  const f = new URLSearchParams();
  f.append("action","addZahon");
  f.append("userID",userID);
  f.append("NazevZahonu",nazev);
  f.append("Delka",delka);
  f.append("Sirka",sirka);
  fetch(SERVER_URL,{method:"POST",body:f})
    .then(r=>r.text())
    .then(txt=>{
      if (txt.trim()==="OK") {
        ["newNazev","newDelka","newSirka"].forEach(id=>document.getElementById(id).value="");
        loadZahony();
      } else alert("Chyba přidání: "+txt);
    })
    .catch(e=>console.error("Chyba addZahon:",e));
}

// -------- Modální okno --------
function otevriModal(zahon) {
  aktualniZahon = zahon;
  setActiveIcon(null);
  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka||0;
  document.getElementById("editSirka").value = zahon.Sirka||0;
  updatePlocha();
  nakresliZahonCanvas(zahon.Delka,zahon.Sirka);
  document.getElementById("modalViewDefault").style.display="block";
  document.getElementById("modalViewUdalost").style.display="none";
  document.getElementById("modal").style.display="flex";
}

function closeModal() {
  aktualniZahon=null;
  document.getElementById("modal").style.display="none";
}

// -------- Úprava záhonu --------
function updatePlocha(){
  const d=parseFloat(document.getElementById("editDelka").value)||0;
  const s=parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent=(d*s).toFixed(2);
}

function saveZahon(){
  const nazev=document.getElementById("editNazev").value.trim();
  const delka=parseFloat(document.getElementById("editDelka").value)||0;
  const sirka=parseFloat(document.getElementById("editSirka").value)||0;
  if(!nazev||delka<=0||sirka<=0){alert("Vyplňte správně.");return;}
  const p=new URLSearchParams();
  p.append("action","updateZahon");
  p.append("ZahonID",aktualniZahon.ZahonID);
  p.append("NazevZahonu",nazev);
  p.append("Delka",delka);
  p.append("Sirka",sirka);
  fetch(SERVER_URL,{method:"POST",body:p})
    .then(r=>r.text())
    .then(txt=>{
      if(txt.trim()==="OK"){ closeModal(); loadZahony(); }
      else alert("Chyba ukládání: "+txt);
    })
    .catch(e=>console.error("Chyba saveZahon:",e));
}

// -------- Události --------
function showUdalostForm(typ){
  document.getElementById("modalViewDefault").style.display="none";
  const mv = document.getElementById("modalViewUdalost");
  mv.style.display="block";
  mv.classList.remove("analysis");
  const c = document.getElementById("udalostFormContainer");
  c.innerHTML = `<h4>${typ[0].toUpperCase()+typ.slice(1)}</h4>
    <label>Datum:<input type="date" id="udalostDatum"/></label>
    <label>Plodina:<input type="text" id="udalostPlodina"/></label>
    <label>Poznámka:<input type="text" id="udalostPoznamka"/></label>
    <button onclick="ulozUdalost('${typ}')">Uložit</button>`;
}

function ulozUdalost(typ){
  const d = document.getElementById("udalostDatum").value;
  const p = document.getElementById("udalostPlodina").value;
  const n = document.getElementById("udalostPoznamka").value;
  alert(`Ukládám ${typ}: ${d}, ${p}, ${n}`);
  zpetNaDetailZahonu();
}

function zpetNaDetailZahonu(){
  document.getElementById("modalViewDefault").style.display="block";
  document.getElementById("modalViewUdalost").style.display="none";
  setActiveIcon(null);
}

function zobrazUdalosti(zID){
  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${zID}`)
    .then(r=>r.json())
    .then(arr=>{
      const c=document.getElementById("udalostSeznamContainer");
      c.innerHTML="";
      if(!arr.length){ c.textContent="Žádné události."; return; }
      arr.forEach(u=>{
        const d=document.createElement("div");
        d.className="udalost-item";
        d.innerHTML=`<strong>${u.Typ}</strong> (${u.Datum})<br>
          ${u.Plodina||""} ${u.Hnojivo||""}<br>
          Množství: ${u.Mnozstvi||"-"} kg<br>
          Výnos: ${u.Vynos||"-"} kg<br>
          <em>${u.Poznamka||""}</em><br>
          <button onclick="smazUdalost(${u.UdalostID},${zID})">🗑️</button>`;
        c.appendChild(d);
      });
    })
    .catch(e=>console.error("Chyba načtení událostí:",e));
}

function smazUdalost(ud,zID){
  const p=new URLSearchParams();
  p.append("action","deleteUdalost");
  p.append("udalostID",ud);
  fetch(SERVER_URL,{method:"POST",body:p})
    .then(r=>r.text())
    .then(txt=>{ if(txt.trim()==="OK") zobrazUdalosti(zID); else alert("Chyba: "+txt); })
    .catch(e=>console.error("Chyba smazUdalost:",e));
}

// -------- Analýza --------
// … vaše SERVER_URL, login/logout, loadZahony, atd. …

// přepnutí ikon a zobrazení buď “událostí” nebo “analýzy”
function onIconClick(typ) {
  setActiveIcon(typ);
  if (typ === 'analyza') {
    showAnalysisForm();
  } else {
    showUdalostForm(typ);
  }
}

// vykreslí analytický formulář do #modalViewUdalost
function showAnalysisForm() {
  // schováme detail záhonu
  document.getElementById("modalViewDefault").style.display = "none";

  const container = document.getElementById("modalViewUdalost");
  container.classList.add("analysis");
  container.innerHTML = `
    <label for="analDatum">Datum analýzy:</label>
    <input type="date" id="analDatum" />

    <label for="analPH">pH (–):</label>
    <input type="number" step="0.1" id="analPH" />

    <label for="analN">N (ppm):</label>
    <input type="number" id="analN" />

    <label for="analP">P (ppm):</label>
    <input type="number" id="analP" />

    <label for="analK">K (ppm):</label>
    <input type="number" id="analK" />

    <div class="soil-info">
      <label for="soilType">Typ půdy:</label>
      <input type="text" id="soilType" />

      <label for="soilColor">Barva půdy:</label>
      <input type="text" id="soilColor" />
    </div>

    <button onclick="saveAnalysis()">Uložit analýzu</button>
    <button onclick="zpetNaDetailZahonu()">Zpět</button>
  `;

  // a zobrazíme modál
  document.getElementById("modalViewUdalost").style.display = "block";
}

// návrat z analýzy zpět na úpravu záhonu
function zpetNaDetailZahonu() {
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modalViewUdalost").classList.remove("analysis");
  document.getElementById("modalViewDefault").style.display = "block";
  setActiveIcon(null);
}

// placeholder uložení analýzy
function saveAnalysis() {
  const datum      = document.getElementById("analDatum").value;
  const ph         = document.getElementById("analPH").value;
  const n          = document.getElementById("analN").value;
  const p          = document.getElementById("analP").value;
  const k          = document.getElementById("analK").value;
  const type       = document.getElementById("soilType").value;
  const color      = document.getElementById("soilColor").value;

  // tady zavolat fetch(... action=addAnalysis ...) podle vašeho backendu
  console.log("Ukládám analýzu:", {datum, ph, n, p, k, type, color});
  // pak se vrátíme zpět
  zpetNaDetailZahonu();
}

// -------- Vizualizace záhonu --------
function nakresliZahonCanvas(delka,sirka){
  const cont = document.getElementById("zahonVizualizace");
  cont.innerHTML = "";
  const cv = document.createElement("canvas");
  cv.width = cv.height = 200;
  const ctx = cv.getContext("2d");
  const sc = Math.min(200/(delka||1),200/(sirka||1));
  const w = (delka||1)*sc, h = (sirka||1)*sc;
  ctx.fillStyle = "#c2b280";
  ctx.fillRect((200-w)/2,(200-h)/2,w,h);
  cont.appendChild(cv);
}

// -------- Správa ikon --------
function setActiveIcon(activeTyp){
  ["seti","hnojeni","sklizen","analyza"].forEach(t=>{
    const el = document.getElementById("icon-"+t);
    if(!el) return;
    el.classList.toggle("active", t===activeTyp);
  });
}