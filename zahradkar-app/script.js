// — deklarace —  
const SERVER_URL = "/.netlify/functions/proxy";

let aktualniZahon = null;
// CACHE OBJEKT
let modalDataCache = {
  hnojeniHistory: null,
  setiSklizenHistory: null,
  plodiny: null,
  posledniSetaPlodina: null
};
// — Počasí dle geolokace —
function loadWeatherByGeolocation(){
  const ic = document.getElementById("weatherIcon"),
        tp = document.getElementById("weatherTemp");
  if(!navigator.geolocation){ tp.textContent="–"; return; }
  navigator.geolocation.getCurrentPosition(p=>{
    const {latitude:lat, longitude:lon} = p.coords;
    fetch(`https://wttr.in/${lat},${lon}?format=j1`)
      .then(r=>r.json())
      .then(d=>{
        const cur = d.current_condition[0];
        ic.src = cur.weatherIconUrl[0].value;
        ic.alt = cur.weatherDesc[0].value;
        tp.textContent = `${cur.temp_C} °C`;
      })
      .catch(e=>{ tp.textContent="–"; });
  },_=> tp.textContent="–");
}

// — Indikátor akce (mrkev) —
function showActionIndicator(){
  const imgs = [
    'Plodina_mrkev .png',
    'Plodina_rajce.png',
    'Plodina_petrzel_koren.png'
  ];
  const idx = Math.floor(Math.random()*imgs.length);
  document.querySelector('#actionIndicator img')
    .src = `img/${imgs[idx]}`;
  document.getElementById('actionIndicator').classList.add('active');
}
function hideActionIndicator(){
  document.getElementById('actionIndicator').classList.remove('active');
}

// — Přihlášení / odhlášení —
async function login() {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();
  try {
    const res = await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "login", username: u, password: p })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem("userID", data.userID);
      onLoginSuccess();
    } else {
      document.getElementById("loginMsg").innerText = "Neplatné přihlašovací údaje.";
    }
  } catch {
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

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("userID")) {
    onLoginSuccess();
  }
  loadWeatherByGeolocation();

  // ✅ PŘIDEJ TENTO POSLUCHAČ PRO DYNAMICKÉ ELEMENTY
  document.body.addEventListener("change", function(e) {
    if (e.target && e.target.id === "plodinaSelect") {
      zobrazDoporuceniHnojeni();
    }
  });
});


// — Načtení seznamu záhonů —
async function loadZahony() {
  const uid = localStorage.getItem("userID");
  if (!uid) return;
  try {
    const res = await fetch(`${SERVER_URL}?action=getZahony&userID=${uid}`);
    const arr = await res.json();
    const tb = document.querySelector("#zahonyTable tbody");
    tb.innerHTML = "";
    arr.forEach(z => {
      const row = document.createElement("tr");
      const td1 = document.createElement("td");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = z.ZahonID;
      td1.append(cb);

      const td2 = document.createElement("td");
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = z.NazevZahonu;
      a.addEventListener("click", e => {
        e.preventDefault();
        otevriModal(z);
      });
      td2.append(a);

      const td3 = document.createElement("td");
      const plo = z.Velikost_m2 != null
        ? z.Velikost_m2
        : ((z.Delka || 0) * (z.Sirka || 0)).toFixed(2);
      td3.textContent = `${plo} m²`;

      row.append(td1, td2, td3);
      tb.append(row);
    });
  } catch {}
}

// — Mazání vybraných záhonů —
function deleteSelected() {
  const checks = document.querySelectorAll("#zahonyTable tbody input:checked");
  if (!checks.length) {
    alert("Neoznačili jste žádný záhon."); return;
  }
  showActionIndicator();
  const promises = Array.from(checks).map(cb => {
    const ps = new URLSearchParams();
    ps.append("action", "deleteZahon");
    ps.append("ZahonID", cb.value);
    return fetch(SERVER_URL, { method: "POST", body: ps }).then(res => res.text());
  });
  Promise.all(promises)
    .then(() => loadZahony())
    .finally(() => hideActionIndicator());
}

async function addZahon(){
  const uid = localStorage.getItem("userID");
  const n   = document.getElementById("newNazev").value.trim();
  const d   = parseFloat(document.getElementById("newDelka").value) || 0;
  const s   = parseFloat(document.getElementById("newSirka").value) || 0;
  
  // ✅ Načti typ plochy z radio buttonu
  const typ = document.querySelector('input[name="typPlochy"]:checked')?.value || "zahon";
  
  if (!n || d <= 0 || s <= 0) {
    alert("Vyplňte správně název, délku i šířku.");
    return;
  }
  
  showActionIndicator();
  const ps = new URLSearchParams();
  ps.append("action", "addZahon");
  ps.append("userID", uid);
  ps.append("NazevZahonu", n);
  ps.append("Delka", d);
  ps.append("Sirka", s);
  ps.append("typ", typ); // ✅ PŘIDEJ TYP PLOCHY
  
  try {
    const res = await fetch(SERVER_URL, { method: "POST", body: ps });
    const text = await res.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: text.trim() === "OK" };
    }
    
    if (data.success) {
      document.getElementById("newNazev").value = "";
      document.getElementById("newDelka").value = "";
      document.getElementById("newSirka").value = "";
      await loadZahony();
    } else {
      alert("Nepodařilo se přidat záhon.");
    }
  } catch (err) {
    console.error("Chyba při přidávání záhonu:", err);
    alert("Chyba při přidávání záhonu.");
  } finally {
    hideActionIndicator();
  }
}

function setActiveIcon(active) {
  const icons = ["mereni", "seti", "hnojeni", "analyza", "nastaveni"];
  icons.forEach(iconName => {
    const elem = document.getElementById(`icon-${iconName}`);
    if (elem) {
      if (iconName === active) {
        elem.classList.add("active");
      } else {
        elem.classList.remove("active");
      }
    }
  });
}

function onIconClick(typ){
  setActiveIcon(typ);
  document.getElementById("modalViewDefault").style.display="none";
  document.getElementById("modalViewUdalost").style.display="none";
  if (typ === "seti") {
    showUdalostForm("plodina");
  } else if (typ === "hnojeni") {
    showUdalostForm("hnojeni");
  } else if (typ === "mereni") {
    document.getElementById("modalViewDefault").style.display = "block";
  } else if (typ === "analyza") {
    showAnalysisForm();
  }
}



async function otevriModal(z) {
  // --- UI příprava ---
  document.getElementById("nazevZahonu").textContent = z?.NazevZahonu || "";
  aktualniZahon = z;
  setActiveIcon(null);

  const nazevInput = document.getElementById("editNazev");
  const delkaInput = document.getElementById("editDelka");
  const sirkaInput = document.getElementById("editSirka");
  const modal = document.getElementById("modal");
  const canvas = document.getElementById("zahonCanvas");

  if (!nazevInput || !delkaInput || !sirkaInput || !modal || !canvas) return;

  nazevInput.value = z?.NazevZahonu || "";
  delkaInput.value = z?.Delka || 0;
  sirkaInput.value = z?.Sirka || 0;
  updatePlocha();

  try {
    requestAnimationFrame(() => {
      const canvas = document.getElementById("zahonCanvas");
      if (canvas) {
        resizeAndDrawCanvas(canvas, aktualniZahon?.Delka, aktualniZahon?.Sirka);
      }
    });
  } catch {}

  document.getElementById("modalViewDefault").style.display = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  modal.style.display = "flex";

  // --- Loader do historie vždy ---
  const udalostHistElem = document.getElementById("udalostHistory");
  if (udalostHistElem) udalostHistElem.innerHTML = "<p>Načítám…</p>";
  const hnojeniHistElem = document.getElementById("hnojeniHistory");
  if (hnojeniHistElem) hnojeniHistElem.innerHTML = "<p>Načítám…</p>";

  // --- Pokud má záhon platné ZahonID, načti historii ---
  if (z?.ZahonID) {
    await preloadModalData(z);
    zobrazSetiSklizenHistory();
    zobrazHnojeniHistory();
    naplnPlodinySelect();
  } else {
    // Pokud záhon nemá ID (např. nový ještě neuložený), zobraz info/fallback nebo prázdnou historii
    if (udalostHistElem) udalostHistElem.innerHTML = "<p>Žádná historie setí nebo sklizně.</p>";
    if (hnojeniHistElem) hnojeniHistElem.innerHTML = "<p>Žádná historie hnojení.</p>";
    naplnPlodinySelect();
  }
}



// PRELOAD FUNKCE
async function preloadModalData(zahon) {
  if (!zahon || !zahon.ZahonID) {
    console.warn("preloadModalData: Chybí platný záhon nebo ZahonID", zahon);
    return;
  }
  try{
    const zahonID = zahon.ZahonID;
    const [hnojArr, setiSklArr, plodinyArr] = await Promise.all([
      fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${zahonID}`).then(r => r.json()),
      fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${zahonID}`).then(r => r.json()),
      fetch(`${SERVER_URL}?action=getPlodiny`).then(r => r.json())
    ]);

    modalDataCache.hnojeniHistory = hnojArr.filter(u => (u.Typ || "").toLowerCase() === "hnojení");
    modalDataCache.setiSklizenHistory = setiSklArr.filter(u => u.Typ === "Setí" || u.Typ === "Sklizeň");
    modalDataCache.plodiny = plodinyArr;

    // Poslední zasetá plodina (logika z původní prefill funkce)
    const seti = setiSklArr.filter(u => (u.Typ || "").toLowerCase() === "setí");
    const sklizne = setiSklArr.filter(u => (u.Typ || "").toLowerCase() === "sklizeň");
    let posledniZaseta = null;
    for (let i = seti.length - 1; i >= 0; i--) {
      const datumSeti = czDateStringToDate(seti[i].Datum);
      const bylaSklizena = sklizne.some(sk => czDateStringToDate(sk.Datum) > datumSeti);
      if (!bylaSklizena) {
        posledniZaseta = seti[i];
        break;
      }
    }
    modalDataCache.posledniSetaPlodina = posledniZaseta ? posledniZaseta.Plodina : null;
  } catch (e) {
    modalDataCache = {
      hnojeniHistory: [],
      setiSklizenHistory: [],
      plodiny: [],
      posledniSetaPlodina: null
    };
    console.error("Chyba při preloadu modal dat:", e);
  }
}

function closeModal(){
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}

// — Úprava a uložení záhonu —
function updatePlocha(){
  const d = parseFloat(document.getElementById("editDelka").value)||0,
        s = parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent = `${(d * s).toFixed(2)} m²`;
}
function saveZahon(){
  const n = document.getElementById("editNazev").value.trim(),
        d = parseFloat(document.getElementById("editDelka").value)||0,
        s = parseFloat(document.getElementById("editSirka").value)||0;
  if(!n||d<=0||s<=0){
    alert("Vyplňte správně název, délku a šířku."); return;
  }
  showActionIndicator();
  const ps = new URLSearchParams();
  ps.append("action","updateZahon");
  ps.append("ZahonID",aktualniZahon.ZahonID);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if(txt.trim()==="OK"){
        closeModal(); loadZahony();
      } else {
        alert("Chyba při ukládání: "+txt);
      }
    })
    .finally(()=>hideActionIndicator());
}

function todayForInput() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // formát pro input[type="date"]
}

function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";

  const c = document.getElementById("udalostFormContainer");
  if (!c) return;

  // === HNOJENÍ ===
  if (typ === "hnojeni") {
    window.typAkce = "hnojeni";

    c.innerHTML = `
      
      <div class="udalost-row">
        <input type="date" id="hnojeniDatum" class="udalost-input"/>
      </div>

      <div class="udalost-row">
        <select id="hnojivoSelect" class="udalost-input">
          <option value="">– vyber hnojivo –</option>
        </select>
      </div>

      <div class="udalost-row">
        <input type="number" id="hnojeniMnozstvi" class="udalost-input" placeholder="Množství (kg)"/>
      </div>

      <div class="udalost-row">
        <div class="udalost-actions">
          <img src="img/Safe.png"   alt="Uložit" class="modal-btn" onclick="ulozHnojeni()"/>
          <img src="img/Goback .png" alt="Zpět"   class="modal-btn" onclick="zpetNaDetailZahonu()"/>
        </div>
      </div>

      <div id="hnojeniHistory" class="hnojeni-history">
        <em>Načítám historii...</em>
      </div>
    `;

    const datumInput = document.getElementById("hnojeniDatum");
    if (datumInput && !window.editMode) {
      datumInput.value = todayForInput();        // default dnes [web:101][web:102]
    }

    if (!window.editMode) {
      loadHnojiva();
    }
    zobrazHnojeniHistory();
    return;
  }

  // === SETÍ / SKLIZEŇ (PLODINA) ===
  if (typ === "plodina") {
    c.innerHTML = `
          <div class="typAkceBtns">
        <button type="button" id="btnSeti"
                class="typ-akce-btn active"
                onclick="changeTypAkce('seti')">Setí</button>
        <button type="button" id="btnSklizen"
                class="typ-akce-btn"
                onclick="changeTypAkce('sklizen')">Sklizeň</button>
      </div>

      <div class="udalost-row">
        <input type="date" id="udalostDatum" class="udalost-input"/>
      </div>

      <div class="udalost-row">
        <select id="plodinaSelect" class="udalost-input">
          <option value="">– vyber plodinu –</option>
        </select>
      </div>

      <div class="udalost-row" id="vynosRow">
        <input type="number" id="udalostVynos" class="udalost-input" placeholder="Výnos (kg)"/>
      </div>

      <div class="udalost-row">
        <div class="udalost-actions">
          <img src="img/Safe.png"   alt="Uložit" class="modal-btn" onclick="ulozUdalost()"/>
          <img src="img/Goback .png" alt="Zpět"   class="modal-btn" onclick="zpetNaDetailZahonu()"/>
        </div>
      </div>

      <div id="udalostHistory" class="hnojeni-history">
        <em>Načítám historii...</em>
      </div>
    `;

    const datumInput = document.getElementById("udalostDatum");
    if (datumInput && !window.editMode) {
      datumInput.value = todayForInput();        // default dnes [web:101][web:102]
    }

    window.typAkce = "seti";
    changeTypAkce("seti");                       // schová výnos pro setí

    naplnPlodinySelect?.();
    zobrazSetiSklizenHistory?.();
  }
}



function zpetNaDetailZahonu(){
  const uv = document.getElementById("modalViewUdalost");
  uv.style.display = "none";
  uv.classList.remove("analysis");
  document.getElementById("modalViewDefault").style.display = "block";
  setActiveIcon(null);
}

function normalizeDateForBackend(d) {
  if (!d) return "";
  const s = String(d).trim();

  // input type="date" → YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split("-");
    return `${day}.${m}.${y}`;  // 11.11.2025
  }

  // už DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    return s;
  }

  // něco jako "11.11.2025 1:00:00" → vezmi část před mezerou
  if (s.includes(" ")) {
    return s.split(" ")[0];
  }

  return s;
}



async function ulozUdalost() {
  const typ = window.typAkce;
  const zahonID = aktualniZahon?.ZahonID;
  const datumRaw = document.getElementById("udalostDatum").value;
  const plodina = document.getElementById("plodinaSelect").value.trim();
  let vynos = document.getElementById("udalostVynos").value.replace(",", ".");
  vynos = vynos === "" ? "" : parseFloat(vynos);

  if (!zahonID || !datumRaw || !plodina) {
    alert("Záhon, datum a plodina jsou povinné.");
    return;
  }

  const datum = normalizeDateForBackend(datumRaw);

  const ps = new URLSearchParams();

  if (window.editMode) {
    ps.append("action", "updateUdalost");
    ps.append("udalostID", window.editUdalostID);
  } else {
    ps.append("action", "addUdalost");
  }

  ps.append("zahonID", zahonID);
  ps.append("datum", datum);

  if (typ === "seti") {
    ps.append("typ", "Setí");
    ps.append("plodina", plodina);
    ps.append("vynos", "");
  } else if (typ === "sklizen") {
    ps.append("typ", "Sklizeň");
    ps.append("plodina", plodina);
    ps.append("vynos", vynos);
  }

  ps.append("hnojivo", "");
  ps.append("mnozstvi", "");
  ps.append("poznamka", "");

  try {
    showActionIndicator?.();

    const res = await fetch(SERVER_URL, { method: "POST", body: ps });
    const text = await res.text();

    let success = false;
    try {
      const data = JSON.parse(text);
      success = data.success === true;
    } catch {
      success = text.trim() === "OK";
    }

    if (success) {
      window.editMode = false; 
      window.editUdalostID = null;

      await preloadModalData(aktualniZahon);
      zobrazSetiSklizenHistory?.();
      zobrazHnojeniHistory?.();
      zpetNaDetailZahonu?.();

      alert("Událost byla uložena.");
    } else {
      alert("Chyba při ukládání události: " + text);
    }
  } catch (e) {
    console.error("Chyba při odesílání události:", e);
    alert("Chyba při odesílání události.");
  } finally {
    hideActionIndicator?.();
  }
}


async function smazUdalost(id, typ) {
  if (!confirm(`Opravdu chceš smazat ${typ.toLowerCase()} (ID ${id})?`)) return;

  try {
    const ps = new URLSearchParams();
    ps.append("action", "deleteUdalost");
    ps.append("udalostID", id); // odpovídá e.parameter.udalostID

    const res = await fetch(SERVER_URL, { method: "POST", body: ps });
    const text = await res.text();

    if (text.trim() === "OK") {
      alert(`${typ} bylo úspěšně smazáno.`);
      await preloadModalData(aktualniZahon);
      zobrazHnojeniHistory();
      zobrazSetiSklizenHistory();
    } else {
      alert("Chyba při mazání: " + text);
    }
  } catch (e) {
    alert("Chyba při odesílání požadavku: " + e.message);
  }
}




function loadHnojiva() {
  return fetch(`${SERVER_URL}?action=getHnojiva`)
    .then(r => r.json())
    .then(arr => {
      const sel = document.getElementById("hnojivoSelect");
      if (!sel) return;
      sel.innerHTML = `<option value="">– vyber hnojivo –</option>`;
      arr.forEach(h => {
        const o = document.createElement("option");
        o.value = h.nazev;
        o.textContent = h.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e => console.error("Chyba hnojiv:", e));
}

async function ulozHnojeni() {
  const zahonID = aktualniZahon?.ZahonID;
  const datumRaw = document.getElementById("hnojeniDatum").value;
  const hnojivo = document.getElementById("hnojivoSelect").value;
  const mnozstvi = document.getElementById("hnojeniMnozstvi").value;

  if (!zahonID || !datumRaw || !hnojivo || !mnozstvi) {
    alert("Vyplňte všechny povinné údaje.");
    return;
  }

  const datum = normalizeDateForBackend(datumRaw);

  const ps = new URLSearchParams();

  if (window.editMode && window.editUdalostID) {
    ps.append("action", "updateUdalost");
    ps.append("udalostID", window.editUdalostID);
  } else {
    ps.append("action", "addUdalost");
  }

  ps.append("zahonID", zahonID);
  ps.append("datum", datum);
  ps.append("typ", "Hnojení");
  ps.append("hnojivo", hnojivo);
  ps.append("mnozstvi", mnozstvi);
  ps.append("plodina", "");
  ps.append("vynos", "");
  ps.append("poznamka", "");

  try {
    showActionIndicator?.();
    const res = await fetch(SERVER_URL, { method: "POST", body: ps });
    const text = await res.text();

    let success = false;
    try {
      const data = JSON.parse(text);
      success = data.success === true;
    } catch {
      success = text.trim() === "OK";
    }

    if (success) {
      window.editMode = false;
      window.editUdalostID = null;
      await preloadModalData(aktualniZahon);
      zobrazHnojeniHistory?.();
      zpetNaDetailZahonu?.();
    } else {
      alert("Chyba při ukládání hnojení: " + text);
    }
  } catch (e) {
    console.error("Chyba při ukládání hnojení:", e);
    alert("Chyba při odesílání hnojení.");
  } finally {
    hideActionIndicator?.();
  }
}



function zobrazHnojeniHistory() {
  const cont = document.getElementById("hnojeniHistory");
  if (!cont) return;
  const data = modalDataCache.hnojeniHistory || [];
  if (!data.length) {
    cont.innerHTML = "<p>Žádná historie hnojení.</p>";
    return;
  }

  let html = `<table>
    <thead>
      <tr><th>Datum</th><th>Hnojivo</th><th>Množství (kg)</th><th></th></tr>
    </thead>
    <tbody>`;

  data.slice().reverse().slice(0, 5).forEach(u => {
    console.log("DEBUG datum:", u.Datum, typeof u.Datum);
    const datumText = formatDate(u.Datum);
    html += `<tr>
      <td>${datumText}</td>
      <td>${u.Hnojivo || ""}</td>
      <td>${u.Mnozstvi || u.Mnozstvi_kg || ""}</td>
      <td>
        <button onclick="smazUdalost(${u.UdalostID}, 'Hnojení')">🗑️</button>
        <button onclick="otevriUpravuUdalosti(${u.UdalostID}, '${u.Typ}')">✏️</button>
      </td>
    </tr>`;
  });

  html += "</tbody></table>";
  cont.innerHTML = html;
}



// FUNKCE PRO ZOBRAZENÍ HISTORIE SETÍ/SKLIZNĚ
function zobrazSetiSklizenHistory() {
  const cont = document.getElementById("udalostHistory");
  if (!cont) return;
  const data = modalDataCache.setiSklizenHistory || [];
  if (!data.length) {
    cont.innerHTML = "<p>Žádná historie setí nebo sklizně.</p>";
    return;
  }

  let html = `<table>
    <thead><tr><th>Datum</th><th>Typ</th><th>Plodina</th><th>Výnos (kg)</th><th></th></tr></thead>
    <tbody>`;

  data.slice().reverse().slice(0, 6).forEach(u => {
    console.log("DEBUG datum:", u.Datum, typeof u.Datum);
    const datumText = formatDate(u.Datum);
    html += `<tr>
      <td>${datumText}</td>
      <td>${u.Typ}</td>
      <td>${u.Plodina || ""}</td>
      <td>${u.Vynos || ""}</td>
      <td>
        <button onclick="smazUdalost(${u.UdalostID}, 'Hnojení')">🗑️</button>
        <button onclick="otevriUpravuUdalosti(${u.UdalostID}, '${u.Typ}')">✏️</button>
      </td>
    </tr>`;
  });

  html += "</tbody></table>";
  cont.innerHTML = html;
}
function formatDateForInput(d) {
  if (!d) return "";
  let s = String(d).trim();

  // už je YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD.MM.YYYY → YYYY-MM-DD
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    const [day, mon, yr] = s.split(".");
    return `${yr}-${mon}-${day}`;
  }

  // fallback – vezmi jen první část před mezerou
  if (s.includes(" ")) s = s.split(" ")[0];
  return s;
}


// FUNKCE – otevření formuláře pro úpravu existující události
function otevriUpravuUdalosti(id, typ) {
  // Najdi událost v cache
  const vsechny = [
    ...(modalDataCache.hnojeniHistory || []),
    ...(modalDataCache.setiSklizenHistory || [])
  ];
  const udalost = vsechny.find(u => u.UdalostID === id);
  if (!udalost) return alert("Událost nenalezena!");

  // Zapni režim úprav
  window.editMode = true;
  window.editUdalostID = id;

  const t = (typ || udalost.Typ || "").toLowerCase();

if (t === "hnojení") {
  window.typAkce = "hnojeni";
  showUdalostForm("hnojeni");

  const datumInput = document.getElementById("hnojeniDatum");
  const hnojivoSelect = document.getElementById("hnojivoSelect");
  const mnozstviInput = document.getElementById("hnojeniMnozstvi");

  if (datumInput) {
  datumInput.value = formatDateForInput(udalost.Datum);
  }

  const vybraneHnojivo = udalost.Hnojivo || "";

  if (hnojivoSelect) {
    // Nejprve vlož aktuální hodnotu, ať něco vidíš
    hnojivoSelect.innerHTML =
      `<option value="${vybraneHnojivo}">${vybraneHnojivo}</option>`;

    // Pak načti celý seznam a ponech vybranou hodnotu
    loadHnojiva().then(() => {
      const opt = Array.from(hnojivoSelect.options)
        .find(o => o.value === vybraneHnojivo);
      if (opt) {
        hnojivoSelect.value = vybraneHnojivo;
      } else if (vybraneHnojivo) {
        const o = document.createElement("option");
        o.value = vybraneHnojivo;
        o.textContent = vybraneHnojivo;
        hnojivoSelect.appendChild(o);
        hnojivoSelect.value = vybraneHnojivo;
      }
    });
  }

  if (mnozstviInput) {
    mnozstviInput.value = udalost.Mnozstvi || udalost.Mnozstvi_kg || "";
  }

  return;
}

  // === REŽIM SETÍ / SKLIZEŇ ===
  window.typAkce =
    udalost.Typ.toLowerCase() === "setí" ? "seti" : "sklizen";

  // přepni na formulář setí/sklizně
  showUdalostForm("plodina");

  // Přepni modal — zobraz formulář události (showUdalostForm už dělá, ale pro jistotu)
  const viewDefault = document.getElementById("modalViewDefault");
  const viewUdalost = document.getElementById("modalViewUdalost");
  if (viewDefault) viewDefault.style.display = "none";
  if (viewUdalost) viewUdalost.style.display = "block";

  // Datum
  const datumInput = document.getElementById("udalostDatum");
if (datumInput) {
  datumInput.value = formatDateForInput(udalost.Datum);
}


  // Plodina
  const plodinaSelect = document.getElementById("plodinaSelect");
  if (plodinaSelect) {
    plodinaSelect.innerHTML =
      `<option value="${udalost.Plodina || ""}">${udalost.Plodina || ""}</option>`;
  }

  // Výnos
  const vynosInput = document.getElementById("udalostVynos");
  const vynosLabel = document.getElementById("vynosLabel");
  if (udalost.Typ === "Sklizeň") {
    if (vynosInput) {
      vynosInput.disabled = false;
      vynosInput.value = udalost.Vynos_kg || udalost.Vynos || "";
    }
    if (vynosLabel) vynosLabel.style.display = "inline";
  } else {
    if (vynosInput) {
      vynosInput.disabled = true;
      vynosInput.value = "";
    }
    if (vynosLabel) vynosLabel.style.display = "none";
  }

  // (pokud používáš poznámku / další pole pro setí/sklizeň, můžeš je doplnit sem)
}




function resizeAndDrawCanvas(canvas, delka, sirka) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const parent = canvas.parentElement;
  const padding = 10;

  const width  = parent.clientWidth;
  const height = parent.clientHeight;
  canvas.width  = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  // poměr stran záhonu
  const aspectRatio = delka / sirka;

  const maxDrawWidth  = width  - padding * 2;
  const maxDrawHeight = height - padding * 2;

  let drawWidth  = maxDrawWidth;
  let drawHeight = drawWidth / aspectRatio;

  if (drawHeight > maxDrawHeight) {
    drawHeight = maxDrawHeight;
    drawWidth  = drawHeight * aspectRatio;
  }

  // centrování v tom bílém obdélníku
  const offsetX = (width  - drawWidth)  / 2;
  const offsetY = (height - drawHeight) / 2;

  drawZahon(ctx, offsetX, offsetY, drawWidth, drawHeight);
}

function drawZahon(ctx, x, y, w, h) {
  const img = new Image();
  img.src = "img/soil.jpg";

  img.onload = function () {
    ctx.drawImage(img, x, y, w, h);   // přesně do spočítaného „záhon“ obdélníku [web:134][web:142]
  };
}

function changeTypAkce(typ) {
  window.typAkce = typ;

  const btnSeti       = document.getElementById("btnSeti");
  const btnSklizen    = document.getElementById("btnSklizen");
  const vynosRow      = document.getElementById("vynosRow");
  const vynosInput    = document.getElementById("udalostVynos");

  if (btnSeti && btnSklizen) {
    btnSeti.classList.toggle("active",   typ === "seti");
    btnSklizen.classList.toggle("active", typ === "sklizen");
  }

  if (typ === "seti") {
    if (vynosRow)   vynosRow.style.display = "none";
    if (vynosInput) {
      vynosInput.disabled = true;
      vynosInput.value = "";
    }
  } else if (typ === "sklizen") {
    if (vynosRow)   vynosRow.style.display = "flex";
    if (vynosInput) vynosInput.disabled = false;
  }
}






// FUNKCE PRO PREFILL SKLIZEN PLODINY Z CACHE
function prefillSklizenPlodinaFromCache() {
  if (!aktualniZahon) return;
  const plodinaSelect = document.getElementById("plodinaSelect");
  if (!plodinaSelect) return;

  // 🚫 1️⃣ Pokud je aktivní režim úprav, nezasahuj do selectu
  if (window.editMode) return;

  // ✅ 2️⃣ Jinak nabídni poslední zasetou plodinu
  const plodina = modalDataCache.posledniSetaPlodina;
  if (plodina) {
    plodinaSelect.innerHTML = `<option value="${plodina}">${plodina}</option>`;
  } else {
    plodinaSelect.innerHTML = '<option value="">není zaseto…</option>';
  }
}




function naplnPlodinySelect() {
  const sel = document.getElementById("plodinaSelect");
  const arr = modalDataCache.plodiny || [];
  if (!sel) return;
  sel.innerHTML = `<option value="">– vyber plodinu –</option>`;
  arr.forEach(p => {
    const o = document.createElement("option");
    o.value = p.nazev; 
    o.textContent = p.nazev;
    sel.appendChild(o);
  });
}


function czDateStringToDate(str) {
  if (!str) return new Date("1970-01-01");
  const s = String(str).trim();

  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  }

  if (s.includes(".")) {
    const [d, m, y] = s.split(".");
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  }

  return new Date(s);
}



// ASYNCHRONNÍ FUNKCE PRO NAČTENÍ DAT DO CACHE MODALU
async function preloadModalData(zahon) {
  // Očisti starou cache hned na začátku, aby nemohla zůstat přenesená z předchozího záhonu
  modalDataCache = {
    hnojeniHistory: [],
    setiSklizenHistory: [],
    plodiny: [],
    posledniSetaPlodina: null
  };

  // Ověření vstupu
  if (!zahon || !zahon.ZahonID) {
    console.warn("preloadModalData: Chybí platný záhon nebo ZahonID", zahon);
    return;
  }

  try {
    const zahonID = zahon.ZahonID;

    // Spusť dotazy paralelně
    const [udalostiArr, plodinyArr] = await Promise.all([
      fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${zahonID}`).then(r => r.json()),
      fetch(`${SERVER_URL}?action=getPlodiny`).then(r => r.json())
    ]);

    // Filtrování jednotlivých typů událostí
    const hnojArr = udalostiArr.filter(u => (u.Typ || "").toLowerCase() === "hnojení");
    const setiSklArr = udalostiArr.filter(u => u.Typ === "Setí" || u.Typ === "Sklizeň");

    modalDataCache.hnojeniHistory = hnojArr;
    modalDataCache.setiSklizenHistory = setiSklArr;
    modalDataCache.plodiny = plodinyArr;

    // Logika pro určení posledního neukončeného setí (přizpůsobeno původnímu prefillSklizenPlodina)
    const seti = udalostiArr.filter(u => (u.Typ || "").toLowerCase() === "setí");
    const sklizne = udalostiArr.filter(u => (u.Typ || "").toLowerCase() === "sklizeň");

    let posledniZaseta = null;
    for (let i = seti.length - 1; i >= 0; i--) {
      const datumSeti = czDateStringToDate(seti[i].Datum);
      const bylaSklizena = sklizne.some(sk => czDateStringToDate(sk.Datum) > datumSeti);
      if (!bylaSklizena) {
        posledniZaseta = seti[i];
        break;
      }
    }

    modalDataCache.posledniSetaPlodina = posledniZaseta ? posledniZaseta.Plodina : null;

    // Log pro kontrolu
    console.log("preloadModalData: Načteno pro záhon", zahonID, modalDataCache);
  } catch (e) {
    // V případě chyby je cache vyprazdněna a nahlášena
    modalDataCache = {
      hnojeniHistory: [],
      setiSklizenHistory: [],
      plodiny: [],
      posledniSetaPlodina: null
    };
    console.error("Chyba při preloadu modal dat:", e);
  }
}

function formatDate(d) {
  if (!d) return "";
  let s = String(d).trim();

  // Ořízni čas – vše za mezerou nebo T zahodit
  if (s.includes(" ")) {
    s = s.split(" ")[0];
  }
  if (s.includes("T")) {
    s = s.split("T")[0];
  }

  // ISO YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, day] = isoMatch;
    return `${day}.${m}.${y}`;  // 10.11.2025
  }

  // CZ DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    return s;
  }

  // fallback – nic neparsuj, jen vrať
  return s;
}

// AI zahradník
function toggleAiChat() {
  const panel = document.getElementById("aiAvatarChat");
  if (!panel) return;
  panel.classList.toggle("hidden");
}

function appendAiMessage(text, from = "bot") {
  const box = document.getElementById("aiChatMessages");
  if (!box) return;

  const div = document.createElement("div");
  div.className = "ai-msg " + (from === "user" ? "ai-msg-user" : "ai-msg-bot");

  const span = document.createElement("span");
  span.textContent = text;
  div.appendChild(span);

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

async function sendAiMessage() {
  const input = document.getElementById("aiChatInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  appendAiMessage(text, "user");
  input.value = "";

  try {
    const params = new URLSearchParams({
      action: "aiAvatarChat",
      message: text,
      screen: window.currentScreen || "",
      zahonId: window.currentZahonId || ""
    });

    const res  = await fetch(`${SERVER_URL}?${params.toString()}`);
    const textResp = await res.text();
    console.log("AI raw:", textResp);

    let data;
    try {
      data = JSON.parse(textResp);
    } catch (e) {
      appendAiMessage("Proxy nevrátila JSON, ale HTML nebo chybu.", "bot");
      return;
    }

    appendAiMessage(data.reply || "Server mi teď neodpověděl.", "bot");
  } catch (err) {
    console.error(err);
    appendAiMessage("Nemohu se spojit se serverem.", "bot");
  }
}









