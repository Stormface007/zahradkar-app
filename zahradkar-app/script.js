// URL vašeho Google Apps Scriptu
const SERVER_URL = "https://script.google.com/macros/s/AKfycby5Q582sTjMVzHDwInTpUQqQDbMMaZoAT90Lv1hEiB8rcRVs3XX21JUKYNmg16nYsGW/exec";

let aktualniZahon = null;

// — Přihlášení / odhlášení —
async function login() {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  try {
    const res = await fetch(`${SERVER_URL}?action=login`, {
      method: "POST",
      body: new URLSearchParams({ username: u, password: p })
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
  } catch {
    document.getElementById("loginMsg").innerText = "Chyba při přihlášení.";
  }
}
function logout() {
  localStorage.removeItem("userID");
  document.getElementById("appDiv").style.display   = "none";
  document.getElementById("loginDiv").style.display = "block";
}

// — Načtení záhonů —
function loadZahony() {
  const userID = localStorage.getItem("userID");
  if (!userID) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${userID}`)
    .then(r => r.json())
    .then(arr => {
      const tb = document.querySelector("#zahonyTable tbody");
      tb.innerHTML = "";
      arr.forEach(z => {
        const row = document.createElement("tr");
        // Checkbox
        const td1 = document.createElement("td");
        const cb  = document.createElement("input");
        cb.type = "checkbox"; cb.dataset.id = z.ZahonID;
        td1.appendChild(cb);
        // Název
        const td2 = document.createElement("td");
        const a   = document.createElement("a");
        a.href = "#"; a.textContent = z.NazevZahonu;
        a.onclick = () => otevriModal(z);
        td2.appendChild(a);
        // Plocha
        const plo = (z.Velikost_m2 != null)
          ? z.Velikost_m2
          : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        const td3 = document.createElement("td");
        td3.textContent = plo + " m²";
        row.appendChild(td1);
        row.appendChild(td2);
        row.appendChild(td3);
        tb.appendChild(row);
      });
    })
    .catch(e => console.error("Chyba načtení záhonů:", e));
}

function deleteSelected() {
  const checks = document.querySelectorAll(
    "#zahonyTable tbody input[type='checkbox']:checked"
  );
  if (!checks.length) return;
  checks.forEach(cb => {
    const id = cb.dataset.id;
    const ps = new URLSearchParams();
    ps.append("action","deleteZahon");
    ps.append("ZahonID", id);
    fetch(SERVER_URL, { method:"POST", body:ps })
      .then(r => r.text())
      .then(txt => { if (txt.trim()==="OK") loadZahony(); })
      .catch(e => console.error("Chyba mazání záhonu:", e));
  });
}

function addZahon() {
  const u = localStorage.getItem("userID");
  const n = document.getElementById("newNazev").value.trim();
  const d = parseFloat(document.getElementById("newDelka").value)||0;
  const s = parseFloat(document.getElementById("newSirka").value)||0;
  if (!n||d<=0||s<=0) return alert("Vyplňte správně název, délku i šířku.");
  const ps = new URLSearchParams();
  ps.append("action","addZahon");
  ps.append("userID",u);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if (txt.trim()==="OK") {
        ["newNazev","newDelka","newSirka"].forEach(id=>document.getElementById(id).value="");
        loadZahony();
      }
    })
    .catch(e=>console.error("Chyba addZahon:", e));
}

// — Modální okno —
function otevriModal(z) {
  aktualniZahon = z;
  setActiveIcon(null);
  document.getElementById("editNazev").value = z.NazevZahonu;
  document.getElementById("editDelka").value = z.Delka||0;
  document.getElementById("editSirka").value = z.Sirka||0;
  updatePlocha();
  nakresliZahonCanvas(z.Delka,z.Sirka);
  document.getElementById("modalViewDefault").style.display  = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modal").style.display            = "flex";
}
function closeModal() {
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}

// — Úprava záhonu —
function updatePlocha() {
  const d = parseFloat(document.getElementById("editDelka").value)||0;
  const s = parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent = (d*s).toFixed(2);
}
function saveZahon() {
  const n = document.getElementById("editNazev").value.trim();
  const d = parseFloat(document.getElementById("editDelka").value)||0;
  const s = parseFloat(document.getElementById("editSirka").value)||0;
  if (!n||d<=0||s<=0) return alert("Vyplňte správně všechno.");
  const ps = new URLSearchParams();
  ps.append("action","updateZahon");
  ps.append("ZahonID",aktualniZahon.ZahonID);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{ if (txt.trim()==="OK") { closeModal(); loadZahony(); } })
    .catch(e=>console.error("Chyba saveZahon:", e));
}

// — Setí / Hnojení / Sklizeň —
function showUdalostForm(typ) {
  // skryj default view
  document.getElementById("modalViewDefault").style.display = "none";
  // připrav container
  const view = document.getElementById("modalViewUdalost");
  view.classList.remove("analysis");
  view.style.display = "block";
  const container = document.getElementById("udalostFormContainer");
  document.getElementById("udalostSeznamContainer").style.display = "none";
  container.innerHTML = `
    <h4>${typ.charAt(0).toUpperCase()+typ.slice(1)}</h4>
    <label>Datum: <input type="date" id="udalostDatum" /></label><br>
  `;
  if (typ==="seti") {
    container.innerHTML += `
      <label>Plodina:
        <select id="plodinaSelect"><option>Načítám…</option></select>
      </label><br>
    `;
    loadPlodiny();
  }
  if (typ==="hnojeni") {
    container.innerHTML += `
      <label>Hnojivo:<input type="text" id="udalostHnojivo"/></label><br>
      <label>Množství (kg):<input type="number" id="udalostMnozstvi"/></label><br>
    `;
  }
  if (typ==="sklizen") {
    container.innerHTML += `
      <label>Plodina:<input type="text" id="udalostPlodina"/></label><br>
      <label>Výnos (kg):<input type="number" id="udalostVynos"/></label><br>
    `;
  }
  container.innerHTML += `
    <label>Poznámka:<input type="text" id="udalostPoznamka"/></label><br>
    <button onclick="ulozUdalost('${typ}')">Uložit</button>
  `;
}
function loadPlodiny() {
  fetch(`${SERVER_URL}?action=getPlodiny`)
    .then(r=>r.json())
    .then(plodiny=>{
      const sel = document.getElementById("plodinaSelect");
      sel.innerHTML = '<option value="">– vyber –</option>';
      plodiny.forEach(p=>{
        const o = document.createElement("option");
        o.value = p.nazev;
        o.textContent = p.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>{
      console.error("Chyba při načítání plodin:", e);
      document.getElementById("plodinaSelect").innerHTML = '<option>Chyba</option>';
    });
}
function ulozUdalost(typ) {
  alert("Uloženo " + typ);
  zpetNaDetailZahonu();
}

// — Analýza —
function showAnalysisForm() {
  document.getElementById("modalViewDefault").style.display  = "none";
  const view = document.getElementById("modalViewUdalost");
  view.classList.add("analysis");
  view.style.display = "block";
  const c = document.getElementById("udalostFormContainer");
  c.innerHTML = `
    <h4>Analýza</h4>
    <label>Datum:<input type="date" id="analDatum"/></label><br>
    <div class="nutrients">
      <input placeholder="pH (–)" type="number" step="0.1" id="analPH"/>
      <input placeholder="N (ppm)" type="number" id="analN"/>
      <input placeholder="P (ppm)" type="number" id="analP"/>
      <input placeholder="K (ppm)" type="number" id="analK"/>
    </div>
    <div class="soil-info">
      <label>Typ půdy:<input type="text" id="soilType"/></label><br>
      <label>Barva půdy:<input type="text" id="soilColor"/></label>
    </div>
    <button onclick="saveAnalysis()">Uložit analýzu</button>
  `;
}
function saveAnalysis() {
  alert("Analýza uložena");
  zpetNaDetailZahonu();
}

// — Vrátit zpět —
function zpetNaDetailZahonu() {
  const view = document.getElementById("modalViewUdalost");
  view.style.display = "none";
  view.classList.remove("analysis");
  document.getElementById("modalViewDefault").style.display = "block";
  setActiveIcon(null);
}

// — Boční ikony —
function setActiveIcon(active) {
  ["mereni","seti","hnojeni","sklizen","analyza","eshop","sluzba","market","nastaveni"]
    .forEach(t=>{
      const el = document.getElementById("icon-"+t);
      el && el.classList.toggle("active", t===active);
    });
}
function onIconClick(typ) {
  setActiveIcon(typ);
  // schovej obě view
  document.getElementById("modalViewDefault").style.display  = "none";
  document.getElementById("modalViewUdalost").style.display = "none";
  // rozhodni, co ukázat
  if (typ === "analyza")       showAnalysisForm();
  else if (typ === "mereni")   document.getElementById("modalViewDefault").style.display = "block";
  else                          showUdalostForm(typ);
}

// — Vizualizace záhonu —
function nakresliZahonCanvas(delka, sirka) {
  const c = document.getElementById("zahonVizualizace");
  c.innerHTML = "";
  const cv = document.createElement("canvas");
  cv.width = cv.height = 200;
  const ctx = cv.getContext("2d");
  // zelené pozadí
  ctx.fillStyle = "#009900";
  ctx.fillRect(0,0,200,200);
  // hnědý záhon
  const scale = Math.min(200/(delka||1),200/(sirka||1));
  const w = (delka||1)*scale, h=(sirka||1)*scale;
  const x=(200-w)/2,y=(200-h)/2;
  ctx.fillStyle = "#c2b280";
  ctx.fillRect(x,y,w,h);
  // černý okraj
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#000";
  ctx.strokeRect(x,y,w,h);
  c.appendChild(cv);
}