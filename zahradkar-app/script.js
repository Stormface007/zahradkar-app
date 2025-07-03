// ← Nahraď svou URL
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

// — Záhony —
function loadZahony() {
  const u = localStorage.getItem("userID");
  if (!u) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${u}`)
    .then(r => r.json())
    .then(arr => {
      const tb = document.querySelector("#zahonyTable tbody");
      tb.innerHTML = "";
      arr.forEach(z => {
        const row = document.createElement("tr");
        // checkbox
        const c1 = document.createElement("td");
        const cb = document.createElement("input");
        cb.type = "checkbox"; cb.dataset.id = z.ZahonID;
        c1.appendChild(cb);
        // název
        const c2 = document.createElement("td");
        const a  = document.createElement("a");
        a.href = "#"; a.textContent = z.NazevZahonu;
        a.onclick = () => otevriModal(z);
        c2.appendChild(a);
        // plocha
        const plo = z.Velikost_m2 != null
          ? z.Velikost_m2
          : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        const c3 = document.createElement("td");
        c3.textContent = plo + " m²";
        // append
        row.append(c1,c2,c3);
        tb.appendChild(row);
      });
    });
}
function deleteSelected() {
  document.querySelectorAll(
    "#zahonyTable tbody input[type='checkbox']:checked"
  ).forEach(cb => {
    const ps = new URLSearchParams();
    ps.append("action","deleteZahon");
    ps.append("ZahonID", cb.dataset.id);
    fetch(SERVER_URL, { method:"POST", body:ps })
      .then(r=>r.text())
      .then(txt=>{ if(txt.trim()==="OK") loadZahony(); });
  });
}
function addZahon() {
  const u = localStorage.getItem("userID");
  const n = document.getElementById("newNazev").value.trim();
  const d = parseFloat(document.getElementById("newDelka").value)||0;
  const s = parseFloat(document.getElementById("newSirka").value)||0;
  if (!n||d<=0||s<=0) return alert("Vyplňte správně názvě, délku i šířku.");
  const ps = new URLSearchParams();
  ps.append("action","addZahon");
  ps.append("userID",u);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{ if(txt.trim()==="OK") {
      ["newNazev","newDelka","newSirka"].forEach(id=>document.getElementById(id).value="");
      loadZahony();
    }});
}

// — Modální okno —
function otevriModal(zahon) {
  aktualniZahon = zahon;
  setActiveIcon(null);
  // vyplnění default view
  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka || 0;
  document.getElementById("editSirka").value = zahon.Sirka || 0;
  updatePlocha();
  nakresliZahonCanvas(zahon.Delka, zahon.Sirka);
  // bind zoom handler
  makeCanvasClickable();
  // zobrazit modal
  document.getElementById("modalViewDefault").style.display  = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modal").style.display             = "flex";
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
  if (!n||d<=0||s<=0) return alert("Vyplňte správně vše.");
  const ps = new URLSearchParams();
  ps.append("action","updateZahon");
  ps.append("ZahonID",aktualniZahon.ZahonID);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{ if(txt.trim()==="OK") {
      closeModal(); loadZahony();
    }});
}

// — Dynamické plodiny —
function loadPlodiny() {
  fetch(`${SERVER_URL}?action=getPlodiny`)
    .then(r=>r.json())
    .then(arr=>{
      const sel = document.getElementById("plodinaSelect");
      sel.innerHTML = `<option value="">– vyber plodinu –</option>`;
      arr.forEach(p=>{
        const o = document.createElement("option");
        o.value = p.nazev;
        o.textContent = p.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>{
      console.error("Chyba plodiny:",e);
      document.getElementById("plodinaSelect").innerHTML =
        `<option>Chyba načítání</option>`;
    });
}

// — Události (setí/hnojení/sklizeň) —
function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.style.display = "block";
  const c = document.getElementById("udalostFormContainer");
  c.innerHTML = `<h4>${typ[0].toUpperCase()+typ.slice(1)}</h4>
    <label>Datum: <input type="date" id="udalostDatum"/></label><br>`;
  if (typ === "seti") {
    c.innerHTML += `<label>Plodina:
        <select id="plodinaSelect"><option>Načítám…</option></select>
      </label><br>`;
    loadPlodiny();
  } else if (typ === "hnojeni") {
    c.innerHTML += `
      <label>Hnojivo: <input type="text" id="udalostHnojivo"/></label><br>
      <label>Množství (kg): <input type="number" id="udalostMnozstvi"/></label><br>`;
  } else if (typ === "sklizen") {
    c.innerHTML += `
      <label>Plodina: <input type="text" id="udalostPlodina"/></label><br>
      <label>Výnos (kg): <input type="number" id="udalostVynos"/></label><br>`;
  }
  c.innerHTML += `<label>Poznámka: <input type="text" id="udalostPoznamka"/></label><br>
    <button onclick="ulozUdalost('${typ}')">Uložit</button>`;
}
function ulozUdalost(typ) {
  alert("Uloženo " + typ);
  zpetNaDetailZahonu();
}
function zpetNaDetailZahonu() {
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modalViewDefault").style.display = "block";
  setActiveIcon(null);
}

// — Analýza —
function showAnalysisForm() {
  const c = document.getElementById("modalViewUdalost");
  c.classList.add("analysis");
  document.getElementById("modalViewDefault").style.display = "none";
  c.style.display = "block";
  document.getElementById("udalostFormContainer").innerHTML = `
    <h4>Analýza</h4>
    <label for="analDatum">Datum:</label>
    <input type="date" id="analDatum" /><br>
    <div class="nutrients">
      <div class="nutrient"><label for="analPH">pH (–):</label><input type="number" step="0.1" id="analPH"/></div>
      <div class="nutrient"><label for="analN">N (ppm):</label><input type="number" id="analN"/></div>
      <div class="nutrient"><label for="analP">P (ppm):</label><input type="number" id="analP"/></div>
      <div class="nutrient"><label for="analK">K (ppm):</label><input type="number" id="analK"/></div>
    </div>
    <div class="soil-info">
      <label for="soilType">Typ půdy:</label><input type="text" id="soilType"/><br>
      <label for="soilColor">Barva půdy:</label><input type="text" id="soilColor"/>
    </div>
    <button onclick="saveAnalysis()">Uložit analýzu</button>`;
}
function saveAnalysis() {
  alert("Analýza uložena");
  zpetNaDetailZahonu();
}

// — Zoom záhonu —
function makeCanvasClickable() {
  const kont = document.getElementById("zahonVizualizace");
  const fresh = kont.cloneNode(true);
  kont.parentNode.replaceChild(fresh, kont);
  fresh.addEventListener("click", () => {
    if (document.getElementById("modal").style.display==="flex" && aktualniZahon) {
      openZoom(aktualniZahon.Delka, aktualniZahon.Sirka);
    }
  });
}
function openZoom(d,s) {
  const canvas = document.getElementById("zoomCanvas");
  const sf = 5, bs = 200;
  canvas.width = bs*sf; canvas.height = bs*sf;
  const ctx = canvas.getContext("2d");
  // pozadí
  ctx.fillStyle = "#009900";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  // záhon
  const scale = Math.min(canvas.width/(d||1),canvas.height/(s||1));
  const w = (d||1)*scale, h = (s||1)*scale;
  const x=(canvas.width-w)/2, y=(canvas.height-h)/2;
  ctx.fillStyle="#c2b280";
  ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2;ctx.strokeStyle="#000";ctx.strokeRect(x,y,w,h);
  document.getElementById("zoomModal").style.display="flex";
}
function closeZoom() {
  document.getElementById("zoomModal").style.display="none";
}

// — Ikony —
function setActiveIcon(active) {
  ["mereni","seti","hnojeni","sklizen","analyza","eshop","sluzba","market","nastaveni"]
    .forEach(t => {
      const el = document.getElementById(`icon-${t}`);
      if (el) el.classList.toggle("active", t===active);
    });
}
function onIconClick(typ) {
  setActiveIcon(typ);
  document.getElementById("modalViewDefault").style.display  = "none";
  document.getElementById("modalViewUdalost").style.display  = "none";
  if (typ==="seti"||typ==="hnojeni"||typ==="sklizen") showUdalostForm(typ);
  else if (typ==="mereni") document.getElementById("modalViewDefault").style.display="block";
  else if (typ==="analyza") showAnalysisForm();
}