// URL vašeho Google Apps Scriptu
const SERVER_URL = "https://script.google.com/macros/s/AKfycbzIbLz5PiesOcF13vJFU84YBL7duwEMpoXJF9Ha8jxqrJBRAWiR8B8qnVhOeS3O1om3/exec";


// — Počasí podle geolokace —
function loadWeatherByGeolocation() {
  const contIcon = document.getElementById("weatherIcon");
  const contTemp = document.getElementById("weatherTemp");
  if (!navigator.geolocation) {
    contTemp.textContent = "–";
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lon } = pos.coords;
    fetch(`https://wttr.in/${lat},${lon}?format=j1`)
      .then(r => r.json())
      .then(data => {
        const cur = data.current_condition[0];
        contIcon.src         = cur.weatherIconUrl[0].value;
        contIcon.alt         = cur.weatherDesc[0].value;
        contTemp.textContent = `${cur.temp_C} °C`;
      })
      .catch(err => {
        console.error("Počasí:", err);
        contTemp.textContent = "–";
      });
  }, err => {
    console.warn("Geolokace selhala:", err);
    contTemp.textContent = "–";
  });
}

// — Indikátor akce (rotující mrkev) —
function showActionIndicator() {
  const images = [
    'Plodina_mrkev .png',
    'Plodina_rajce.png',
    'Plodina_petrzel_koren.png'
  ];
  const randIdx = Math.floor(Math.random() * images.length);
  const imgEl = document.querySelector('#actionIndicator img');
  imgEl.src = `img/${images[randIdx]}`;
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

// — Načtení seznamu záhonů —
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
        // checkbox
        const tdChk = document.createElement("td");
        const cb    = document.createElement("input");
        cb.type  = "checkbox";
        cb.value = z.ZahonID;
        tdChk.appendChild(cb);
        // název + ikona
        const tdName = document.createElement("td");
        const link = document.createElement("a");
        link.href      = "#";
        link.className = "zahon-link";
        link.onclick   = () => otevriModal(z);
        const ico = document.createElement("img");
        ico.src       = "img/Freefield.png";
        ico.alt       = "";
        ico.className = "zahon-icon";
        link.appendChild(ico);
        link.appendChild(document.createTextNode(z.NazevZahonu));
        tdName.appendChild(link);
        // plocha
        const plo = z.Velikost_m2 != null
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

// — Mazání označených záhonů —
function deleteSelected() {
  const checks = document.querySelectorAll("#zahonyTable tbody input[type='checkbox']:checked");
  if (!checks.length) return;
  showActionIndicator();
  const promises = Array.from(checks).map(cb => {
    const ps = new URLSearchParams();
    ps.append("action","deleteZahon");
    ps.append("ZahonID", cb.value);
    return fetch(SERVER_URL, { method:"POST", body:ps }).then(r => r.text());
  });
  Promise.all(promises)
    .then(results => {
      if (!results.every(txt => txt.trim()==="OK")) {
        console.warn("Některé mazání selhalo:", results);
      }
      loadZahony();
    })
    .catch(e => console.error("Chyba mazání záhonů:", e))
    .finally(() => hideActionIndicator());
}

// — Přidání nového záhonu —
function addZahon() {
  const userID = localStorage.getItem("userID");
  const nazev  = document.getElementById("newNazev").value.trim();
  const delka  = parseFloat(document.getElementById("newDelka").value) || 0;
  const sirka  = parseFloat(document.getElementById("newSirka").value) || 0;
  if (!nazev||delka<=0||sirka<=0) {
    alert("Vyplňte správně název, délku i šířku.");
    return;
  }
  showActionIndicator();
  const ps = new URLSearchParams();
  ps.append("action","addZahon");
  ps.append("userID", userID);
  ps.append("NazevZahonu", nazev);
  ps.append("Delka", delka);
  ps.append("Sirka", sirka);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r => r.text())
    .then(txt => {
      if (txt.trim()==="OK") {
        ["newNazev","newDelka","newSirka"].forEach(id=>document.getElementById(id).value="");
        loadZahony();
      } else {
        alert("Chyba při přidávání: "+txt);
      }
    })
    .catch(e => console.error("Chyba addZahon:",e))
    .finally(() => hideActionIndicator());
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
        o.value       = p.nazev;
        o.textContent = p.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>{
      console.error("Chyba načítání plodin:", e);
      const sel = document.getElementById("plodinaSelect");
      if (sel) sel.innerHTML = `<option>Chyba načítání</option>`;
    });
}

// — Zobrazení formuláře Setí / Hnojení / Sklizeň —
function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";
  const c = document.getElementById("udalostFormContainer");
  let html = `<h4>${typ.charAt(0).toUpperCase()+typ.slice(1)}</h4>
    <label>Datum: <input type="date" id="udalostDatum"/></label><br>`;
  if (typ==="seti") {
    html += `<label>Plodina:
      <select id="plodinaSelect"><option>Načítám…</option></select>
    </label><br>`;
    loadPlodiny();
  } else if (typ==="hnojeni") {
    html += `<label>Hnojivo:
      <input type="text" id="udalostHnojivo"/>
    </label><br>
    <label>Množství (kg):
      <input type="number" id="udalostMnozstvi"/>
    </label><br>`;
  } else if (typ==="sklizen") {
    html += `<label>Plodina:
      <input type="text" id="udalostPlodina"/>
    </label><br>
    <label>Výnos (kg):
      <input type="number" id="udalostVynos"/>
    </label><br>`;
  }
  html += `<button onclick="ulozUdalost('${typ}')">Uložit</button>`;
  c.innerHTML = html;
}

// — Uložení události (volání GAS) —
function ulozUdalost(typ) {
  const ps = new URLSearchParams();
  ps.append("action","addUdalost");
  ps.append("zahonID",    aktualniZahon.ZahonID);
  ps.append("typ",        typ);
  ps.append("datum",      document.getElementById("udalostDatum").value);
  if (typ==="seti") {
    ps.append("plodina", document.getElementById("plodinaSelect").value);
  }
  if (typ==="hnojeni") {
    ps.append("hnojivo", document.getElementById("udalostHnojivo").value);
    // --- důležitá změna: množství jako číslo ---
    const mk = parseFloat(document.getElementById("udalostMnozstvi").value) || 0;
    ps.append("mnozstvi", mk);
  }
  if (typ==="sklizen") {
    ps.append("plodina", document.getElementById("udalostPlodina").value);
    ps.append("vynos",   parseFloat(document.getElementById("udalostVynos").value)||0);
  }
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if (txt.trim()==="OK") {
        zpetNaDetailZahonu();
        loadZahony();  // nebo zobrazUdalosti
      } else {
        alert("Chyba události: "+txt);
      }
    });
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
      <div class="nutrient"><label>pH:</label><input type="number" step="0.1" id="analPH"/></div>
      <div class="nutrient"><label>N (ppm):</label><input type="number" id="analN"/></div>
      <div class="nutrient"><label>P (ppm):</label><input type="number" id="analP"/></div>
      <div class="nutrient"><label>K (ppm):</label><input type="number" id="analK"/></div>
    </div>
    <div class="soil-info">
      <label>Typ půdy:<input type="text" id="soilType"/></label><br>
      <label>Barva půdy:<input type="text" id="soilColor"/></label>
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

// — Boční panel ikon —
function setActiveIcon(active) {
  ["mereni","seti","hnojeni","sklizen","analyza","nastaveni"]
    .forEach(t => {
      const el = document.getElementById(`icon-${t}`);
      if (el) el.classList.toggle("active", t === active);
    });
}
function onIconClick(typ) {
  setActiveIcon(typ);
  document.getElementById("modalViewDefault").style.display  = "none";
  document.getElementById("modalViewUdalost").style.display = "none";
  if (["seti","hnojeni","sklizen"].includes(typ)) {
    showUdalostForm(typ);
  } else if (typ === "mereni") {
    document.getElementById("modalViewDefault").style.display = "block";
  } else if (typ === "analyza") {
    showAnalysisForm();
  }
}

// — Vizualizace záhonu (canvas) —
let aktualniZahon = null;
function otevriModal(zahon) {
  aktualniZahon = zahon;
  setActiveIcon(null);
  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka || 0;
  document.getElementById("editSirka").value = zahon.Sirka || 0;
  updatePlocha();
  nakresliZahonCanvas(zahon.Delka, zahon.Sirka);
  document.getElementById("modalViewDefault").style.display  = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modal").style.display            = "flex";
}
function closeModal() {
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}

function updatePlocha() {
  const d = parseFloat(document.getElementById("editDelka").value)||0;
  const s = parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent = (d*s).toFixed(2);
}

function saveZahon() {
  const n = document.getElementById("editNazev").value.trim();
  const d = parseFloat(document.getElementById("editDelka").value)||0;
  const s = parseFloat(document.getElementById("editSirka").value)||0;
  if (!n||d<=0||s<=0) return alert("Vyplňte správně všechny hodnoty.");
  showActionIndicator();
  const ps = new URLSearchParams();
  ps.append("action","updateZahon");
  ps.append("ZahonID", aktualniZahon.ZahonID);
  ps.append("NazevZahonu", n);
  ps.append("Delka", d);
  ps.append("Sirka", s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if (txt.trim()==="OK") {
        closeModal();
        loadZahony();
      } else {
        alert("Chyba při ukládání: "+txt);
      }
    })
    .catch(e=>console.error("Chyba saveZahon:",e))
    .finally(()=>hideActionIndicator());
}

function nakresliZahonCanvas(d, s) {
  const cont = document.getElementById("zahonVizualizace");
  cont.innerHTML = "";
  const cv = document.createElement("canvas");
  cv.width = cv.height = 200;
  const ctx = cv.getContext("2d");
  // zelené pozadí
  ctx.fillStyle = "#009900"; ctx.fillRect(0,0,200,200);
  // záhon
  const scale = Math.min(200/(d||1),200/(s||1));
  const w = (d||1)*scale, h = (s||1)*scale;
  const x = (200-w)/2, y = (200-h)/2;
  ctx.fillStyle = "#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth = 2; ctx.strokeStyle = "#000"; ctx.strokeRect(x,y,w,h);
  // klik pro zoom
  cv.style.cursor = "pointer";
  cv.onclick = () => {
    if (document.getElementById("modal").style.display==="flex" && aktualniZahon) {
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
  ctx.fillStyle = "#009900"; ctx.fillRect(0,0,cv.width,cv.height);
  const scale = Math.min(cv.width/(d||1),cv.height/(s||1));
  const w = (d||1)*scale, h = (s||1)*scale;
  const x = (cv.width-w)/2, y = (cv.height-h)/2;
  ctx.fillStyle   = "#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth   = 2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  document.getElementById("zoomModal").style.display = "flex";
}
function closeZoom() {
  document.getElementById("zoomModal").style.display = "none";
}

// — Auto-login a init —
document.addEventListener("DOMContentLoaded", () => {
  loadWeatherByGeolocation();
  const zm = document.getElementById("zoomModal");
  if (zm) zm.querySelector("button").addEventListener("click", closeZoom);
  if (localStorage.getItem("userID")) onLoginSuccess();
});