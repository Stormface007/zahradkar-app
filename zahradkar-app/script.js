// ← Nahraďte svou URL
const SERVER_URL = "https://script.google.com/macros/s/AKfycby5Q582sTjMVzHDwInTpUQqQDbMMaZoAT90Lv1hEiB8rcRVs3XX21JUKYNmg16nYsGW/exec";

let aktualniZahon = null;

// — Indikátor akce (volitelné) —
function showActionIndicator() {
  // seznam možných „rotujících“ obrázků
  const images = [
    'Plodina_mrkev.png',
    'Plodina_rajce.png',
    'Plodina_petrzel_koren.png'
  ];
  // vyber náhodný index
  const randIdx = Math.floor(Math.random() * images.length);
  // najdi <img> uvnitř indikátoru a nastav mu src
  const imgEl = document.querySelector('#actionIndicator img');
  imgEl.src = `img/${images[randIdx]}`;
  // pak zobraz
  document.getElementById('actionIndicator').classList.add('active');
}
function hideActionIndicator() {
  const el = document.getElementById('actionIndicator');
  if (el) el.classList.remove('active');
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

// — Seznam záhonů —
function loadZahony() {
  const userID = localStorage.getItem("userID");
  if (!userID) return;

  fetch(`${SERVER_URL}?action=getZahony&userID=${userID}`)
    .then(r => r.json())
    .then(arr => {
      const tbody = document.querySelector("#zahonyTable tbody");
      tbody.innerHTML = "";

      arr.forEach(z => {
        const row = document.createElement("tr");

        // 1) Checkbox
        const tdChk = document.createElement("td");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = z.ZahonID;
        tdChk.appendChild(cb);

        // 2) Název záhonu + ikonka
        const tdName = document.createElement("td");
        const link = document.createElement("a");
        link.href = "#";
        link.className = "zahon-link";
        link.onclick = () => otevriModal(z);

        // ikonka Freefield.png
        const ico = document.createElement("img");
        ico.src = "img/Freefield.png";
        ico.alt = "";
        ico.className = "zahon-icon";

        link.appendChild(ico);
        link.appendChild(document.createTextNode(z.NazevZahonu));
        tdName.appendChild(link);

        // 3) Velikost
        const plocha = (z.Velikost_m2 != null)
          ? z.Velikost_m2
          : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        const tdSize = document.createElement("td");
        tdSize.textContent = plocha + " m²";

        row.append(tdChk, tdName, tdSize);
        tbody.appendChild(row);
      });
    })
    .catch(e => console.error("Chyba načtení záhonů:", e));
}

// — Mazání záhonů —
function deleteSelected() {
  const checks = document.querySelectorAll(
    "#zahonyTable tbody input[type='checkbox']:checked"
  );
  if (!checks.length) return alert("Neoznačili jste žádný záhon.");

  showActionIndicator();

  const promises = Array.from(checks).map(cb => {
    const ps = new URLSearchParams();
    ps.append("action", "deleteZahon");
    ps.append("ZahonID", cb.value);
    return fetch(SERVER_URL, { method: "POST", body: ps }).then(r => r.text());
  });

  Promise.all(promises)
    .then(results => {
      const okAll = results.every(txt => txt.trim() === "OK");
      if (!okAll) console.warn("Některé mazání neproběhlo:", results);
      loadZahony();
    })
    .catch(e => console.error("Chyba mazání záhonu:", e))
    .finally(() => hideActionIndicator());
}

// — Přidání záhonu —
function addZahon() {
  const userID = localStorage.getItem("userID");
  const nazev  = document.getElementById("newNazev").value.trim();
  const delka  = parseFloat(document.getElementById("newDelka").value) || 0;
  const sirka  = parseFloat(document.getElementById("newSirka").value) || 0;
  if (!nazev || delka <= 0 || sirka <= 0) {
    alert("Vyplňte správně název, délku i šířku.");
    return;
  }

  showActionIndicator();

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
        ["newNazev","newDelka","newSirka"].forEach(id => 
          document.getElementById(id).value = ""
        );
        loadZahony();
      } else {
        alert("Chyba při přidávání záhonu: " + txt);
      }
    })
    .catch(e => console.error("Chyba addZahon:", e))
    .finally(() => hideActionIndicator());
}

// — Otevření modálního okna záhonu —
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
  const nazev = document.getElementById("editNazev").value.trim();
  const delka = parseFloat(document.getElementById("editDelka").value) || 0;
  const sirka = parseFloat(document.getElementById("editSirka").value) || 0;
  if (!nazev || delka <= 0 || sirka <= 0) {
    return alert("Vyplňte správně název, délku a šířku.");
  }

  // zapneme indikátor
  showActionIndicator();

  const ps = new URLSearchParams();
  ps.append("action", "updateZahon");
  ps.append("ZahonID", aktualniZahon.ZahonID);
  ps.append("NazevZahonu", nazev);
  ps.append("Delka", delka);
  ps.append("Sirka", sirka);

  fetch(SERVER_URL, { method: "POST", body: ps })
    .then(r => r.text())
    .then(txt => {
      if (txt.trim() === "OK") {
        // zavřeme modal a znovu načteme tabulku
        closeModal();
        loadZahony();
      } else {
        alert("Chyba při ukládání: " + txt);
      }
    })
    .catch(e => {
      console.error("Chyba saveZahon:", e);
      alert("Chyba při ukládání záhonu.");
    })
    .finally(() => {
      // vypneme indikátor
      hideActionIndicator();
    });
}

// — Načtení plodin pro setí —
function loadPlodiny() {
  fetch(`${SERVER_URL}?action=getPlodiny`)
    .then(r=>r.json())
    .then(arr=>{
      const sel = document.getElementById("plodinaSelect");
      if (!sel) return;
      sel.innerHTML = `<option value="">– vyber plodinu –</option>`;
      arr.forEach(p=>{
        const o = document.createElement("option");
        o.value = p.nazev;
        o.textContent = p.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>{
      console.error("Chyba při načítání plodin:", e);
      const sel = document.getElementById("plodinaSelect");
      if (sel) sel.innerHTML = `<option>Chyba načítání</option>`;
    });
}

// — Formulář událostí / setí / hnojení / sklizeň —
function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";

  const c = document.getElementById("udalostFormContainer");
  c.innerHTML = `<h4>${typ.charAt(0).toUpperCase()+typ.slice(1)}</h4>
    <label>Datum: <input type="date" id="udalostDatum"/></label><br>`;

  if (typ === "seti") {
    c.innerHTML += `
      <label>Plodina:
        <select id="plodinaSelect">
          <option>Načítám…</option>
        </select>
      </label><br>
    `;
    loadPlodiny();
  } else if (typ === "hnojeni") {
    c.innerHTML += `
      <label>Hnojivo: <input type="text" id="udalostHnojivo"/></label><br>
      <label>Množství (kg): <input type="number" id="udalostMnozstvi"/></label><br>
    `;
  } else if (typ === "sklizen") {
    c.innerHTML += `
      <label>Plodina: <input type="text" id="udalostPlodina"/></label><br>
      <label>Výnos (kg): <input type="number" id="udalostVynos"/></label><br>
    `;
  }

  c.innerHTML += `
    <label>Poznámka: <input type="text" id="udalostPoznamka"/></label><br>
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
  ctx.fillStyle = "#009900"; ctx.fillRect(0,0,200,200);
  const scale = Math.min(200/(d||1),200/(s||1));
  const w = (d||1)*scale, h = (s||1)*scale;
  const x = (200-w)/2, y = (200-h)/2;
  ctx.fillStyle = "#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
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
  cv.width  = base * factor;
  cv.height = base * factor;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#009900"; ctx.fillRect(0, 0, cv.width, cv.height);
  const scale = Math.min(cv.width/(d||1), cv.height/(s||1));
  const w = (d||1)*scale, h = (s||1)*scale;
  const x = (cv.width - w)/2, y = (cv.height - h)/2;
  ctx.fillStyle   = "#c2b280"; ctx.fillRect(x, y, w, h);
  ctx.lineWidth   = 2; ctx.strokeStyle = "#000"; ctx.strokeRect(x, y, w, h);
  document.getElementById("zoomModal").style.display = "flex";
}
function closeZoom() {
  document.getElementById("zoomModal").style.display = "none";
}

// — Auto-login při načtení stránky —
document.addEventListener("DOMContentLoaded", () => {
  // Zavěste zavírání zoom-modalu
  const zm = document.getElementById("zoomModal");
  if (zm) {
    zm.querySelector("button").addEventListener("click", closeZoom);
  }
  // Pokud máme uložené userID, přímo přihlásíme
  if (localStorage.getItem("userID")) {
    onLoginSuccess();
  }
});