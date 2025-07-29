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
      .catch(e=>{ console.error(e); tp.textContent="–"; });
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
  console.log("login voláno");
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

// Při načtení stránky se podíváme, jestli už jsme přihlášeni
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

      // ✅ checkbox
      const td1 = document.createElement("td");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = z.ZahonID;
      td1.append(cb);

      // ✅ odkaz na záhon
      const td2 = document.createElement("td");
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = z.NazevZahonu;
     a.addEventListener("click", e => {
  e.preventDefault();
  otevriModal(z);
});
      td2.append(a);

      // ✅ plocha
      const td3 = document.createElement("td");
      const plo = z.Velikost_m2 != null
        ? z.Velikost_m2
        : ((z.Delka || 0) * (z.Sirka || 0)).toFixed(2);
      td3.textContent = `${plo} m²`;

      row.append(td1, td2, td3);
      tb.append(row);
    });
  } catch (err) {
    console.error("Chyba při načítání záhonů:", err);
  }
}

// — Mazání vybraných záhonů —
function deleteSelected() {
  const checks = document.querySelectorAll("#zahonyTable tbody input:checked");

  if (!checks.length) {
    alert("Neoznačili jste žádný záhon.");
    return;
  }

  showActionIndicator();

  const promises = Array.from(checks).map(cb => {
    const ps = new URLSearchParams();
    ps.append("action", "deleteZahon");
    ps.append("ZahonID", cb.value);

    return fetch(SERVER_URL, {
      method: "POST",
      body: ps
    }).then(res => res.text());
  });

  Promise.all(promises)
    .then(() => loadZahony())
    .finally(() => hideActionIndicator());
}
// — Pridání záhonů —
async function addZahon(){
  console.log("▶ addZahon voláno");

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
    const res = await fetch(SERVER_URL, {
      method: "POST",
      body: ps
    });

    const data = await res.json();

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
//-vykresleni zahonu v modal- 
function nakresliZahonCanvas(delka, sirka) {
  const viz = document.getElementById("zahonVizualizace");
  viz.innerHTML = "";

  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 200;
  canvas.style.border = "1px solid black";
  canvas.style.cursor = "pointer";
  canvas.addEventListener("click", () => openZoomModal(delka, sirka));
  viz.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 📐 Prohození pro zobrazení NA VÝŠKU
  if (delka > sirka) {
    [delka, sirka] = [sirka, delka];
  }

  const padding = 20;
  const scale = Math.min(
    (canvas.width - padding * 2) / delka,
    (canvas.height - padding * 2) / sirka
  );

  const w = delka * scale;
  const h = sirka * scale;

  ctx.fillStyle = "#a0522d";
  ctx.fillRect((canvas.width - w) / 2, (canvas.height - h) / 2, w, h);

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect((canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
}
  
  
// — Otevření modalu záhonu —
function otevriModal(z) {
  console.log("✅ otevriModal voláno pro záhon:", z);

  aktualniZahon = z;
  setActiveIcon(null);

  // Vyplnit form
  const nazevInput = document.getElementById("editNazev");
  const delkaInput = document.getElementById("editDelka");
  const sirkaInput = document.getElementById("editSirka");
  const modal = document.getElementById("modal");

  if (!nazevInput || !delkaInput || !sirkaInput || !modal) {
    console.error("❌ Některý z prvků modalu nebyl nalezen!");
    return;
  }

  nazevInput.value = z.NazevZahonu;
  delkaInput.value = z.Delka || 0;
  sirkaInput.value = z.Sirka || 0;

  updatePlocha();
  const canvas = document.getElementById("zahonCanvas");
if (canvas) {
  resizeAndDrawCanvas(canvas, z.Delka, z.Sirka); // ✅ správně
} else {
  console.error("❌ Canvas nebyl nalezen!");
}
  // Zobrazit výchozí view
  document.getElementById("modalViewDefault").style.display = "block";
  document.getElementById("modalViewUdalost").style.display = "none";

  modal.style.display = "flex";

  console.log("✅ Modal zobrazen. Display:", modal.style.display);
}
// - Zavření modalu-
function closeModal(){
  aktualniZahon=null;
  document.getElementById("modal").style.display="none";
}

// — Úprava záhonu —
function updatePlocha(){
  const d=parseFloat(document.getElementById("editDelka").value)||0,
        s=parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent = `${(d * s).toFixed(2)} m²`;
}
// - uložení záhonu- 
function saveZahon(){
  const n=document.getElementById("editNazev").value.trim(),
        d=parseFloat(document.getElementById("editDelka").value)||0,
        s=parseFloat(document.getElementById("editSirka").value)||0;
  if(!n||d<=0||s<=0){
    alert("Vyplňte správně název, délku a šířku.");return;
  }
  showActionIndicator();
  const ps=new URLSearchParams();
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
    .catch(e=>{
      console.error(e);
      alert("Chyba při ukládání záhonu.");
    })
    .finally(()=>hideActionIndicator());
}

// — Načtení plodin z backend - 
function loadPlodiny(){
  fetch(`${SERVER_URL}?action=getPlodiny`)
    .then(r=>r.json())
    .then(arr=>{
      const sel=document.getElementById("plodinaSelect");
      if(!sel) return;
      sel.innerHTML=`<option value="">– vyber plodinu –</option>`;
      arr.forEach(p=>{
        const o=document.createElement("option");
        o.value=p.nazev; o.textContent=p.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>console.error("Chyba plodin:",e));
}
// - načtení hnojiv z backend-
function loadHnojiva(){
  fetch(`${SERVER_URL}?action=getHnojiva`)
    .then(r=>r.json())
    .then(arr=>{
      const sel=document.getElementById("hnojivoSelect");
      if(!sel) return;
      sel.innerHTML=`<option value="">– vyber hnojivo –</option>`;
      arr.forEach(h=>{
        const o=document.createElement("option");
        o.value=h.nazev; o.textContent=h.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>console.error("Chyba hnojiv:",e));
}

// — Přepínání formulářů v modalu —
function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";
  const c = document.getElementById("udalostFormContainer");
  c.innerHTML = "";

  let html = `
    <h4>${typ.charAt(0).toUpperCase() + typ.slice(1)}</h4>
    <label>Datum:
      <input type="date" id="udalostDatum"/>
    </label><br>
  `;

  if (typ === "seti") {
    html += `
      <label>Plodina:
        <select id="plodinaSelect">
          <option>Načítám…</option>
        </select>
      </label><br>
    `;
    loadPlodiny();
  }
  if (typ === "hnojeni") {
    html += `
      <label>Hnojivo:
        <select id="hnojivoSelect"><option>Načítám…</option></select>
      </label><br>
      <label>Množství (kg):
        <input type="number" id="udalostMnozstvi"/>
      </label><br>
    `;
    loadHnojiva();
  }
  if (typ === "sklizen") {
    html += `
      <label>Plodina:
        <input type="text" id="udalostPlodina"/>
      </label><br>
      <label>Výnos (kg):
        <input type="number" id="udalostVynos"/>
      </label><br>
    `;
  }

  // Tlačítka - vždy hned za formulářem!
  html += `
    <div class="modal-btns">
      <img src="img/Safe.png"   alt="Uložit" class="modal-btn" onclick="ulozUdalost('${typ}')"/>
      <img src="img/Goback .png" alt="Zpět"  class="modal-btn" onclick="zpetNaDetailZahonu()"/>
    </div>
  `;

  // Historie pouze pro hnojení
  if (typ === "hnojeni") {
    html += `
      <div id="udalostHistory" class="hnojeni-history">
        <em>Načítám historii...</em>
      </div>
    `;
  }

  c.innerHTML = html;
if (typ === "sklizen") {
  prefillSklizenPlodina();
}
  // Historii načíst pouze pro hnojení
  if (typ === "hnojeni") {
   loadHnojeniHistory();
  }
}
// — Načtení historie hnojení —
function loadHnojeniHistory() {
  const cont = document.getElementById("udalostHistory");
  if (!cont) return;
  if (!aktualniZahon) {
    cont.innerHTML = "<p>Žádný záhon.</p>";
    return;
  }

  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`)
    .then(r => r.json())
    .then(arr => {
      const hist = arr.filter(u => u.Typ === "Hnojení");
      if (!hist.length) {
        cont.innerHTML = "<p>Žádná historie hnojení.</p>";
        return;
      }
      let html = `<table>
        <thead>
          <tr>
            <th>Datum</th>
            <th>Hnojivo</th>
            <th>Množství (kg)</th>
            <th>N (g/m²)</th>
            <th>P (g/m²)</th>
            <th>K (g/m²)</th>
          </tr>
        </thead>
        <tbody>`;
      hist.forEach(u => {
        html += `<tr>
          <td class="datum">${formatDate(u.Datum)}</td>
          <td class="hnojivo">${u.Hnojivo || ""}</td>
          <td>${fmt(u.Mnozstvi)}</td>
          <td>${fmt(u.N_g_m2)}</td>
          <td>${fmt(u.P_g_m2)}</td>
          <td>${fmt(u.K_g_m2)}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
      cont.innerHTML = html;
    })
    .catch(err => {
      console.error("Chyba historie:", err);
      cont.innerHTML = "<p>Chyba při načítání historie.</p>";
    });
}
// Pomocná funkce na formátování data
function formatDate(d) {
  if (!d) return "";
  const dateObj = new Date(d);
  if (isNaN(dateObj)) return d;
  const day = ("0" + dateObj.getDate()).slice(-2);
  const mon = ("0" + (dateObj.getMonth() + 1)).slice(-2);
  const yr  = dateObj.getFullYear();
  return `${day}.${mon}.${yr}`;
}
//- blok modal pro analýzu zahonu- 
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
    <img src="img/Safe.png"    alt="Uložit analýzu" class="modal-btn" onclick="saveAnalysis()"/>
    <img src="img/Goback .png" alt="Zpět" class="modal-btn" onclick="zpetNaDetailZahonu()"/>
  `;
}
// - ulozeni analýzy (zatim se nikam neuklada ale vyřešime) - 
function saveAnalysis(){
  alert("Analýza uložena");
  zpetNaDetailZahonu();
}
// - funkce pro opetovny navrat k zakladnimu zobrazeni zahonu - 
function zpetNaDetailZahonu(){
  const uv=document.getElementById("modalViewUdalost");
  uv.style.display="none";
  uv.classList.remove("analysis");
  document.getElementById("modalViewDefault").style.display="block";
  setActiveIcon(null);
}

// — Boční ikony —
function setActiveIcon(active){
  ["mereni","seti","hnojeni","sklizen","analyza","nastaveni"]
    .forEach(t=>{
      const e=document.getElementById("icon-"+t);
      if(e) e.classList.toggle("active", t===active);
    });
}
// - řízení přepínaní mezi režimy v modal - 
function onIconClick(typ){
  setActiveIcon(typ);
  document.getElementById("modalViewDefault").style.display="none";
  document.getElementById("modalViewUdalost").style.display="none";
  if(["seti","hnojeni","sklizen"].includes(typ)) showUdalostForm(typ);
  else if(typ==="mereni") document.getElementById("modalViewDefault").style.display="block";
  else if(typ==="analyza") showAnalysisForm();
  // nastaveni zatím nic
}

// - ulozeni udalosti - 
async function ulozUdalost(typ) {
  // 1) základní hodnoty
  const zahonID = aktualniZahon?.ZahonID;
  const datum   = document.getElementById("udalostDatum").value;
  if (!zahonID || !datum) {
    return alert("Záhon a datum jsou povinné.");
  }

  // 2) připravíme parametry
  const ps = new URLSearchParams();
  ps.append("action", "addUdalost");
  ps.append("zahonID", zahonID);
  ps.append("typ", typ.charAt(0).toUpperCase() + typ.slice(1));
  ps.append("datum", datum);

  // 3) plodina (setí a sklizeň)
  if (typ === "seti") {
    const pl = document.getElementById("plodinaSelect").value;
    ps.append("plodina", pl);
    ps.append("hnojivo", "");
    ps.append("mnozstvi", "");
    ps.append("vynos", "");
  } else if (typ === "sklizen") {
    const plodina = document.getElementById("udalostPlodina").value.trim();
    if (!plodina) {
      alert("Vyplňte plodinu, kterou sklízíte.");
      return;
    }
    let vynos = document.getElementById("udalostVynos").value.replace(",", ".");
    vynos = vynos === "" ? "" : parseFloat(vynos);
    if (vynos === "") vynos = "";
    else if (isNaN(vynos)) vynos = 0;
    ps.append("plodina", plodina);
    ps.append("hnojivo", "");
    ps.append("mnozstvi", "");
    ps.append("vynos", vynos);
  } else if (typ === "hnojeni") {
    const hnoj = document.getElementById("hnojivoSelect").value;
    let mnoz = document.getElementById("udalostMnozstvi").value.replace(",", ".");
    mnoz = mnoz === "" ? "" : parseFloat(mnoz);
    if (mnoz === "") mnoz = "";
    else if (isNaN(mnoz)) mnoz = 0;
    ps.append("plodina", "");
    ps.append("hnojivo", hnoj);
    ps.append("mnozstvi", mnoz);
    ps.append("vynos", "");
  } else {
    ps.append("plodina", "");
    ps.append("hnojivo", "");
    ps.append("mnozstvi", "");
    ps.append("vynos", "");
  }

  // 6) poznámku teď ignorujeme
  ps.append("poznamka", "");

  // 7) odešleme na server
  try {
    showActionIndicator?.();
    const res  = await fetch(SERVER_URL, { method: "POST", body: ps });
    const text = await res.text();
    if (text.trim() === "OK") {
      if (typ === "hnojeni") {
        loadHnojeniHistory();
      }
      zpetNaDetailZahonu();
    } else {
      alert("Chyba při ukládání události: " + text);
    }
  } catch (e) {
    console.error("ulozUdalost error:", e);
    alert("Chyba při odesílání události.");
  } finally {
    hideActionIndicator?.();
  }
}

// - format cisel- 
function fmt(x) {
  if (x === undefined || x === null || x === "") return "";
  // Pokud je x číslo nebo řetězec reprezentující číslo, zobraz ho na 1 desetinné místo
  if (typeof x === "number" || !isNaN(Number(x))) {
    return Number(x).toFixed(1);
  }
  // Pokud je x jiný řetězec, zobraz ho tak, jak je
  return x;
}
// — Předvyplnění názvu plodiny při přidávání sklizně —
// Pokud záhon obsahuje záznam o posledním "Setí", který ještě nebyl sklizen,
// plodina z tohoto setí se automaticky doplní do pole "Plodina" ve formuláři sklizně.
// Pokud už sklizeň po posledním setí existuje, pole zůstane prázdné.
async function prefillSklizenPlodina() {
  if (!aktualniZahon) return;
  showActionIndicator?.();
  try {
    const res = await fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`);
    const arr = await res.json();

    // Najdi poslední setí (nejnovější)
    const seti = arr.filter(u => u.Typ === "Setí");
    if (!seti.length) {
      document.getElementById("udalostPlodina").value = "";
      document.getElementById("udalostPlodina").placeholder = "není zaseto...";
      return;
    }
    const posledniSeti = seti.reduce((a, b) =>
      new Date(a.Datum) > new Date(b.Datum) ? a : b
    );

    // Je po tomto setí už nějaká sklizeň?
    const sklizne = arr.filter(u => u.Typ === "Sklizeň");
    const sklizenPoSeti = sklizne.find(sk =>
      new Date(sk.Datum) > new Date(posledniSeti.Datum)
    );

    if (!sklizenPoSeti) {
      // Není sklizeno – předvyplň plodinu
      document.getElementById("udalostPlodina").value = posledniSeti.Plodina || "";
      document.getElementById("udalostPlodina").placeholder = "";
    } else {
      // Už sklizeno – pole prázdné, zobraz placeholder
      document.getElementById("udalostPlodina").value = "";
      document.getElementById("udalostPlodina").placeholder = "není zaseto...";
    }
  } catch (e) {
    document.getElementById("udalostPlodina").placeholder = "Chyba načítání";
    console.error("Prefill Sklizen Plodina error:", e);
  } finally {
    hideActionIndicator?.();
  }
}

// - otevřeni zoommodalu - 
function openZoomModal(z) {
  const canvas = document.getElementById("zoomCanvas");
  if (!canvas || !z) return;

  // Otevřít modal
  document.getElementById("zoomModal").style.display = "flex";

  // Vykreslit zvětšený záhon – PŘESNĚ TADY voláš funkci:
  resizeAndDrawCanvas(canvas, z.Delka || 0, z.Sirka || 0);
}
// - zavreni zoommodalu - 
function closeZoomModal() {
  document.getElementById("zoomModal").style.display = "none";
}
//- vykresleni zoommodal - 
function drawZoomCanvas(delka, sirka) {
  const canvas = document.getElementById("zoomCanvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 600;
  canvas.height = 400;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 📐 Prohození pro zobrazení NA VÝŠKU
  if (delka > sirka) {
    [delka, sirka] = [sirka, delka];
  }

  const padding = 40;
  const scale = Math.min(
    (canvas.width - padding * 2) / delka,
    (canvas.height - padding * 2) / sirka
  );

  const w = delka * scale;
  const h = sirka * scale;

  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;

  ctx.fillStyle = "#deb887";
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);

  // volitelně: dopsání rozměrů
  ctx.fillStyle = "#000";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Délka: ${delka} m`, x, y - 10);
  ctx.fillText(`Šířka: ${sirka} m`, x, y + h + 20);
}
//- funkce pro zobrazeni a zmenu velikosti canvas- 
function resizeAndDrawCanvas(canvas, delka, sirka) {
  if (!canvas) {
    console.error("Canvas nenalezen.");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Nelze získat 2D kontext canvasu.");
    return;
  }

  // Získání velikosti rodiče
  const parent = canvas.parentElement;
  const parentWidth = parent.clientWidth;
  const parentHeight = parent.clientHeight;

  // Výpočet poměru stran
  const ratio = delka / sirka;
  const padding = 10;

  // Výpočet velikosti canvasu v pixelech
  let drawWidth = parentWidth - padding * 2;
  let drawHeight = drawWidth / ratio;

  if (drawHeight > parentHeight - padding * 2) {
    drawHeight = parentHeight - padding * 2;
    drawWidth = drawHeight * ratio;
  }

  canvas.width = drawWidth;
  canvas.height = drawHeight;

  // Vymazání a vykreslení obdélníku
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#d4a373"; // světle hnědá barva záhonu
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

