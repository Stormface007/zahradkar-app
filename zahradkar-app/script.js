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

  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();

  try {
    const res = await fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        action: "login",  // ⚠ DŮLEŽITÉ!
        username: u,
        password: p
      })
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem("userID", data.userID);
      console.log("Přihlášení úspěšné, userID:", data.userID);
      onLoginSuccess();  // volání tvojí funkce
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
document.getElementById("nazevZahonu").textContent = z.NazevZahonu || "";

  aktualniZahon = z;
  setActiveIcon(null);

  const nazevInput = document.getElementById("editNazev");
  const delkaInput = document.getElementById("editDelka");
  const sirkaInput = document.getElementById("editSirka");
  const modal = document.getElementById("modal");
  const canvas = document.getElementById("zahonCanvas");

  if (!nazevInput || !delkaInput || !sirkaInput || !modal || !canvas) {
    console.error("❌ Některý z prvků modalu nebyl nalezen!");
    return;
  }

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
  } catch (e) {
    console.error("❌ Chyba při vykreslení záhonu:", e);
  }

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
async function loadPlodiny() {
  const sel = document.getElementById("plodinaSelect");
  let arr = [];
  try {
    const res = await fetch(`${SERVER_URL}?action=getPlodiny`);
    arr = await res.json();
  } catch (e) {
    console.error("Chyba plodin:", e);
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






function czDateStringToDate(str) {
  // "20.5.2025" => Date
  if (!str) return new Date("1970-01-01");
  const [d, m, y] = str.split(".");
  return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
}

async function prefillSklizenPlodina() {
  if (!aktualniZahon) return;
  const plodinaSelect = document.getElementById("plodinaSelect");
  if (!plodinaSelect) {
    console.warn("plodinaSelect (select) nebyl nalezen!");
    return;
  }
  let arr = [];
  try {
    const res = await fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`);
    arr = await res.json();
  } catch (e) {
    console.error("Chyba načítání dat z backendu (prefillSklizenPlodina):", e);
    plodinaSelect.innerHTML = '<option value="">Chyba načítání</option>';
    return;
  }
  console.log("arr:", arr);
  console.log("aktualniZahon:", aktualniZahon);

  const seti = arr.filter(
    u => u.Typ === "Setí" && String(u.ZahonID) === String(aktualniZahon.ZahonID)
  );
  const sklizne = arr.filter(
    u => u.Typ === "Sklizeň" && String(u.ZahonID) === String(aktualniZahon.ZahonID)
  );

  console.log("Setí:", seti);
  console.log("Sklizne:", sklizne);

  if (!seti.length) {
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








// — Načtení historie setí a sklizně —
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
      console.error("Chyba historie setí/sklizně:", e);
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
  ["mereni","seti","hnojeni","analyza","nastaveni"]
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
  if (typ === "seti") {
  showUdalostForm("plodina");  // nový sjednocený formulář
} else if (typ === "hnojeni") {
  showUdalostForm("hnojeni");
} else if (typ === "mereni") {
  document.getElementById("modalViewDefault").style.display = "block";
} else if (typ === "analyza") {
  showAnalysisForm();
}
}

// - ulozeni udalosti - 
// - uložení události (sjednocený formulář setí + sklizeň) -
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
  ps.append("action", "addUdalost");
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
  // další pole: hnojivo, množství, poznámka (zatím prázdná)
  ps.append("hnojivo", "");
  ps.append("mnozstvi", "");
  ps.append("poznamka", "");

  try {
    showActionIndicator?.();
    const res = await fetch(SERVER_URL, { method: "POST", body: ps });
    const text = await res.text();
    if (text.trim() === "OK") {
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

// - otevřeni zoommodalu - 
function openZoom() {
  const zahon = aktualniZahon;
  document.getElementById("zoomModal").style.display = "flex";

  requestAnimationFrame(() => {
    drawZoomCanvas(zahon.Delka, zahon.Sirka);
  });
}


// - zavreni zoommodalu - 
function closeZoomModal() {
  document.getElementById("zoomModal").style.display = "none";
}
// vykreslení zahonu 
function drawZoomCanvas(delka, sirka) {
  const canvas = document.getElementById("zoomCanvas");
  const ctx = canvas.getContext("2d");

  if (!canvas || !ctx) return;

  // Dynamická velikost canvasu (např. 90% šířky okna, 70% výšky)
  const maxWidth = window.innerWidth * 0.9;
  const maxHeight = window.innerHeight * 0.7;
  const padding = 40;

  // Výpočet měřítka podle poměru
  const scale = Math.min(
    (maxWidth - padding * 2) / delka,
    (maxHeight - padding * 2) / sirka
  );

  const w = delka * scale;
  const h = sirka * scale;

  canvas.width = w + padding * 2;
  canvas.height = h + padding * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const x = padding;
  const y = padding;

  // Vykreslení záhonu
  ctx.fillStyle = "#deb887";
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);

  // Volitelně: vypiš rozměry
  ctx.fillStyle = "#000";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Délka: ${delka} m`, x, y - 10);
  ctx.fillText(`Šířka: ${sirka} m`, x, y + h + 20);
}
//- funkce pro zobrazeni a zmenu velikosti canvas- 
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
  ps.append("action", "addUdalost");
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
    if (text.trim() === "OK") {
      zpetNaDetailZahonu();
      loadHnojeniHistory();
    } else {
      alert("Chyba při ukládání hnojení: " + text);
    }
  } catch (e) {
    console.error("ulozHnojeni error:", e);
    alert("Chyba při odesílání hnojení.");
  } finally {
    hideActionIndicator?.();
  }
}
function loadHnojeniHistory() {
  const cont = document.getElementById("hnojeniHistory");
  if (!cont || !aktualniZahon) return;
  
  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`)
    .then(r => r.json())
    .then(arr => {
      const data = arr.filter(u => u.Typ === "Hnojení");
      if (!data.length) {
        cont.innerHTML = "<p>Žádná historie hnojení.</p>";
        return;
      }
      let html = `<table>
        <thead><tr><th>Datum</th><th>Hnojivo</th><th>Množství (kg)</th></tr></thead><tbody>`;
      data.reverse().slice(0, 5).forEach(u => {
        html += `<tr>
          <td>${formatDate(u.Datum)}</td>
          <td>${u.Hnojivo || ""}</td>
          <td>${u.Mnozstvi_kg || ""}</td>
        </tr>`;
      });
      html += "</tbody></table>";
      cont.innerHTML = html;
    })
    .catch(e => {
      console.error("Chyba historie hnojení:", e);
      cont.innerHTML = "<p>Chyba při načítání historie.</p>";
    });
}




