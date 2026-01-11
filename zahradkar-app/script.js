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
function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";
  const c = document.getElementById("udalostFormContainer");

  if (typ === "hnojeni") {
    c.innerHTML = `
      <h4>Hnojení</h4>
      <label>Datum: <input type="date" id="hnojeniDatum"/></label><br>
      <label>Hnojivo: <select id="hnojivoSelect"><option>Načítám…</option></select></label><br>
      <label>Množství (kg): <input type="number" id="hnojeniMnozstvi"/></label><br>
      <div class="modal-btns">
        <img src="img/Safe.png" alt="Uložit" class="modal-btn" onclick="ulozHnojeni()"/>
        <img src="img/Goback .png" alt="Zpět" class="modal-btn" onclick="zpetNaDetailZahonu()"/>
      </div>
      <div id="hnojeniHistory" class="hnojeni-history">
        <em>Načítám historii...</em>
      </div>
    `;
   if (!window.editMode) {
    loadHnojiva();
  }
  zobrazHnojeniHistory();
  } else {
    // ✅ OPRAVENÁ VERZE PRO SETÍ/SKLIZEŇ
    c.innerHTML = `
      <h4>Setí a sklizeň</h4>
      <div class="typAkceBtns">
        <button type="button" id="btnSeti" class="typ-akce-btn active" onclick="changeTypAkce('seti')">Setí</button>
        <button type="button" id="btnSklizen" class="typ-akce-btn" onclick="changeTypAkce('sklizen')">Sklizeň</button>
      </div>
      <label>Datum: <input type="date" id="udalostDatum"/></label><br>
      <label>Plodina: 
        <select id="plodinaSelect"><option>Načítám…</option></select>
       
      </label><br>
      
      <label id="vynosLabel" style="display:none;">Výnos (kg): <input type="number" id="udalostVynos"/></label><br>
      <div class="modal-btns">
        <img src="img/Safe.png" alt="Uložit" class="modal-btn" onclick="ulozUdalost()"/>
        <img src="img/Goback .png" alt="Zpět" class="modal-btn" onclick="zpetNaDetailZahonu()"/>
      </div>
      <div id="udalostHistory" class="hnojeni-history">
        <em>Načítám historii...</em>
      </div>
    `;
    zobrazSetiSklizenHistory();
    window.typAkce = "seti";
    changeTypAkce("seti");
  }
}


function zpetNaDetailZahonu(){
  const uv = document.getElementById("modalViewUdalost");
  uv.style.display = "none";
  uv.classList.remove("analysis");
  document.getElementById("modalViewDefault").style.display = "block";
  setActiveIcon(null);
}


async function ulozUdalost() {
  const typ = window.typAkce;
  const zahonID = aktualniZahon?.ZahonID;
  const datum   = document.getElementById("udalostDatum").value;
  const plodina = document.getElementById("plodinaSelect").value.trim();
  let vynos = document.getElementById("udalostVynos").value.replace(",", ".");
  vynos = vynos === "" ? "" : parseFloat(vynos);

  if (!zahonID || !datum || !plodina) {
    alert("Záhon, datum a plodina jsou povinné.");
    return;
  }

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

    // ✅ Zkus parsovat jako JSON, pokud ne, kontroluj "OK"
    let success = false;
    try {
      const data = JSON.parse(text);
      success = data.success === true;
    } catch {
      // Není JSON → předpokládej že "OK" = úspěch
      success = text.trim() === "OK";
    }

    if (success) {
      // ✅ Úspěch - ale nezobrazuj alert, dokud není historie načtena
      window.editMode = false; 
      window.editUdalostID = null;

      await preloadModalData(aktualniZahon);
      zobrazSetiSklizenHistory?.();
      zobrazHnojeniHistory?.();
      zpetNaDetailZahonu?.();
      
      // ✅ Alert až po úspěšném načtení
      alert(window.editMode ? "Událost byla upravena." : "Událost byla přidána.");
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
  const datum = document.getElementById("hnojeniDatum").value;
  const hnojivo = document.getElementById("hnojivoSelect").value;
  const mnozstvi = document.getElementById("hnojeniMnozstvi").value;

  if (!zahonID || !datum || !hnojivo || !mnozstvi) {
    alert("Vyplňte všechny povinné údaje.");
    return;
  }

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
    let datumText;
    try {
      datumText = formatDate(u.Datum);
    } catch (e) {
      console.error("Chyba při formátování datumu hnojení:", u.Datum, e);
      datumText = u.Datum || "";
    }

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
  console.log("[zobrazSetiSklizenHistory] Render s cache:", data);
  if (!data.length) {
    cont.innerHTML = "<p>Žádná historie setí nebo sklizně.</p>";
    return;
  }

  let html = `<table>
    <thead><tr><th>Datum</th><th>Typ</th><th>Plodina</th><th>Výnos (kg)</th><th></th></tr></thead>
    <tbody>`;

  data.slice().reverse().slice(0, 6).forEach(u => {
    let datumText;
    try {
      datumText = formatDate(u.Datum);
    } catch (e) {
      console.error("Chyba při formátování datumu setí/sklizně:", u.Datum, e);
      datumText = u.Datum || "";
    }

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

  const datumInput    = document.getElementById("hnojeniDatum");
  const hnojivoSelect = document.getElementById("hnojivoSelect");
  const mnozstviInput = document.getElementById("hnojeniMnozstvi");

  if (datumInput && udalost.Datum) {
    datumInput.value = udalost.Datum.split("T")[0];
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
  if (datumInput && udalost.Datum) {
    datumInput.value = udalost.Datum.split("T")[0];
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

  // Nastav rozměr canvasu podle rodiče
  const width = parent.clientWidth;
  const height = parent.clientHeight;
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  // Poměr stran záhonu
  const aspectRatio = delka / sirka;

  // Maximální šířka/výška pro obdélník se započítáním paddingu
  const maxDrawWidth = width - padding * 2;
  const maxDrawHeight = height - padding * 2;

  // Najdi ideální velikost obdélníku
  let drawWidth = maxDrawWidth;
  let drawHeight = drawWidth / aspectRatio;

  if (drawHeight > maxDrawHeight) {
    drawHeight = maxDrawHeight;
    drawWidth = drawHeight * aspectRatio;
  }

  // Centrování
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;

  // Kresli záhon
  ctx.fillStyle = "#d4a373"; // světle hnědá
  ctx.fillRect(offsetX, offsetY, drawWidth, drawHeight);
}
function changeTypAkce(typ) {
  document.getElementById("btnSeti").classList.toggle("active", typ === "seti");
  document.getElementById("btnSklizen").classList.toggle("active", typ === "sklizen");
  window.typAkce = typ;

  const vynosInput = document.getElementById("udalostVynos");
  const vynosLabel = document.getElementById("vynosLabel");
  const plodinaSelect = document.getElementById("plodinaSelect");
  const doporuceniDiv = document.getElementById("doporuceniHnojeni");

  if (!plodinaSelect) return;

  if (typ === "seti") {
    // přepnuto na SETÍ
    naplnPlodinySelect();
    if (vynosInput) {
      vynosInput.disabled = true;
      vynosInput.value = "";           // vždy vynuluj
    }
    if (vynosLabel) vynosLabel.style.display = "none";   // box skryj
    if (doporuceniDiv) {
      doporuceniDiv.style.display = "block";             // doporučení viditelné
    }
  } else if (typ === "sklizen") {
    // přepnuto na SKLIZEŇ
    plodinaSelect.innerHTML = '<option value="">Načítám…</option>';
    prefillSklizenPlodinaFromCache();
    if (vynosInput) {
      vynosInput.disabled = false;
      // hodnotu necháme (pro editaci), jen povolíme
    }
    if (vynosLabel) vynosLabel.style.display = "inline"; // box zobraz
    if (doporuceniDiv) {
      doporuceniDiv.style.display = "none";
      doporuceniDiv.textContent = "";
    }
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
  // ISO (2025-03-28T00:00:00.000Z) = lze převést přímo
  if (str.includes("-") || str.includes("T")) {
    return new Date(str);
  }
  // CZ formát DD.MM.YYYY
  const [d, m, y] = str.split(".");
  return new Date(`${y.trim()}-${m.trim().padStart(2, "0")}-${d.trim().padStart(2, "0")}`);
}
modalDataCache = {
  hnojeniHistory: null,
  setiSklizenHistory: null,
  plodiny: null,
  posledniSetaPlodina: null
};

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

  if (typeof d === "string") {
    const s = d.trim();

    // ISO string: 2025-10-10T22:00:00.000Z nebo 2025-10-10
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, y, m, day] = isoMatch;
      return `${day}.${m}.${y}`;      // 10.10.2025
    }

    // už je to CZ formát → vrať jak je
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
      return s;
    }
  }

  // fallback pro Date objekty apod.
  const dateObj = new Date(d);
  if (isNaN(dateObj)) return d;
  const day = ("0" + dateObj.getDate()).slice(-2);
  const mon = ("0" + (dateObj.getMonth() + 1)).slice(-2);
  const yr  = dateObj.getFullYear();
  return `${day}.${mon}.${yr}`;
}




