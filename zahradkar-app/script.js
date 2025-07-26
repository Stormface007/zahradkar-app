// URL vašeho Google Apps Scriptu
const SERVER_URL = "https://script.google.com/macros/s/AKfycbyJAdUq9ZU_s_OEc-WiAaWsHc5rh4H-jUwo1vrh55dHvQ-xRDuyEKiFaUCikFvowm3y/exec";


// — Počasí podle geolokace —
function loadWeatherByGeolocation(){
  const contIcon = document.getElementById("weatherIcon");
  const contTemp = document.getElementById("weatherTemp");
  if(!navigator.geolocation){
    contTemp.textContent = "–";
    return;
  }
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude:lat, longitude:lon} = pos.coords;
    fetch(`https://wttr.in/${lat},${lon}?format=j1`)
      .then(r => r.json())
      .then(data => {
        const cur = data.current_condition[0];
        contIcon.src         = cur.weatherIconUrl[0].value;
        contIcon.alt         = cur.weatherDesc[0].value;
        contTemp.textContent = `${cur.temp_C} °C`;
      })
      .catch(err=>{
        console.error("Počasí:", err);
        contTemp.textContent = "–";
      });
  }, err=>{
    console.warn("Geolokace selhala:", err);
    contTemp.textContent = "–";
  });
}

// — Indikátor akce —
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

let aktualniZahon = null;

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


// — Načtení záhonů —  
async function loadZahony() {
  const userID = localStorage.getItem("userID");
  if (!userID) return;
  const res = await fetch(`${SERVER_URL}?action=getZahony&userID=${userID}`);
  const arr = await res.json();
  const tbody = document.querySelector("#zahonyTable tbody");
  tbody.innerHTML = "";
  arr.forEach(z => {
    const row = document.createElement("tr");

    // checkbox
    const tdChk = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox"; 
    cb.value = z.ZahonID;
    tdChk.appendChild(cb);

    // název záhonu jako odkaz (otevře modal)
    const tdName = document.createElement("td");
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = z.NazevZahonu;
    a.onclick = () => otevriModal(z);
    tdName.appendChild(a);

    // plocha
    const plo = z.Velikost_m2 != null
      ? z.Velikost_m2
      : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
    const tdSize = document.createElement("td");
    tdSize.textContent = plo + " m²";

    row.append(tdChk, tdName, tdSize);
    tbody.appendChild(row);
  });
}

// — Mazání záhonů —
function deleteSelected() {
  const checks = document.querySelectorAll(
    "#zahonyTable tbody input[type='checkbox']:checked"
  );
  if (!checks.length) return alert("Neoznačili jste žádný záhon.");

  showActionIndicator();
  Promise.all(Array.from(checks).map(cb => {
    const ps = new URLSearchParams();
    ps.append("action","deleteZahon");
    ps.append("ZahonID", cb.value);
    return fetch(SERVER_URL, { method:"POST", body:ps }).then(r => r.text());
  }))
  .then(results => { loadZahony(); })
  .finally(() => hideActionIndicator());
}

// — Přidání záhonu —
function addZahon() {
  const userID = localStorage.getItem("userID");
  const nazev  = document.getElementById("newNazev").value.trim();
  const delka  = parseFloat(document.getElementById("newDelka").value)||0;
  const sirka  = parseFloat(document.getElementById("newSirka").value)||0;
  if (!nazev||delka<=0||sirka<=0) {
    alert("Vyplňte správně název, délku i šířku."); return;
  }
  showActionIndicator();
  const ps=new URLSearchParams();
  ps.append("action","addZahon");
  ps.append("userID",userID);
  ps.append("NazevZahonu",nazev);
  ps.append("Delka",delka);
  ps.append("Sirka",sirka);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if(txt.trim()==="OK"){
        ["newNazev","newDelka","newSirka"].forEach(id=>document.getElementById(id).value="");
        loadZahony();
      }
    })
    .finally(()=>hideActionIndicator());
}

// — Otevření modalu záhonu —
function otevriModal(zahon) {
  aktualniZahon = zahon;
  setActiveIcon(null);
  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka||0;
  document.getElementById("editSirka").value = zahon.Sirka||0;
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

// — Úprava záhonu —
function updatePlocha() {
  const d = parseFloat(document.getElementById("editDelka").value)||0;
  const s = parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent = (d*s).toFixed(2);
}
function saveZahon() {
  const nazev = document.getElementById("editNazev").value.trim();
  const delka = parseFloat(document.getElementById("editDelka").value)||0;
  const sirka = parseFloat(document.getElementById("editSirka").value)||0;
  if(!nazev||delka<=0||sirka<=0){
    alert("Vyplňte správně název, délku a šířku."); return;
  }
  showActionIndicator();
  const ps=new URLSearchParams();
  ps.append("action","updateZahon");
  ps.append("ZahonID",aktualniZahon.ZahonID);
  ps.append("NazevZahonu",nazev);
  ps.append("Delka",delka);
  ps.append("Sirka",sirka);
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
    .catch(e=>{
      console.error("Chyba saveZahon:",e);
      alert("Chyba při ukládání záhonu.");
    })
    .finally(()=>hideActionIndicator());
}

// — Načtení plodin a hnojiv —
function loadPlodiny(){
  fetch(`${SERVER_URL}?action=getPlodiny`)
    .then(r=>r.json())
    .then(arr=>{
      const sel=document.getElementById("plodinaSelect");
      if(!sel)return;
      sel.innerHTML=`<option value="">– vyber plodinu –</option>`;
      arr.forEach(p=>{
        const o=document.createElement("option");
        o.value=p.nazev; o.textContent=p.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>console.error("Chyba plodiny:",e));
}
function loadHnojiva(){
  fetch(`${SERVER_URL}?action=getHnojiva`)
    .then(r=>r.json())
    .then(arr=>{
      const sel=document.getElementById("hnojivoSelect");
      if(!sel)return;
      sel.innerHTML=`<option value="">– vyber hnojivo –</option>`;
      arr.forEach(h=>{
        const o=document.createElement("option");
        o.value=h.nazev; o.textContent=h.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>console.error("Chyba hnojiva:",e));
}

// — Formuláře událostí / analýzy —
function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";

  const c = document.getElementById("udalostFormContainer");
  let html = `<h4>${typ.charAt(0).toUpperCase()+typ.slice(1)}</h4>
    <label>Datum: <input type="date" id="udalostDatum"/></label><br>`;

  if (typ === "seti") {
    html += `<label>Plodina:
        <select id="plodinaSelect"><option>Načítám…</option></select>
      </label><br>`;
    loadPlodiny();
  }

  if (typ === "hnojeni") {
    html += `<label>Hnojivo:
        <select id="hnojivoSelect"><option>Načítám…</option></select>
      </label><br>
      <label>Množství (kg):
        <input type="number" id="udalostMnozstvi"/>
      </label><br>
      <!-- sem vykreslíme historii -->
      <div id="hnojeniHistory" class="hnojeni-history">
        <em>Načítám historii hnojení…</em>
      </div>`;
    loadHnojiva();
    loadHnojeniHistory();
  }

  if (typ === "sklizen") {
    html += `<label>Plodina:
        <input type="text" id="udalostPlodina"/>
      </label><br>
      <label>Výnos (kg):
        <input type="number" id="udalostVynos"/>
      </label><br>`;
  }

  c.innerHTML = html;
}

function loadHnojeniHistory() {
  const container = document.getElementById("hnojeniHistory");
  if (!aktualniZahon) return container.innerHTML = `<p>Žádný záhon.</p>`;

  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`)
    .then(r => r.json())
    .then(arr => {
      // vyber jen Hnojení
      const hist = arr.filter(u => u.Typ.toLowerCase() === Hnojení" || u.Typ.toLowerCase() === "Hnojení");
      if (hist.length === 0) {
        container.innerHTML = `<p>Žádná historie hnojení.</p>`;
        return;
      }

      let html = `<table class="hnojeni-table">
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
          <td>${u.Datum}</td>
          <td>${u.Hnojivo}</td>
          <td>${u.Mnozstvi}</td>
          <td>${u.N_g_m2 || ""}</td>
          <td>${u.P_g_m2 || ""}</td>
          <td>${u.K_g_m2 || ""}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
      container.innerHTML = html;
    })
    .catch(e => {
      console.error("Chyba načtení historie hnojení:", e);
      container.innerHTML = `<p>Chyba při načítání historie.</p>`;
    });
}
function ulozUdalost(typ){
  alert("Uloženo: "+typ);
  zpetNaDetailZahonu();
}
function showAnalysisForm(){
  document.getElementById("modalViewDefault").style.display="none";
  const uv=document.getElementById("modalViewUdalost");
  uv.classList.add("analysis");
  uv.style.display="block";
  document.getElementById("udalostFormContainer").innerHTML=`
    <h4>Analýza</h4>
    <label>Datum:<input type="date" id="analDatum"/></label><br>
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
function saveAnalysis(){
  alert("Analýza uložena");
  zpetNaDetailZahonu();
}
function zpetNaDetailZahonu(){
  const uv=document.getElementById("modalViewUdalost");
  uv.style.display="none";
  uv.classList.remove("analysis");
  document.getElementById("modalViewDefault").style.display="block";
  setActiveIcon(null);
}

// — Boční ikony — 
function setActiveIcon(active) {
  // teď jen těch 6, které opravdu používáme
  ["mereni","seti","hnojeni","sklizen","analyza","nastaveni"]
    .forEach(t => {
      const el = document.getElementById(`icon-${t}`);
      if (el) el.classList.toggle("active", t === active);
    });
}

function onIconClick(typ) {
  setActiveIcon(typ);

  // skryjeme obě view
  document.getElementById("modalViewDefault").style.display  = "none";
  document.getElementById("modalViewUdalost").style.display = "none";

  if (typ === "seti" || typ === "hnojeni" || typ === "sklizen") {
    showUdalostForm(typ);
  }
  else if (typ === "mereni") {
    // u měření vrátíme výchozí editaci záhonu
    document.getElementById("modalViewDefault").style.display = "block";
  }
  else if (typ === "analyza") {
    showAnalysisForm();
  }
  else if (typ === "nastaveni") {
    // tady můžete v budoucnu přidat funkci pro "nastavení"
  }
}

// — Kreslení záhonu —
function nakresliZahonCanvas(d,s){
  const cont=document.getElementById("zahonVizualizace");
  cont.innerHTML="";
  const cv=document.createElement("canvas");
  cv.width=cv.height=200;
  const ctx=cv.getContext("2d");
  ctx.fillStyle="#009900"; ctx.fillRect(0,0,200,200);
  const scale=Math.min(200/(d||1),200/(s||1));
  const w=(d||1)*scale, h=(s||1)*scale;
  const x=(200-w)/2, y=(200-h)/2;
  ctx.fillStyle="#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  cv.style.cursor="pointer";
  cv.onclick=()=>{
    if(document.getElementById("modal").style.display==="flex"&&aktualniZahon){
      openZoom(aktualniZahon.Delka,aktualniZahon.Sirka);
    }
  };
  cont.appendChild(cv);
}

// — Zoom modal —
function openZoom(d,s){
  const cv=document.getElementById("zoomCanvas");
  const factor=5, base=80;
  cv.width=base*factor; cv.height=base*factor;
  const ctx=cv.getContext("2d");
  ctx.fillStyle="#009900"; ctx.fillRect(0,0,cv.width,cv.height);
  const scale=Math.min(cv.width/(d||1),cv.height/(s||1));
  const w=(d||1)*scale, h=(s||1)*scale;
  const x=(cv.width-w)/2, y=(cv.height-h)/2;
  ctx.fillStyle="#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  document.getElementById("zoomModal").style.display="flex";
}
function closeZoom(){
  document.getElementById("zoomModal").style.display="none";
}

// — Auto-login při načtení stránky —
document.addEventListener("DOMContentLoaded",()=>{
  const zm=document.getElementById("zoomModal");
  if(zm) zm.querySelector("button").addEventListener("click",closeZoom);
  if(localStorage.getItem("userID")) onLoginSuccess();
  loadWeatherByGeolocation();
});