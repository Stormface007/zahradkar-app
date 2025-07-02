// ← Nahraďte svou URL
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

// — Načtení a správa záhonů —
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
        const c1 = document.createElement("td");
        const cb = document.createElement("input");
        cb.type = "checkbox"; cb.dataset.id = z.ZahonID;
        c1.appendChild(cb);

        const c2 = document.createElement("td");
        const a  = document.createElement("a");
        a.href = "#"; a.textContent = z.NazevZahonu;
        a.onclick = () => otevriModal(z);
        c2.appendChild(a);

        const plo = (z.Velikost_m2 != null)
          ? z.Velikost_m2
          : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        const c3 = document.createElement("td");
        c3.textContent = plo + " m²";

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
  if (!n||d<=0||s<=0) return alert("Vyplňte správně název, délku i šířku.");
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
function otevriModal(z) {
  aktualniZahon = z;
  setActiveIcon(null);
  document.getElementById("editNazev").value = z.NazevZahonu;
  document.getElementById("editDelka").value = z.Delka||0;
  document.getElementById("editSirka").value = z.Sirka||0;
  updatePlocha();
  nakresliZahonCanvas(z.Delka,z.Sirka);
  document.getElementById("modalViewDefault").style.display = "block";
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
    .then(txt=>{ if(txt.trim()==="OK") {
      closeModal(); loadZahony();
    }});
}

// — Dynamické načtení plodin —
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

// — Přepínání na formulář události —
function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.style.display = "block";
  const c = document.getElementById("udalostFormContainer");
  c.innerHTML = `
    <h4>${typ[0].toUpperCase()+typ.slice(1)}</h4>
    <label>Datum: <input type="date" id="udalostDatum"/></label><br>
  `;
  if (typ === "seti") {
    c.innerHTML += `
      <label>Plodina:
        <select id="plodinaSelect">
          <option>Načítám…</option>
        </select>
      </label><br>
    `;
    loadPlodiny();
  }
  else if (typ === "hnojeni") {
    c.innerHTML += `
      <label>Hnojivo: <input type="text" id="udalostHnojivo"/></label><br>
      <label>Množství (kg): <input type="number" id="udalostMnozstvi"/></label><br>
    `;
  }
  else if (typ === "sklizen") {
    c.innerHTML += `
      <label>Plodina: <input type="text" id="udalostPlodina"/></label><br>
      <label>Výnos (kg): <input type="number" id="udalostVynos"/></label><br>
    `;
  }
  c.innerHTML += `
    <label>Poznámka: <input type="text" id="udalostPoznamka"/></label><br>
    <button onclick="ulozUdalost('${typ}')">Uložit</button>
  `;
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

// — Boční ikony —
function setActiveIcon(active) {
  ["mereni","seti","hnojeni","sklizen","analyza","eshop","sluzba","market","nastaveni"]
    .forEach(t => {
      const el = document.getElementById(`icon-${t}`);
      if (!el) return;
      el.classList.toggle("active", t === active);
    });
}
function onIconClick(typ) {
  setActiveIcon(typ);
  document.getElementById("modalViewDefault").style.display  = "none";
  document.getElementById("modalViewUdalost").style.display  = "none";
  if (typ === "seti" || typ === "hnojeni" || typ === "sklizen") {
    showUdalostForm(typ);
  }
  else if (typ === "mereni") {
    document.getElementById("modalViewDefault").style.display = "block";
  }
  else if (typ === "analyza") {
    showAnalysisForm();
  }
  // ostatní ikony zatím nic dál nedělají
}

// — Kreslení záhonu —
function nakresliZahonCanvas(d,s) {
  const c = document.getElementById("zahonVizualizace");
  c.innerHTML = "";
  const cv = document.createElement("canvas");
  cv.width = cv.height = 200;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#009900"; ctx.fillRect(0,0,200,200);
  const scale = Math.min(200/(d||1),200/(s||1));
  const w = (d||1)*scale, h = (s||1)*scale;
  const x = (200-w)/2, y = (200-h)/2;
  ctx.fillStyle = "#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  c.appendChild(cv);
}

// — Analýza —
function showAnalysisForm() {
  const c = document.getElementById("modalViewUdalost");
  c.classList.add("analysis");
  document.getElementById("modalViewDefault").style.display  = "none";
  c.style.display = "block";
  document.getElementById("udalostFormContainer").innerHTML = `
    <h4>Analýza</h4>
    <label for="analDatum">Datum:</label>
    <input type="date" id="analDatum" /><br>
    <div class="nutrients">
      <input type="number" step="0.1" id="analPH" placeholder="pH (–)" />
      <input type="number"      id="analN"  placeholder="N (ppm)" />
      <input type="number"      id="analP"  placeholder="P (ppm)" />
      <input type="number"      id="analK"  placeholder="K (ppm)" />
    </div>
    <div class="soil-info">
      <label for="soilType">Typ půdy:</label>
      <input type="text" id="soilType" /><br>
      <label for="soilColor">Barva půdy:</label>
      <input type="text" id="soilColor" />
    </div>
    <button onclick="saveAnalysis()">Uložit analýzu</button>
  `;
}
function saveAnalysis() {
  alert("Analýza uložena");
  zpetNaDetailZahonu();
}

// 1) Přidejte na konec souboru:

// Otevře zoom-modal a vykreslí záhon 5× větší
function openZoom(delka, sirka) {
  const canvas = document.getElementById("zoomCanvas");
  const scaleFactor = 5;
  const baseSize    = 200;
  canvas.width  = baseSize * scaleFactor;
  canvas.height = baseSize * scaleFactor;

  const ctx = canvas.getContext("2d");
  // zelené pozadí
  ctx.fillStyle = "#009900";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // hnědý záhon
  const plotScale = Math.min(canvas.width/(delka||1), canvas.height/(sirka||1));
  const w = (delka||1)*plotScale;
  const h = (sirka||1)*plotScale;
  const x = (canvas.width - w)/2;
  const y = (canvas.height - h)/2;
  ctx.fillStyle   = "#c2b280";
  ctx.fillRect(x, y, w, h);
  // černý obrys
  ctx.lineWidth   = 2;
  ctx.strokeStyle = "#000";
  ctx.strokeRect(x, y, w, h);

  document.getElementById("zoomModal").style.display = "flex";
}

// Zavře zoom-modal
function closeZoom() {
  document.getElementById("zoomModal").style.display = "none";
}

// Po vykreslení primárního záhonu připojíme klikací handler:
function makeCanvasClickable() {
  const cont = document.getElementById("zahonVizualizace");
  cont.style.cursor = "zoom-in";  // ukáže lupičku
  cont.onclick = () => {
    if (!aktualniZahon) return;
    openZoom(aktualniZahon.Delka, aktualniZahon.Sirka);
  };
}

// 2) V závěru funkce otevriModal(zahon) přidejte:
makeCanvasClickable();