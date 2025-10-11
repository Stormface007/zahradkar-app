// — deklarace —  
const SERVER_URL = "/.netlify/functions/proxy";

let aktualniZahon = null;

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

// — Pridání záhonů —
async function addZahon(){
  const uid = localStorage.getItem("userID");
  const n   = document.getElementById("newNazev").value.trim();
  const d   = parseFloat(document.getElementById("newDelka").value) || 0;
  const s   = parseFloat(document.getElementById("newSirka").value) || 0;
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
  try {
    const res = await fetch(SERVER_URL, { method: "POST", body: ps });
    const data = await res.json();
    if (data.success) {
      document.getElementById("newNazev").value = "";
      document.getElementById("newDelka").value = "";
      document.getElementById("newSirka").value = "";
      await loadZahony();
    } else {
      alert("Nepodařilo se přidat záhon.");
    }
  } catch {
    alert("Chyba při přidávání záhonu.");
  } finally {
    hideActionIndicator();
  }
}

function setActiveIcon(active){
  ["mereni","seti","hnojeni","analyza","nastaveni"]
    .forEach(t=>{
      const e=document.getElementById("icon-"+t);
      if(e) e.classList.toggle("active", t===active);
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



// — Otevření/zavření detailu záhonu (modal) —
function otevriModal(z) {
  document.getElementById("nazevZahonu").textContent = z.NazevZahonu || "";
  aktualniZahon = z;
  setActiveIcon(null);

  const nazevInput = document.getElementById("editNazev");
  const delkaInput = document.getElementById("editDelka");
  const sirkaInput = document.getElementById("editSirka");
  const modal = document.getElementById("modal");
  const canvas = document.getElementById("zahonCanvas");

  if (!nazevInput || !delkaInput || !sirkaInput || !modal || !canvas) return;

  nazevInput.value = z.NazevZahonu;
  delkaInput.value = z.Delka || 0;
  sirkaInput.value = z.Sirka || 0;

  updatePlocha();

  try {
    requestAnimationFrame(() => {
      const canvas = document.getElementById("zahonCanvas");
      if (canvas) {
        resizeAndDrawCanvas(canvas, aktualniZahon.Delka, aktualniZahon.Sirka);
      }
    });
  } catch {}

  document.getElementById("modalViewDefault").style.display = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  modal.style.display = "flex";
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
        <img src="img/Goback.png" alt="Zpět" class="modal-btn" onclick="zpetNaDetailZahonu()"/>
      </div>
      <div id="hnojeniHistory" class="hnojeni-history">
        <em>Načítám historii...</em>
      </div>
    `;
    loadHnojiva();
    loadHnojeniHistory();
  } else {
    c.innerHTML = `
      <h4>Setí a sklizeň</h4>
      <div class="typAkceBtns">
        <button type="button" id="btnSeti" class="typ-akce-btn active" onclick="changeTypAkce('seti')">Setí</button>
        <button type="button" id="btnSklizen" class="typ-akce-btn" onclick="changeTypAkce('sklizen')">Sklizeň</button>
      </div>
      <label>Datum: <input type="date" id="udalostDatum"/></label><br>
      <label>Plodina: <select id="plodinaSelect"><option>Načítám…</option></select></label><br>
      <label>Výnos (kg): <input type="number" id="udalostVynos"/></label><br>
      <div class="modal-btns">
        <img src="img/Safe.png" alt="Uložit" class="modal-btn" onclick="ulozUdalost()"/>
        <img src="img/Goback.png" alt="Zpět" class="modal-btn" onclick="zpetNaDetailZahonu()"/>
      </div>
      <div id="udalostHistory" class="hnojeni-history">
        <em>Načítám historii...</em>
      </div>
    `;
    loadSetiSklizenHistory();
    window.typAkce = "seti";
    changeTypAkce("seti");
  }
}

function formatDate(d) {
  if (!d) return "";
  const dateObj = new Date(d);
  if (isNaN(dateObj)) return d;
  const day = ("0" + dateObj.getDate()).slice(-2);
  const mon = ("0" + (dateObj.getMonth() + 1)).slice(-2);
  const yr  = dateObj.getFullYear();
  return `${day}.${mon}.${yr}`;
}

function loadSetiSklizenHistory() {
  const cont = document.getElementById("udalostHistory");
  if (!cont || !aktualniZahon) return;
  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`)
    .then(r => r.json())
    .then(arr => {
      const data = arr.filter(u => u.Typ === "Setí" || u.Typ === "Sklizeň");
      if (!data.length) {
        cont.innerHTML = "<p>Žádná historie setí nebo sklizně.</p>";
        return;
      }
      let html = `<table>
        <thead><tr><th>Datum</th><th>Typ</th><th>Plodina</th><th>Výnos (kg)</th></tr></thead><tbody>`;
      data.reverse().slice(0, 3).forEach(u => {
        html += `<tr>
          <td>${formatDate(u.Datum)}</td>
          <td>${u.Typ}</td>
          <td>${u.Plodina || ""}</td>
          <td>${u.Vynos_kg || ""}</td>
        </tr>`;
      });
      html += "</tbody></table>";
      cont.innerHTML = html;
    })
    .catch(e => {
      cont.innerHTML = "<p>Chyba při načítání historie.</p>";
    });
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
  const plodinaSelect = document.getElementById("plodinaSelect");
  if (!plodinaSelect) return;
  if (typ === "seti") {
    loadPlodiny();
    vynosInput.disabled = true;
  } else if (typ === "sklizen") {
    plodinaSelect.innerHTML = '<option value="">Načítám…</option>';
    prefillSklizenPlodina();
    vynosInput.disabled = false;
  }
}

async function prefillSklizenPlodina() {
  if (!aktualniZahon) return;
  const plodinaSelect = document.getElementById("plodinaSelect");
  if (!plodinaSelect) return;
  let arr = [];
  try {
    const res = await fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`);
    arr = await res.json();
  } catch (e) {
    plodinaSelect.innerHTML = '<option value="">Chyba načítání</option>';
    return;
  }

  console.log("Data z backendu:", arr, "ZahonID:", aktualniZahon.ZahonID);
  if (arr.length > 0) console.log("První datum:", arr[0].Datum, "typeof", typeof arr[0].Datum);

  const zahonID = String(aktualniZahon.ZahonID).trim();
  const seti = arr.filter(u => u.Typ === "Setí" && String(u.ZahonID).trim() === zahonID);
  const sklizne = arr.filter(u => u.Typ === "Sklizeň" && String(u.ZahonID).trim() === zahonID);

  console.log("Filtrované setí:", seti);
  console.log("Filtrované sklizně:", sklizne);

  if (!seti.length) {
    console.log("Nenalezeno žádné setí, výběr opravdu 'není zaseto…'");
    plodinaSelect.innerHTML = '<option value="">není zaseto…</option>';
    return;
  }

  let posledniZaseta = null;
  for (let i = seti.length - 1; i >= 0; i--) {
    const datumSeti = czDateStringToDate(seti[i].Datum);
    const bylaSklizena = sklizne.some(sk => czDateStringToDate(sk.Datum) > datumSeti);
    console.log(
      `Testuji setí ${seti[i].Plodina} (${seti[i].Datum}), byla sklizena?`, bylaSklizena
    );
    if (!bylaSklizena) {
      posledniZaseta = seti[i];
      break;
    }
  }
  console.log("Výsledek posledniZaseta:", posledniZaseta);

  if (posledniZaseta && posledniZaseta.Plodina) {
    plodinaSelect.innerHTML = `<option value="${posledniZaseta.Plodina}">${posledniZaseta.Plodina}</option>`;
  } else {
    plodinaSelect.innerHTML = '<option value="">není zaseto…</option>';
  }
}






// — Načtení plodin z backend - 
async function loadPlodiny() {
  const sel = document.getElementById("plodinaSelect");
  let arr = [];
  try {
    const res = await fetch(`${SERVER_URL}?action=getPlodiny`);
    arr = await res.json();
  } catch {
    if (sel) sel.innerHTML = '<option value="">Chyba načítání</option>';
    return;
  }
  if (!sel) return;
  sel.innerHTML = `<option value="">– vyber plodinu –</option>`;
  arr.forEach(p => {
    const o = document.createElement("option");
    o.value = p.nazev; o.textContent = p.nazev;
    sel.appendChild(o);
  });
}

// ...POKRAČUJ DALŠÍMI FUNKCEMI, které JS skutečně využívá:
// - loadHnojiva
// - showUdalostForm
// - changeTypAkce
// - czDateStringToDate (pokud volaná jinde! jinak odstranit)
// - prefillSklizenPlodina
// - loadSetiSklizenHistory
// - formatDate
// - showAnalysisForm
// - saveAnalysis
// - zpetNaDetailZahonu
// - setActiveIcon
// - onIconClick
// - ulozUdalost
// - ulozHnojeni
// - loadHnojeniHistory
// - openZoom
// - closeZoomModal
// - drawZoomCanvas
// - resizeAndDrawCanvas

// ...atd.

