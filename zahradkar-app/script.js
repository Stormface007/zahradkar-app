// ← Nahraďte svou URL
const SERVER_URL = "https://script.google.com/macros/s/AKfycby5Q582sTjMVzHDwInTpUQqQDbMMaZoAT90Lv1hEiB8rcRVs3XX21JUKYNmg16nYsGW/exec";

let aktualniZahon = null;

function showActionIndicator() {
  document.getElementById('actionIndicator').classList.add('active');
}
function hideActionIndicator() {
  document.getElementById('actionIndicator').classList.remove('active');
}

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
      onLoginSuccess();
    } else {
      document.getElementById("loginMsg").innerText = "Neplatné přihlašovací údaje.";
    }
  } catch (err) {
    console.error("Login error:", err);
    document.getElementById("loginMsg").innerText = "Chyba při přihlášení.";
  }
}

function onLoginSuccess() {
  document.getElementById("loginDiv").style.display = "none";
  document.getElementById("appDiv").style.display   = "block";
  loadZahony();
}

function logout() {
  localStorage.removeItem("userID");
  document.getElementById("appDiv").style.display   = "none";
  document.getElementById("loginDiv").style.display = "block";
}

// — Záhony —
function loadZahony() {
  const userID = localStorage.getItem("userID");
  if (!userID) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${userID}`)
    .then(r => r.json())
    .then(data => {
      const tbody = document.querySelector("#zahonyTable tbody");
      tbody.innerHTML = "";
      data.forEach(z => {
        const row = document.createElement("tr");

        // checkbox pro výběr s ID v value
        const tdChk = document.createElement("td");
        const check = document.createElement("input");
        check.type  = "checkbox";
        check.value = z.ZahonID;       // tady
        tdChk.appendChild(check);

        // název záhonu
        const tdName = document.createElement("td");
        const a = document.createElement("a");
        a.href      = "#";
        a.textContent = z.NazevZahonu;
        a.onclick   = () => otevriModal(z);
        tdName.appendChild(a);

        // plocha
        const plo = (z.Velikost_m2 != null)
          ? z.Velikost_m2
          : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        const tdSize = document.createElement("td");
        tdSize.textContent = plo + " m²";

        row.append(tdChk, tdName, tdSize);
        tbody.appendChild(row);
      });
    })
    .catch(e => console.error("Chyba načtení záhonů:", e));
}

function deleteSelected() {
  const checks = document.querySelectorAll(
    "#zahonyTable tbody input[type='checkbox']:checked"
  );
  if (!checks.length) return alert("Neoznačili jste žádný záhon.");

  showActionIndicator && showActionIndicator();  // pokud používáte ten indikátor

  const promises = Array.from(checks).map(cb => {
    const ps = new URLSearchParams();
    ps.append("action", "deleteZahon");
    ps.append("ZahonID", cb.value);   // z value, ne dataset

    return fetch(SERVER_URL, {
      method: "POST",
      body: ps
    }).then(r => r.text());
  });

  Promise.all(promises)
    .then(results => {
      // potvrzení, že všechny odpověděly "OK"
      const okAll = results.every(txt => txt.trim() === "OK");
      if (!okAll) console.warn("Některé mazání neproběhlo v pořádku:", results);
      loadZahony();
    })
    .catch(e => console.error("Chyba mazání záhonu:", e))
    .finally(() => {
      hideActionIndicator && hideActionIndicator();
    });
}

function addZahon() {
  const userID = localStorage.getItem("userID");
  const nazev  = document.getElementById("newNazev").value.trim();
  const delka  = parseFloat(document.getElementById("newDelka").value) || 0;
  const sirka  = parseFloat(document.getElementById("newSirka").value) || 0;
  if (!nazev || delka <= 0 || sirka <= 0) {
    alert("Vyplňte správně název, délku i šířku.");
    return;
  }

  showActionIndicator(); // ← start animace

  const ps = new URLSearchParams();
  ps.append("action", "addZahon");
  ps.append("userID", userID);
  ps.append("NazevZahonu", nazev);
  ps.append("Delka", delka);
  ps.append("Sirka", sirka);

  fetch(SERVER_URL, { method: "POST", body: ps })
    .then(r => r.text())
    .then(txt => {
      if (txt.trim() === "OK") {
        ["newNazev","newDelka","newSirka"]
          .forEach(id => document.getElementById(id).value = "");
        loadZahony();
      } else {
        alert("Chyba při přidávání záhonu: " + txt);
      }
    })
    .catch(e => console.error("Chyba addZahon:", e))
    .finally(() => hideActionIndicator()); // ← konec animace
}


// — Modální okno záhonu —
function otevriModal(zahon) {
  aktualniZahon = zahon;
  setActiveIcon(null);

  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka || 0;
  document.getElementById("editSirka").value = zahon.Sirka || 0;
  updatePlocha();

  nakresliZahonCanvas(zahon.Delka, zahon.Sirka);

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
  const d = parseFloat(document.getElementById("editDelka").value) || 0;
  const s = parseFloat(document.getElementById("editSirka").value) || 0;
  document.getElementById("vypocetPlochy").textContent = (d*s).toFixed(2);
}

function saveZahon() {
  const n = document.getElementById("editNazev").value.trim();
  const d = parseFloat(document.getElementById("editDelka").value) || 0;
  const s = parseFloat(document.getElementById("editSirka").value) || 0;
  if (!n || d <= 0 || s <= 0) {
    return alert("Vyplňte správně všechno.");
  }
  const ps = new URLSearchParams();
  ps.append("action","updateZahon");
  ps.append("ZahonID", aktualniZahon.ZahonID);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{ method:"POST", body:ps })
    .then(r=>r.text())
    .then(txt=>{ if(txt.trim()==="OK") {
      closeModal(); loadZahony();
    }})
    .catch(e=>console.error("Chyba uložení záhonu:", e));
}

// … zbytek funkcí (showUdalostForm, showAnalysisForm, setActiveIcon, onIconClick, nakresliZahonCanvas, openZoom, closeZoom) beze změny …

// — Události (setí/hnojení/sklizeň) —
function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";
  const c = document.getElementById("udalostFormContainer");
  c.innerHTML = `<h4>${typ.charAt(0).toUpperCase()+typ.slice(1)}</h4>
    <label>Datum: <input type="date" id="udalostDatum"/></label><br>`;
  if (typ === "seti") {
    c.innerHTML += `<label>Plodina:
        <select id="plodinaSelect"><option>Načítám…</option></select>
      </label><br>`;
    loadPlodiny();
  } else if (typ === "hnojeni") {
    c.innerHTML += `<label>Hnojivo: <input type="text" id="udalostHnojivo"/></label><br>
      <label>Množství (kg): <input type="number" id="udalostMnozstvi"/></label><br>`;
  } else if (typ === "sklizen") {
    c.innerHTML += `<label>Plodina: <input type="text" id="udalostPlodina"/></label><br>
      <label>Výnos (kg): <input type="number" id="udalostVynos"/></label><br>`;
  }
  c.innerHTML += `<label>Poznámka: <input type="text" id="udalostPoznamka"/></label><br>
    <button onclick="ulozUdalost('${typ}')">Uložit</button>`;
}

function ulozUdalost(typ) {
  alert("Uloženo: " + typ);
  zpetNaDetailZahonu();
}

// — Analýza —
function showAnalysisForm() {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.add("analysis");
  uv.style.display = "block";
  document.getElementById("udalostFormContainer").innerHTML = `
    <h4>Analýza</h4>
    <label>Datum: <input type="date" id="analDatum"/></label><br>
    <div class="nutrients">
      <div class="nutrient"><label>pH (–):</label><input type="number" step="0.1" id="analPH"/></div>
      <div class="nutrient"><label>N (ppm):</label><input type="number" id="analN"/></div>
      <div class="nutrient"><label>P (ppm):</label><input type="number" id="analP"/></div>
      <div class="nutrient"><label>K (ppm):</label><input type="number" id="analK"/></div>
    </div>
    <div class="soil-info">
      <label>Typ půdy: <input type="text" id="soilType"/></label><br>
      <label>Barva půdy: <input type="text" id="soilColor"/></label>
    </div>
    <button onclick="saveAnalysis()">Uložit analýzu</button>`;
}

function saveAnalysis() {
  alert("Analýza uložena");
  zpetNaDetailZahonu();
}

// — Návrat na detail záhonu —
function zpetNaDetailZahonu() {
  const uv = document.getElementById("modalViewUdalost");
  uv.style.display = "none";
  uv.classList.remove("analysis");
  document.getElementById("modalViewDefault").style.display = "block";
  setActiveIcon(null);
}

// — Boční ikony —
function setActiveIcon(active) {
  ["mereni","seti","hnojeni","sklizen","analyza","eshop","sluzba","market","nastaveni"]
    .forEach(t => {
      const el = document.getElementById(`icon-${t}`);
      if (el) el.classList.toggle("active", t === active);
    });
}

function onIconClick(typ) {
  setActiveIcon(typ);
  document.getElementById("modalViewDefault").style.display  = "none";
  document.getElementById("modalViewUdalost").style.display  = "none";
  if (["seti","hnojeni","sklizen"].includes(typ)) {
    showUdalostForm(typ);
  } else if (typ === "mereni") {
    document.getElementById("modalViewDefault").style.display = "block";
  } else if (typ === "analyza") {
    showAnalysisForm();
  }
}

// — Kreslení záhonu —
function nakresliZahonCanvas(d, s) {
  const cont = document.getElementById("zahonVizualizace");
  cont.innerHTML = "";
  const cv = document.createElement("canvas");
  cv.width = cv.height = 200;
  const ctx = cv.getContext("2d");
  // pozadí pole
  ctx.fillStyle = "#009900"; ctx.fillRect(0, 0, 200, 200);
  // tvar záhonu
  const scale = Math.min(200/(d||1), 200/(s||1));
  const w = (d||1)*scale, h = (s||1)*scale;
  const x = (200 - w)/2, y = (200 - h)/2;
  ctx.fillStyle = "#c2b280"; ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 2; ctx.strokeStyle = "#000"; ctx.strokeRect(x, y, w, h);
  // klik pro zoom
  cv.style.cursor = "pointer";
  cv.onclick = () => {
    if (document.getElementById("modal").style.display === "flex" && aktualniZahon) {
      openZoom(aktualniZahon.Delka, aktualniZahon.Sirka);
    }
  };
  cont.appendChild(cv);
}

// — Zoom modal —
function openZoom(d, s) {
  const cv = document.getElementById("zoomCanvas");
  const factor = 5, base = 80;
  cv.width = base * factor;
  cv.height = base * factor;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#009900"; ctx.fillRect(0, 0, cv.width, cv.height);
  const scale = Math.min(cv.width/(d||1), cv.height/(s||1));
  const w = (d||1)*scale, h = (s||1)*scale;
  const x = (cv.width - w)/2, y = (cv.height - h)/2;
  ctx.fillStyle = "#c2b280"; ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 2; ctx.strokeStyle = "#000"; ctx.strokeRect(x, y, w, h);
  document.getElementById("zoomModal").style.display = "flex";
}

function closeZoom() {
  document.getElementById("zoomModal").style.display = "none";
}

// — Auto-login při načtení stránky —
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("zoomModal").querySelector("button")
    .addEventListener("click", closeZoom);
  if (localStorage.getItem("userID")) {
    onLoginSuccess();
  }
});