// — konfigurace serveru —
const SERVER_URL = "/.netlify/functions/proxy";

let aktualniZahon = null;

// — helper pro převod CZ formátu nebo ISO na Date —
function parseDatum(str) {
  if (!str) return new Date("1970-01-01");
  if (str.includes(".")) {
    const [d, m, y] = str.split(".");
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  return new Date(str); // ISO fallback
}

// — přihlášení uživatele —
async function login() {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();
  try {
    const res = await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action:"login", username:u, password:p })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem("userID", data.userID);
      document.getElementById("loginDiv").style.display = "none";
      document.getElementById("appDiv").style.display = "block";
      loadZahony();
    } else {
      document.getElementById("loginMsg").innerText = "Neplatné přihlašovací údaje.";
    }
  } catch (err) {
    document.getElementById("loginMsg").innerText = "Chyba při přihlášení.";
  }
}

function logout() {
  localStorage.removeItem("userID");
  document.getElementById("appDiv").style.display = "none";
  document.getElementById("loginDiv").style.display = "block";
}

// — načtení záhonů —
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
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.value = z.ZahonID;
      row.appendChild(document.createElement("td")).append(cb);

      const a = document.createElement("a");
      a.href = "#"; a.textContent = z.NazevZahonu;
      a.onclick = e => { e.preventDefault(); otevriModal(z); };
      row.appendChild(document.createElement("td")).append(a);

      const plocha = z.Velikost_m2 != null ? z.Velikost_m2 :
        ((z.Delka || 0) * (z.Sirka || 0)).toFixed(2);
      row.appendChild(document.createElement("td")).textContent = `${plocha} m²`;
      tb.append(row);
    });
  } catch {
    // případná chyba
  }
}

// — přidání záhonu —
async function addZahon() {
  const uid = localStorage.getItem("userID");
  const n = document.getElementById("newNazev").value.trim();
  const d = parseFloat(document.getElementById("newDelka").value) || 0;
  const s = parseFloat(document.getElementById("newSirka").value) || 0;
  if (!n || d <= 0 || s <= 0) return alert("Vyplňte správně název, délku i šířku.");

  const ps = new URLSearchParams({ action:"addZahon", userID:uid, NazevZahonu:n, Delka:d, Sirka:s });
  try {
    const res = await fetch(SERVER_URL, { method:"POST", body:ps });
    const data = await res.json();
    if (data.success) {
      document.getElementById("newNazev").value = "";
      document.getElementById("newDelka").value = "";
      document.getElementById("newSirka").value = "";
      loadZahony();
    }
  } catch {}
}

// — otevření detailu záhonu do modalu —
function otevriModal(z) {
  aktualniZahon = z;
  document.getElementById("nazevZahonu").textContent = z.NazevZahonu || "";
  document.getElementById("editNazev").value = z.NazevZahonu;
  document.getElementById("editDelka").value = z.Delka || 0;
  document.getElementById("editSirka").value = z.Sirka || 0;
  updatePlocha();
  document.getElementById("modal").style.display = "flex";
  showDefaultModalView();
}

function closeModal() {
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}

function updatePlocha() {
  const d = parseFloat(document.getElementById("editDelka").value) || 0;
  const s = parseFloat(document.getElementById("editSirka").value) || 0;
  document.getElementById("vypocetPlochy").textContent = `${(d * s).toFixed(2)} m²`;
}

function saveZahon() {
  const n = document.getElementById("editNazev").value.trim();
  const d = parseFloat(document.getElementById("editDelka").value) || 0;
  const s = parseFloat(document.getElementById("editSirka").value) || 0;
  if (!n || d <= 0 || s <= 0) return alert("Vyplňte správně název, délku a šířku.");
  const ps = new URLSearchParams({
    action: "updateZahon", ZahonID: aktualniZahon.ZahonID,
    NazevZahonu: n, Delka: d, Sirka: s
  });
  fetch(SERVER_URL, { method:"POST", body:ps })
    .then(r => r.text())
    .then(txt => {
      if (txt.trim() === "OK") { closeModal(); loadZahony(); }
      else alert("Chyba při ukládání: " + txt);
    });
}

// — vymazání záhonů —
function deleteSelected() {
  const checks = document.querySelectorAll("#zahonyTable tbody input:checked");
  if (!checks.length) return alert("Neoznačili jste žádný záhon.");
  const promises = Array.from(checks).map(cb => {
    return fetch(SERVER_URL, {
      method: "POST",
      body: new URLSearchParams({ action: "deleteZahon", ZahonID: cb.value })
    }).then(res => res.text());
  });
  Promise.all(promises).then(loadZahony);
}
// — Boční ikony: aktivace, přepínání obsahu modalu —
function setActiveIcon(active) {
  ["mereni","seti","hnojeni","analyza","nastaveni"]
    .forEach(t => {
      const e = document.getElementById("icon-" + t);
      if (e) e.classList.toggle("active", t === active);
    });
}

function onIconClick(typ) {
  setActiveIcon(typ);
  document.getElementById("modalViewDefault").style.display = "none";
  document.getElementById("modalViewUdalost").style.display = "none";
  if (typ === "seti") {
    showUdalostForm("plodina");
  } else if (typ === "hnojeni") {
    showUdalostForm("hnojeni");
  } else if (typ === "mereni") {
    showDefaultModalView();
  } else if (typ === "analyza") {
    showAnalysisForm();
  }
}

// — Analýza záhonu —
function showAnalysisForm() {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.add("analysis");
  uv.style.display = "block";
  const c = document.getElementById("udalostFormContainer");
  c.innerHTML = `
    <h4>Analýza</h4>
    <label>Datum: <input type="date" id="analDatum"/></label><br>
    <div class="nutrients">
      <div class="nutrient"><label>pH:</label><input type="number" step="0.1" id="analPH"/></div>
      <div class="nutrient"><label>N:</label><input type="number" id="analN"/></div>
      <div class="nutrient"><label>P:</label><input type="number" id="analP"/></div>
      <div class="nutrient"><label>K:</label><input type="number" id="analK"/></div>
    </div>
    <div class="soil-info">
      <label>Typ půdy:<input type="text" id="soilType"/></label><br>
      <label>Barva půdy:<input type="text" id="soilColor"/></label>
    </div>
    <button onclick="zpetNaDetailZahonu()">Zpět</button>
  `;
}

// — view modalu přepínač, defaultní —
function showDefaultModalView() {
  document.getElementById("modalViewDefault").style.display = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
}

// — načtení plodin — 
async function loadPlodiny() {
  const sel = document.getElementById("plodinaSelect");
  let arr = [];
  try {
    const res = await fetch(`${SERVER_URL}?action=getPlodiny`);
    arr = await res.json();
  } catch { sel.innerHTML = `<option value="">Chyba načítání</option>`; return; }
  sel.innerHTML = `<option value="">– vyber plodinu –</option>`;
  arr.forEach(p => {
    const o = document.createElement("option");
    o.value = p.nazev; o.textContent = p.nazev;
    sel.appendChild(o);
  });
}

// — přepínač formuláře/udalosti záhonu (setí/sklizeň/hnojení/analýza) —
function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.style.display = "block";
  // Formulář podle typu události:
  const c = document.getElementById("udalostFormContainer");
  if (typ === "hnojeni") {
    c.innerHTML = `<h4>Hnojení</h4>
      <label>Datum:<input type="date" id="hnojeniDatum"/></label><br>
      <label>Hnojivo:<select id="hnojivoSelect"><option>Načítám…</option></select></label><br>
      <label>Množství (kg):<input type="number" id="hnojeniMnozstvi"/></label><br>
      <button onclick="ulozHnojeni()">Uložit</button>
      <button onclick="zpetNaDetailZahonu()">Zpět</button>`;
    loadHnojiva();
  } else {
    c.innerHTML = `<h4>Setí/Sklizeň</h4>
      <button onclick="changeTypAkce('seti')" id="btnSeti">Setí</button>
      <button onclick="changeTypAkce('sklizen')" id="btnSklizen">Sklizeň</button>
      <label>Datum:<input type="date" id="udalostDatum" /></label><br>
      <label>Plodina:<select id="plodinaSelect"><option>Načítám…</option></select></label><br>
      <label>Výnos (kg):<input type="number" id="udalostVynos" /></label><br>
      <button onclick="ulozUdalost()">Uložit</button>
      <button onclick="zpetNaDetailZahonu()">Zpět</button>`;
    window.typAkce = "seti";
    changeTypAkce("seti");
  }
}

// — přepínač typ akce setí/sklizeň (disable výnos) —
function changeTypAkce(typ) {
  window.typAkce = typ;
  const vynosInput = document.getElementById("udalostVynos");
  const plodinaSelect = document.getElementById("plodinaSelect");
  if (!plodinaSelect) return;
  if (typ === "seti") {
    loadPlodiny(); vynosInput.disabled = true;
  } else if (typ === "sklizen") {
    prefillSklizenPlodina(); vynosInput.disabled = false;
  }
}

// — načtení hnojiv —
function loadHnojiva() {
  fetch(`${SERVER_URL}?action=getHnojiva`)
    .then(r=>r.json())
    .then(arr=>{
      const sel=document.getElementById("hnojivoSelect");
      sel.innerHTML=`<option value="">– vyber hnojivo –</option>`;
      arr.forEach(h=>{
        const o=document.createElement("option");
        o.value=h.nazev; o.textContent=h.nazev;
        sel.appendChild(o);
      });
    });
}

// — předvyplnění plodiny při sklizni (poslední ne-skližené setí) —  
async function prefillSklizenPlodina() {
  if (!aktualniZahon) return;
  const plodinaSelect = document.getElementById("plodinaSelect");
  let arr = [];
  try {
    const res = await fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`);
    arr = await res.json();
  } catch { plodinaSelect.innerHTML = `<option value="">Chyba načítání</option>`; return; }
  const seti = arr.filter(u => u.Typ === "Setí" && String(u.ZahonID) === String(aktualniZahon.ZahonID));
  const sklizne = arr.filter(u => u.Typ === "Sklizeň" && String(u.ZahonID) === String(aktualniZahon.ZahonID));
  if (!seti.length) { plodinaSelect.innerHTML = `<option value="">není zaseto…</option>`; return; }
  let posledniZaseta = null;
  for (let i = seti.length - 1; i >= 0; i--) {
    const datumSeti = parseDatum(seti[i].Datum);
    const bylaSklizena = sklizne.some(sk => parseDatum(sk.Datum) > datumSeti);
    if (!bylaSklizena) { posledniZaseta = seti[i]; break; }
  }
  if (posledniZaseta && posledniZaseta.Plodina)
    plodinaSelect.innerHTML = `<option value="${posledniZaseta.Plodina}">${posledniZaseta.Plodina}</option>`;
  else
    plodinaSelect.innerHTML = `<option value="">není zaseto…</option>`;
}

// — uložení události setí/sklizeň — 
async function ulozUdalost() {
  const typ = window.typAkce;
  const zahonID = aktualniZahon?.ZahonID;
  const datum = document.getElementById("udalostDatum").value;
  const plodina = document.getElementById("plodinaSelect").value.trim();
  let vynos = document.getElementById("udalostVynos").value.replace(",", ".");
  vynos = vynos === "" ? "" : parseFloat(vynos);
  if (!zahonID || !datum || !plodina) { alert("Záhon, datum a plodina jsou povinné."); return; }
  const ps = new URLSearchParams();
  ps.append("action", "addUdalost");
  ps.append("zahonID", zahonID); ps.append("datum", datum);
  if (typ === "seti") { ps.append("typ", "Setí"); ps.append("plodina", plodina); ps.append("vynos", ""); }
  else if (typ === "sklizen") { ps.append("typ", "Sklizeň"); ps.append("plodina", plodina); ps.append("vynos", vynos); }
  ps.append("hnojivo", ""); ps.append("mnozstvi", ""); ps.append("poznamka", "");
  try {
    const res = await fetch(SERVER_URL, { method: "POST", body: ps });
    const text = await res.text();
    if (text.trim() === "OK") { zpetNaDetailZahonu(); }
    else alert("Chyba při ukládání události: " + text);
  } catch { alert("Chyba při odesílání události."); }
}

// — uložení hnojení — 
async function ulozHnojeni() {
  const zahonID = aktualniZahon?.ZahonID;
  const datum = document.getElementById("hnojeniDatum").value;
  const hnojivo = document.getElementById("hnojivoSelect").value;
  const mnozstvi = document.getElementById("hnojeniMnozstvi").value;
  if (!zahonID || !datum || !hnojivo || !mnozstvi) { alert("Vyplňte všechny povinné údaje."); return; }
  const ps = new URLSearchParams();
  ps.append("action", "addUdalost");
  ps.append("zahonID", zahonID); ps.append("datum", datum);
  ps.append("typ", "Hnojení"); ps.append("hnojivo", hnojivo); ps.append("mnozstvi", mnozstvi);
  ps.append("plodina", ""); ps.append("vynos", ""); ps.append("poznamka", "");
  try {
    const res = await fetch(SERVER_URL, { method: "POST", body: ps });
    const text = await res.text();
    if (text.trim() === "OK") { zpetNaDetailZahonu(); }
    else alert("Chyba při ukládání hnojení: " + text);
  } catch { alert("Chyba při odesílání hnojení."); }
}

// — návrat k detailu záhonu — 
function zpetNaDetailZahonu() {
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modalViewDefault").style.display = "block";
}

// — inicializace po načtení stránky —
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("userID")) {
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    loadZahony();
  }
});
