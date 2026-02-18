// — deklarace —
const SERVER_URL = "/.netlify/functions/proxy";
let bodyGeneratedFor = new Set();

let aktualniZahon = null;
// CACHE OBJEKT
let modalDataCache = {
  hnojeniHistory: null,
  setiSklizenHistory: null,
  plodiny: null,
  posledniSetaPlodina: null
};

// — Počasí dle geolokace —
// pomocná funkce – roční období pro ČR
function getSeasonForCz(date = new Date()) {
  const m = date.getMonth() + 1;
  if (m === 12 || m === 1 || m === 2) return "zima";
  if (m >= 3 && m <= 5)  return "jaro";
  if (m >= 6 && m <= 8)  return "léto";
  return "podzim";
}

// globální stav pro AI
window.currentSeason  = getSeasonForCz();
window.currentWeather = null;

// — Počasí dle geolokace —
function loadWeatherByGeolocation() {
  const ic = document.getElementById("weatherIcon");
  const tp = document.getElementById("weatherTemp");
  if (!ic || !tp) return;

  if (!navigator.geolocation) {
    tp.textContent = "–";
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lon } = pos.coords;
    fetch(`https://wttr.in/${lat},${lon}?format=j1`)
      .then(r => r.json())
      .then(d => {
        const cur = d.current_condition?.[0];
        if (!cur) {
          tp.textContent = "–";
          return;
        }

        ic.src = cur.weatherIconUrl?.[0]?.value || "";
        ic.alt = cur.weatherDesc?.[0]?.value || "";
        tp.textContent = `${cur.temp_C} °C`;

        window.currentWeather = {
          tempC: cur.temp_C,
          desc:  cur.weatherDesc?.[0]?.value || ""
        };
      })
      .catch(() => {
        tp.textContent = "–";
      });
  }, () => {
    tp.textContent = "–";
  });
}

function fillNewBedLocationFromHere() {
  if (!navigator.geolocation) {
    alert("Prohlížeč neumí zjistit polohu.");
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    document.getElementById("newLat").value = latitude.toFixed(6);
    document.getElementById("newLon").value = longitude.toFixed(6);
  }, () => {
    alert("Nepodařilo se zjistit polohu.");
  });
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
  
  showActionIndicator();
  
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
  } finally {
    hideActionIndicator();
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

  document.body.addEventListener("change", function(e) {
    if (e.target && e.target.id === "plodinaSelect") {
      zobrazDoporuceniHnojeni?.();
    }
  });
});

// — Načtení seznamu záhonů —
async function loadZahony() {
  const uid = localStorage.getItem("userID");
  if (!uid) return;
  
  showActionIndicator();
  
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
  } catch {
  } finally {
    hideActionIndicator();
  }
}

// — Mazání vybraných záhonů —
function deleteSelected() {
  const checks = document.querySelectorAll("#zahonyTable tbody input:checked");
  if (!checks.length) {
    alert("Neoznačili jste žádný záhon."); 
    return;
  }
  
  if (!confirm("Opravdu smazat vybrané záhony?")) return;
  
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

function openAddZahonModal() {
  document.getElementById("addZahonModal").style.display = "flex";
}

function closeAddZahonModal() {
  document.getElementById("addZahonModal").style.display = "none";
}

document.addEventListener("click", e => {
  if (!e.target.classList.contains("tab-btn")) return;
  const targetTab = e.target.getAttribute("data-tab");
  document.querySelectorAll("#addZahonModal .tab-btn").forEach(btn =>
    btn.classList.toggle("active", btn === e.target)
  );
  document.querySelectorAll("#addZahonModal .tab-content").forEach(div =>
    div.classList.toggle("hidden", div.id !== targetTab)
  );
});

async function addZahon(){
  const uid = localStorage.getItem("userID");
  const n   = document.getElementById("newNazev").value.trim();
  const d   = parseFloat(document.getElementById("newDelka").value) || 0;
  const s   = parseFloat(document.getElementById("newSirka").value) || 0;

  const typ = document.querySelector('input[name="typPlochy"]:checked')?.value || "zahon";

  const lokaceIdEl   = document.getElementById("newLokace");
  const lokaceTextEl = document.getElementById("newLokaceText");
  const latEl        = document.getElementById("newLat");
  const lonEl        = document.getElementById("newLon");

  const lokaceId   = lokaceIdEl   ? (lokaceIdEl.value || "") : "";
  const lokaceText = lokaceTextEl ? lokaceTextEl.value.trim() : "";
  const lat        = latEl        ? (latEl.value || "") : "";
  const lon        = lonEl        ? (lonEl.value || "") : "";

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
  ps.append("typ", typ);
  ps.append("lokaceId", lokaceId);
  ps.append("lokaceText", lokaceText);
  ps.append("lat", lat);
  ps.append("lon", lon);
  
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
      if (lokaceIdEl)   lokaceIdEl.value = "";
      if (lokaceTextEl) lokaceTextEl.value = "";
      if (latEl)        latEl.value = "";
      if (lonEl)        lonEl.value = "";
      closeAddZahonModal();
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
    showAnalysisForm?.();
  }
}

// — otevření detailu záhonu se SVG —
async function otevriModal(z) {
  const titleEl = document.getElementById("zahonDetailTitle");
  if (titleEl) {
    titleEl.textContent = z?.NazevZahonu || "";
  }

  aktualniZahon = z;
  window.currentZahonId = z?.ZahonID || "";

  if (z?.ZahonID) {
    await ensureBodyForZahon(z.ZahonID);
  }

  setActiveIcon(null);

  const nazevInput = document.getElementById("editNazev");
  const delkaInput = document.getElementById("editDelka");
  const sirkaInput = document.getElementById("editSirka");
  const modal      = document.getElementById("modal");

  if (!nazevInput || !delkaInput || !sirkaInput || !modal) return;

  nazevInput.value = z?.NazevZahonu || "";
  delkaInput.value = z?.Delka || 0;
  sirkaInput.value = z?.Sirka || 0;
  updatePlocha();

  document.getElementById("modalViewDefault").style.display  = "block";
  document.getElementById("modalViewUdalost").style.display  = "none";
  modal.classList.remove("hidden");
  modal.style.display = "flex";

  const udalostHistElem = document.getElementById("udalostHistory");
  if (udalostHistElem) udalostHistElem.innerHTML = "<p>Načítám…</p>";
  const hnojeniHistElem = document.getElementById("hnojeniHistory");
  if (hnojeniHistElem) hnojeniHistElem.innerHTML = "<p>Načítám…</p>";

  if (z?.ZahonID) {
    showActionIndicator();

    await preloadModalData(z);
    zobrazSetiSklizenHistory();
    zobrazHnojeniHistory();
    naplnPlodinySelect();

    try {
      const [zonyResponse, bodyResponse] = await Promise.all([
        fetch(`${SERVER_URL}?action=getZonyZahonu&zahonID=${z.ZahonID}`).then(r => r.json()),
        fetch(`${SERVER_URL}?action=getBodyZahonu&zahonID=${z.ZahonID}`).then(r => r.json())
      ]);

      console.log("otevriModal: zonyResponse=", zonyResponse);
      console.log("otevriModal: bodyResponse=", bodyResponse);

      renderZahonSvg(z, bodyResponse, zonyResponse);
    } catch (e) {
      console.error("Chyba při načítání zón/bodů záhonu:", e);
    } finally {
      hideActionIndicator();
    }
  }
}

async function preloadModalData(zahon) {
  if (!zahon || !zahon.ZahonID) {
    console.warn("preloadModalData: Chybí platný záhon nebo ZahonID", zahon);
    return;
  }
  try {
    const zahonID = zahon.ZahonID;

    const [udalostiArr, plodinyArr] = await Promise.all([
      fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${zahonID}`).then(r => r.json()),
      fetch(`${SERVER_URL}?action=getPlodiny`).then(r => r.json())
    ]);

    modalDataCache.hnojeniHistory =
      udalostiArr.filter(u => (u.Typ || "").toLowerCase() === "hnojení");
    modalDataCache.setiSklizenHistory =
      udalostiArr.filter(u => u.Typ === "Setí" || u.Typ === "Sklizeň");
    modalDataCache.plodiny = plodinyArr;

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

function closeModal() {
  aktualniZahon = null;
  window.currentZahonId = "";
  document.getElementById("modal").style.display = "none";
}

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
    alert("Vyplňte správně název, délku a šířku."); 
    return;
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
        closeModal(); 
        loadZahony();
      } else {
        alert("Chyba při ukládání: "+txt);
      }
    })
    .finally(()=>hideActionIndicator());
}

async function nactiBilanciBodu(bodID, rok = 2026, sezona = "sezona") {
  if (!bodID) return;

  try {
    const res = await fetch(`${SERVER_URL}?action=getDetailBodu&bodID=${encodeURIComponent(bodID)}`);
    const data = await res.json();

    console.log("nactiBilanciBodu:", data);

    const bilanceArr = Array.isArray(data.bilance) ? data.bilance : [];
    const record = bilanceArr.find(b =>
      String(b.Rok) === String(rok) && String(b.Sezona) === String(sezona)
    );

    const nEl = document.getElementById("bilanceN");
    const pEl = document.getElementById("bilanceP");
    const kEl = document.getElementById("bilanceK");
    const uEl = document.getElementById("bilanceUnava");

    if (!nEl || !pEl || !kEl || !uEl) {
      console.warn("Chybí elementy pro zobrazení bilance NPK.");
      return;
    }

    if (!record) {
      nEl.textContent = "N: 0,0 kg";
      pEl.textContent = "P: 0,0 kg";
      kEl.textContent = "K: 0,0 kg";
      uEl.textContent = "Únava index: 0";
      return;
    }

    nEl.textContent = `N: ${Number(record.N_bilance_kg || 0).toFixed(3)} kg`;
    pEl.textContent = `P: ${Number(record.P_bilance_kg || 0).toFixed(3)} kg`;
    kEl.textContent = `K: ${Number(record.K_bilance_kg || 0).toFixed(3)} kg`;
    uEl.textContent = `Únava index: ${Number(record.UnavaIndex || 0).toFixed(2)}`;
  } catch (e) {
    console.error("Chyba při načítání bilance bodu:", e);
  }
}


function todayForInput() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";

  const c = document.getElementById("udalostFormContainer");
  if (!c) return;

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
          <img src="img/Safe.png" alt="Uložit" class="modal-btn" onclick="ulozHnojeni()"/>
        </div>
      </div>

      <div id="hnojeniHistory" class="hnojeni-history">
        <em>Načítám historii...</em>
      </div>
    `;

    const datumInput = document.getElementById("hnojeniDatum");
    if (datumInput && !window.editMode) {
      datumInput.value = todayForInput();
    }

    if (!window.editMode) {
      loadHnojiva();
    }
    zobrazHnojeniHistory();
    return;
  }

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
          <img src="img/Safe.png" alt="Uložit" class="modal-btn" onclick="ulozUdalost()"/>
        </div>
      </div>

      <div id="udalostHistory" class="hnojeni-history">
        <em>Načítám historii...</em>
      </div>
    `;

    const datumInput = document.getElementById("udalostDatum");
    if (datumInput && !window.editMode) {
      datumInput.value = todayForInput();
    }

    window.typAkce = "seti";
    changeTypAkce("seti");

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

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split("-");
    return `${day}.${m}.${y}`;
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    return s;
  }

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
    showActionIndicator();

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
    hideActionIndicator();
  }
}

async function smazUdalost(id, typ) {
  if (!confirm(`Opravdu chceš smazat ${typ.toLowerCase()} (ID ${id})?`)) return;
  
  showActionIndicator();
  
  try {
    const ps = new URLSearchParams();
    ps.append("action", "deleteUdalost");
    ps.append("udalostID", id);

    const res = await fetch(SERVER_URL, { method: "POST", body: ps });
    const text = await res.text();

    if (text.trim() === "OK") {
      await preloadModalData(aktualniZahon);
      zobrazHnojeniHistory();
      zobrazSetiSklizenHistory();
    } else {
      alert("Chyba při mazáním: " + text);
    }
  } catch (e) {
    alert("Chyba při odesílání požadavku: " + e.message);
  } finally {
    hideActionIndicator();
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
    showActionIndicator();
    
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
    hideActionIndicator();
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
    const datumText = formatDate(u.Datum);
    html += `<tr>
      <td>${datumText}</td>
      <td>${u.Hnojivo || ""}</td>
      <td>${u.Mnozstvi || u.Mnozstvi_kg || ""}</td>
      <td>
        <button onclick="smazUdalost(${u.UdalostID}, 'Hnojení')">🗑️</button>
        <button onclick="otevriUpravuUdalosti(${u.UdalostID}, 'Hnojení')">✏️</button>
      </td>
    </tr>`;
  });

  html += "</tbody></table>";
  cont.innerHTML = html;
}

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
    const datumText = formatDate(u.Datum);
    html += `<tr>
      <td>${datumText}</td>
      <td>${u.Typ}</td>
      <td>${u.Plodina || ""}</td>
      <td>${u.Vynos || ""}</td>
      <td>
        <button onclick="smazUdalost(${u.UdalostID}, '${u.Typ}')">🗑️</button>
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

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    const [day, mon, yr] = s.split(".");
    return `${yr}-${mon}-${day}`;
  }

  if (s.includes(" ")) s = s.split(" ")[0];
  return s;
}

function otevriUpravuUdalosti(id, typ) {
  const vsechny = [
    ...(modalDataCache.hnojeniHistory || []),
    ...(modalDataCache.setiSklizenHistory || [])
  ];
  const udalost = vsechny.find(u => u.UdalostID === id);
  if (!udalost) return alert("Událost nenalezena!");

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
      hnojivoSelect.innerHTML =
        `<option value="${vybraneHnojivo}">${vybraneHnojivo}</option>`;

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

  window.typAkce =
    udalost.Typ.toLowerCase() === "setí" ? "seti" : "sklizen";

  showUdalostForm("plodina");

  const viewDefault = document.getElementById("modalViewDefault");
  const viewUdalost = document.getElementById("modalViewUdalost");
  if (viewDefault) viewDefault.style.display = "none";
  if (viewUdalost) viewUdalost.style.display = "block";

  const datumInput = document.getElementById("udalostDatum");
  if (datumInput) {
    datumInput.value = formatDateForInput(udalost.Datum);
  }

  const plodinaSelect = document.getElementById("plodinaSelect");
  if (plodinaSelect) {
    plodinaSelect.innerHTML =
      `<option value="${udalost.Plodina || ""}">${udalost.Plodina || ""}</option>`;
  }

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
}

function changeTypAkce(typ) {
  window.typAkce = typ;

  const btnSeti    = document.getElementById("btnSeti");
  const btnSklizen = document.getElementById("btnSklizen");
  const vynosRow   = document.getElementById("vynosRow");
  const vynosInput = document.getElementById("udalostVynos");

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

    prefillSklizenPlodinaFromCache();
  }
}

function prefillSklizenPlodinaFromCache() {
  if (!aktualniZahon) return;
  const select = document.getElementById("plodinaSelect");
  if (!select) return;
  if (window.editMode) return;

  const plodina = modalDataCache.posledniSetaPlodina;
  if (!plodina) return;

  const wanted = plodina.toLowerCase();
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].text.toLowerCase() === wanted) {
      select.selectedIndex = i;
      break;
    }
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

function formatDate(d) {
  if (!d) return "";
  let s = String(d).trim();

  if (s.includes(" ")) {
    s = s.split(" ")[0];
  }
  if (s.includes("T")) {
    s = s.split("T")[0];
  }

  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, day] = isoMatch;
    return `${day}.${m}.${y}`;
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    return s;
  }

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

  showActionIndicator();

  try {
    const params = new URLSearchParams({
      action:  "aiAvatarChat",
      message: text,
      screen:  window.currentScreen   || "",
      zahonId: window.currentZahonId  || "",
      season:  window.currentSeason   || "",
      weather: window.currentWeather
                ? JSON.stringify(window.currentWeather)
                : ""
    });

    const res = await fetch(`${SERVER_URL}?${params.toString()}`);
    if (!res.ok) {
      const errText = await res.text();
      console.error("AI HTTP error:", res.status, errText);
      appendAiMessage(
        "Server AI teď hlásí chybu (" + res.status + "). Zkus to za chvíli znova.",
        "bot"
      );
      return;
    }

    const textResp = await res.text();

    let data;
    try {
      data = JSON.parse(textResp);
    } catch {
      appendAiMessage("Proxy nevrátila čitelný JSON, ale něco jiného.", "bot");
      return;
    }

    const reply = (data && data.reply) ? data.reply : "Server mi teď neodpověděl.";
    appendAiMessage(reply, "bot");
  } catch (err) {
    console.error("AI fetch error:", err);
    appendAiMessage("Nemohu se spojit se serverem.", "bot");
  } finally {
    hideActionIndicator();
  }
}

// zajistí, že pro záhon existují body a po vygenerování si je i načte
// zajistí, že pro záhon existují body a po vygenerování si je i načte
async function ensureBodyForZahon(zahonID) {
  const key = String(zahonID);

  console.log("ensureBodyForZahon: start, ZahonID=", zahonID, "known keys:", Array.from(bodyGeneratedFor));

  if (bodyGeneratedFor.has(key)) {
    console.log("ensureBodyForZahon: už bylo řešeno pro", key);
    return;
  }

  try {
    // 1) zkusíme načíst body
    let res  = await fetch(`${SERVER_URL}?action=getBodyZahonu&zahonID=${zahonID}`);
    let json = await res.json().catch(() => null);

    console.log("ensureBodyForZahon: první getBodyZahonu JSON=", json);

    let bodyArr = [];
    if (json) {
      if (Array.isArray(json.body)) {
        bodyArr = json.body;
      } else if (Array.isArray(json)) {
        bodyArr = json;
      }
    }

    // 2) pokud žádné body nejsou, necháme backend vygenerovat body + zóny
    if (!bodyArr.length) {
      console.log("ensureBodyForZahon: body prázdné, volám generateBody + generateZonyProZahon");
      const genRes = await fetch(`${SERVER_URL}?action=generateBodyAndZony&zahonID=${zahonID}`);
      const genTxt = await genRes.text();
      console.log("ensureBodyForZahon: generateBodyAndZony response:", genTxt);

      // a znovu načteme body
      res  = await fetch(`${SERVER_URL}?action=getBodyZahonu&zahonID=${zahonID}`);
      json = await res.json().catch(() => null);
      console.log("ensureBodyForZahon: druhý getBodyZahonu JSON=", json);

      if (json) {
        if (Array.isArray(json.body)) {
          bodyArr = json.body;
        } else if (Array.isArray(json)) {
          bodyArr = json;
        }
      }
    }

    console.log("ensureBodyForZahon: finální bodyArr.length=", bodyArr.length);
    bodyGeneratedFor.add(key);
  } catch (e) {
    console.error("Chyba v ensureBodyForZahon:", e);
  }
}

// script.js – vykreslení záhonu do SVG + klik na body se zobrazením detailu bodu
async function renderZahonSvg(zahon, bodyZahonu, zonyZahonu) {
  console.log("renderZahonSvg: zahon=", zahon);
  console.log("renderZahonSvg: raw bodyZahonu=", bodyZahonu);
  console.log("renderZahonSvg: raw zonyZahonu=", zonyZahonu);

  const svgContainer = document.getElementById("svg-container");
  const bodDetail    = document.getElementById("bod-detail");
  if (!svgContainer) {
    console.warn("renderZahonSvg: chybí #svg-container");
    return;
  }

  svgContainer.innerHTML = "";

  const width  = 600;
  const height = 300;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", "0 0 100 50");
  svg.style.border = "1px solid #ccc";
  svgContainer.appendChild(svg);

  const rect = document.createElementNS(svgNS, "rect");
  rect.setAttribute("x", 0);
  rect.setAttribute("y", 0);
  rect.setAttribute("width", 100);
  rect.setAttribute("height", 50);
  rect.setAttribute("fill", "#fdfcf5");
  rect.setAttribute("stroke", "#888");
  svg.appendChild(rect);

  // Zóny – jen vizuálně (pokud je máš)
  if (zonyZahonu && Array.isArray(zonyZahonu.zony)) {
    zonyZahonu.zony.forEach(z => {
      const zRect = document.createElementNS(svgNS, "rect");

      const x1 = Number(z.X1rel ?? z.X1_rel) * 100;
      const y1 = Number(z.Y1rel ?? z.Y1_rel) * 50;
      const x2 = Number(z.X2rel ?? z.X2_rel) * 100;
      const y2 = Number(z.Y2rel ?? z.Y2_rel) * 50;

      const zx = Math.min(x1, x2);
      const zy = Math.min(y1, y2);
      const zw = Math.abs(x2 - x1);
      const zh = Math.abs(y2 - y1);

      zRect.setAttribute("x", zx.toString());
      zRect.setAttribute("y", zy.toString());
      zRect.setAttribute("width", zw.toString());
      zRect.setAttribute("height", zh.toString());
      zRect.setAttribute("fill", "rgba(0, 150, 0, 0.08)");
      zRect.setAttribute("stroke", "rgba(0, 150, 0, 0.4)");
      zRect.setAttribute("stroke-dasharray", "2,2");
      svg.appendChild(zRect);
    });
  }

  function getStavZonyForBod(bod) {
    return "V normě";
  }

  const bodyArr = bodyZahonu && Array.isArray(bodyZahonu.body) ? bodyZahonu.body : [];
  console.log("renderZahonSvg: bodyArr.length=", bodyArr.length, "first body=", bodyArr[0]);

  if (!bodyArr.length) {
    console.warn("renderZahonSvg: žádné body k vykreslení");
    return;
  }

  bodyArr.forEach(b => {
    const rawX = (b.Xrel !== undefined ? b.Xrel : b.X_rel);
    const rawY = (b.Yrel !== undefined ? b.Yrel : b.Y_rel);

    const xRel = Number(rawX);
    const yRel = Number(rawY);

    console.log("renderZahonSvg: bod", b.BodID, "rawX=", rawX, "rawY=", rawY);

    if (isNaN(xRel) || isNaN(yRel)) {
      console.warn("renderZahonSvg: bod má neplatné souřadnice", b);
      return;
    }

    const x = xRel * 100;
    const y = yRel * 50;

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", x.toString());
    circle.setAttribute("cy", y.toString());
    circle.setAttribute("r", "1.2");
    circle.setAttribute("fill", "#007bff");
    circle.setAttribute("stroke", "#004a99");
    circle.style.cursor = "pointer";
    svg.appendChild(circle);

    const zonaId   = b.ZonaID || "";
    const stavZony = getStavZonyForBod(b);

    circle.addEventListener("click", async () => {
      if (!bodDetail) return;

      bodDetail.innerHTML =
        `<strong>Bod:</strong> ${b.BodID}<br>` +
        `<strong>Zóna:</strong> ${zonaId || "-"}<br>` +
        `<strong>Stav zóny:</strong> ${
          stavZony === "Vyčerpaný"
            ? "Vyčerpání živin"
            : stavZony === "Přehnojený"
            ? "Přehnojení"
            : "V normě"
        }<br>` +
        `<strong>Rel. pozice:</strong> x=${xRel.toFixed(2)}, y=${yRel.toFixed(2)}<br>` +
        `<em>Načítám bilanci NPK...</em>`;

      try {
        const res = await fetch(
          `${SERVER_URL}?action=getDetailBodu&bodID=${encodeURIComponent(b.BodID)}`
        );
        const detail = await res.json();
        console.log("renderZahonSvg: detail bodu", detail);

        const bilList = Array.isArray(detail.bilance) ? detail.bilance : [];
        let bil = null;

        if (bilList.length) {
          bilList.sort((a, b) => Number(a.Rok || 0) - Number(b.Rok || 0));
          bil = bilList[bilList.length - 1];
        }

        if (!bil) {
          bodDetail.innerHTML += `<br><br><strong>Bilance:</strong> zatím není k dispozici.`;
          return;
        }

        const rok    = bil.Rok || "";
        const sezona = bil.Sezona || "";

        const N_bal = bil.N_bilance_g;
        const P_bal = bil.P_bilance_g;
        const K_bal = bil.K_bilance_g;
        const unava = bil.UnavaIndex;

        const formatKg = (v) =>
          (v === "" || v == null || isNaN(Number(v)))
            ? "-"
            : Number(v).toFixed(3).replace(".", ",");

        bodDetail.innerHTML =
          `<strong>Bod:</strong> ${b.BodID}<br>` +
          `<strong>Zóna:</strong> ${zonaId || "-"}<br>` +
          `<strong>Stav zóny:</strong> ${
            stavZony === "Vyčerpaný"
              ? "Vyčerpání živin"
              : stavZony === "Přehnojený"
              ? "Přehnojení"
              : "V normě"
          }<br>` +
          `<strong>Rel. pozice:</strong> x=${xRel.toFixed(2)}, y=${yRel.toFixed(2)}<br><br>` +
          `<strong>Bilance NPK (${rok} ${sezona}):</strong><br>` +
          `N: ${formatKg(N_bal)} g<br>` +
          `P: ${formatKg(P_bal)} g<br>` +
          `K: ${formatKg(K_bal)} g<br>` +
          `<strong>Únava index:</strong> ${
            unava === "" || unava == null || isNaN(Number(unava))
              ? "-"
              : Number(unava).toFixed(2).replace(".", ",")
          }`;
      } catch (err) {
        console.error("Chyba načítání detailu bodu:", err);
        bodDetail.innerHTML +=
          `<br><span style="color:red;">Chyba při načítání bilance NPK.</span>`;
      }
    });
  });
}

