// URL vašeho Google Apps Scriptu
const SERVER_URL = "https://script.google.com/macros/s/AKfycby5Q582sTjMVzHDwInTpUQqQDbMMaZoAT90Lv1hEiB8rcRVs3XX21JUKYNmg16nYsGW/exec";

let aktualniZahon = null;

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
      .then(r=>r.json())
      .then(data=>{
        const cur = data.current_condition[0];
        contIcon.src         = cur.weatherIconUrl[0].value;
        contIcon.alt         = cur.weatherDesc[0].value;
        contTemp.textContent = `${cur.temp_C} °C`;
      })
      .catch(_=>{
        contTemp.textContent = "–";
      });
  },_=>{
    contTemp.textContent = "–";
  });
}

// — Init po načtení stránky —
document.addEventListener("DOMContentLoaded", ()=>{
  // zoom‐modal zavírací tlačítko
  const zm = document.getElementById("zoomModal");
  if(zm) zm.querySelector("button").addEventListener("click", closeZoom);

  // počasí
  loadWeatherByGeolocation();

  // pokud jsme už přihlášeni
  if(localStorage.getItem("userID")) onLoginSuccess();
});

// — Indikátor akce (náhodná mrkev / rajče / petržel) —
function showActionIndicator(){
  const imgs = [
    'Plodina_mrkev .png',
    'Plodina_rajce.png',
    'Plodina_petrzel_koren.png'
  ];
  const idx = Math.floor(Math.random()*imgs.length);
  document.querySelector('#actionIndicator img').src = `img/${imgs[idx]}`;
  document.getElementById('actionIndicator').classList.add('active');
}
function hideActionIndicator(){
  document.getElementById('actionIndicator').classList.remove('active');
}

// — Přihlášení / odhlášení —
async function login(){
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  try {
    const res = await fetch(`${SERVER_URL}?action=login`, {
      method: "POST",
      body: new URLSearchParams({ username: u, password: p })
    });
    const data = await res.json();
    if(data.success){
      localStorage.setItem("userID", data.userID);
      onLoginSuccess();
    } else {
      document.getElementById("loginMsg").innerText = "Neplatné přihlašovací údaje.";
    }
  } catch(e){
    console.error("Login error:", e);
    document.getElementById("loginMsg").innerText = "Chyba při přihlášení.";
  }
}
function onLoginSuccess(){
  document.getElementById("loginDiv").style.display = "none";
  document.getElementById("appDiv").style.display   = "block";
  loadZahony();
}
function logout(){
  localStorage.removeItem("userID");
  document.getElementById("appDiv").style.display   = "none";
  document.getElementById("loginDiv").style.display = "block";
}

// — Výpis / Mazání / Přidání záhonů —
function loadZahony(){
  const u = localStorage.getItem("userID");
  if(!u) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${u}`)
    .then(r=>r.json())
    .then(arr=>{
      const tb = document.querySelector("#zahonyTable tbody");
      tb.innerHTML = "";
      arr.forEach(z=>{
        const row = document.createElement("tr");
        // checkbox
        const c1 = document.createElement("td");
        const cb = document.createElement("input");
        cb.type  = "checkbox";
        cb.value = z.ZahonID;
        c1.appendChild(cb);
        // název + ikona
        const c2 = document.createElement("td");
        const link = document.createElement("a");
        link.className = "zahon-link";
        link.href = "#";
        link.onclick = ()=>otevriModal(z);
        const ico = document.createElement("img");
        ico.src       = "img/Freefield.png";
        ico.className = "zahon-icon";
        link.appendChild(ico);
        link.appendChild(document.createTextNode(z.NazevZahonu));
        c2.appendChild(link);
        // plocha
        const plo = z.Velikost_m2 != null
          ? z.Velikost_m2
          : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        const c3 = document.createElement("td");
        c3.textContent = plo + " m²";
        row.append(c1,c2,c3);
        tb.appendChild(row);
      });
    })
    .catch(e=>console.error("Chyba načtení záhonů:", e));
}
function deleteSelected(){
  const checks = document.querySelectorAll(
    "#zahonyTable tbody input[type='checkbox']:checked"
  );
  if(!checks.length) return alert("Neoznačeno.");
  showActionIndicator();
  Promise.all(Array.from(checks).map(cb=>{
    const ps = new URLSearchParams();
    ps.append("action","deleteZahon");
    ps.append("ZahonID", cb.value);
    return fetch(SERVER_URL,{method:"POST",body:ps}).then(r=>r.text());
  }))
  .then(resArr=>{
    loadZahony();
  })
  .finally(hideActionIndicator);
}
function addZahon(){
  const u = localStorage.getItem("userID");
  const n = document.getElementById("newNazev").value.trim();
  const d = parseFloat(document.getElementById("newDelka").value)||0;
  const s = parseFloat(document.getElementById("newSirka").value)||0;
  if(!n||d<=0||s<=0) return alert("Vyplňte správně.");
  showActionIndicator();
  const ps=new URLSearchParams();
  ps.append("action","addZahon");
  ps.append("userID",u);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{ if(txt.trim()==="OK"){
      ["newNazev","newDelka","newSirka"].forEach(id=>document.getElementById(id).value="");
      loadZahony();
    }})
    .finally(hideActionIndicator);
}

// — Modální okno záhonu —
function otevriModal(zahon){
  aktualniZahon = zahon;
  setActiveIcon(null);
  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka||0;
  document.getElementById("editSirka").value = zahon.Sirka||0;
  updatePlocha();
  nakresliZahonCanvas(zahon.Delka,zahon.Sirka);
  document.getElementById("modalViewDefault").style.display  = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modal").style.display            = "flex";
}
function closeModal(){
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}

// — Úprava záhonu —
function updatePlocha(){
  const d=parseFloat(document.getElementById("editDelka").value)||0;
  const s=parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent = (d*s).toFixed(2);
}
function saveZahon(){
  const n=document.getElementById("editNazev").value.trim();
  const d=parseFloat(document.getElementById("editDelka").value)||0;
  const s=parseFloat(document.getElementById("editSirka").value)||0;
  if(!n||d<=0||s<=0) return alert("Vyplňte správně.");
  showActionIndicator();
  const ps=new URLSearchParams();
  ps.append("action","updateZahon");
  ps.append("ZahonID",aktualniZahon.ZahonID);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{ if(txt.trim()==="OK"){
      closeModal(); loadZahony();
    }})
    .catch(e=>console.error("Chyba saveZahon:",e))
    .finally(hideActionIndicator);
}

// — Načtení plodin / hnojiv —
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
        o.dataset.N     = p.N_gm2;    // g/m²
        o.dataset.P     = p.P_gm2;
        o.dataset.K     = p.K_gm2;
        o.dataset.yield = p.Vynos_kg_m;
        sel.appendChild(o);
      });
    })
    .catch(e=>console.error("Chyba plodin:",e));
}
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
        o.dataset.N    = h.N/100;    // procento → desetinné
        o.dataset.P2O5 = h.P2O5/100;
        o.dataset.K2O  = h.K2O/100;
        sel.appendChild(o);
      });
    })
    .catch(e=>console.error("Chyba hnojiv:",e));
}

// — Výpočet dávky hnojiva —
function updateHnojeni(){
  const crop = document.getElementById("plodinaSelect").selectedOptions[0];
  const fert = document.getElementById("hnojivoSelect").selectedOptions[0];
  const delka = parseFloat(document.getElementById("hnojenidelka")?.value)||0;
  const sirka = parseFloat(document.getElementById("hnojeniSirka")?.value)||0;
  const plocha = delka*sirka;
  if(!crop||!fert||plocha<=0) return;
  const n_g = parseFloat(crop.dataset.N)*plocha;  // g
  const p_g = parseFloat(crop.dataset.P)*plocha;
  const k_g = parseFloat(crop.dataset.K)*plocha;
  const n_pct  = parseFloat(fert.dataset.N);
  const p_pct  = parseFloat(fert.dataset.P2O5);
  const k_pct  = parseFloat(fert.dataset.K2O);
  const giveN_g = n_pct  ? n_g  / n_pct  : 0;
  const giveP_g = p_pct  ? p_g  / p_pct  : 0;
  const giveK_g = k_pct  ? k_g  / k_pct  : 0;
  document.getElementById("needNkg").textContent  = (n_g/1000).toFixed(2);
  document.getElementById("fertNkg").textContent  = (giveN_g/1000).toFixed(2);
  document.getElementById("needPg").textContent   = n_g.toFixed(0);
  document.getElementById("fertPg").textContent   = giveP_g.toFixed(0);
  document.getElementById("needKg").textContent   = k_g.toFixed(0);
  document.getElementById("fertKg").textContent   = giveK_g.toFixed(0);
}

// — Zobrazení formuláře události / setí / hnojení / sklizeň / analýzy —
function showUdalostForm(typ){
  document.getElementById("modalViewDefault").style.display="none";
  const uv=document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display="block";
  const c=document.getElementById("udalostFormContainer");
  let html=`<h4>${typ.charAt(0).toUpperCase()+typ.slice(1)}</h4>
    <label>Datum:<input type="date" id="udalostDatum"/></label><br>`;
  if(typ==="seti"){
    html+=`<label>Plodina:<select id="plodinaSelect"><option>Načítám…</option></select></label><br>`;
    loadPlodiny();
  }
  else if(typ==="hnojeni"){
    html+=`
      <label>Plodina: 
        <select id="plodinaSelect" onchange="updateHnojeni()">
          <option>Načítám…</option>
        </select>
      </label><br>
      <label>Délka (m): <input type="number" id="hnojenidelka" oninput="updateHnojeni()"/></label><br>
      <label>Šířka (m): <input type="number" id="hnojeniSirka" oninput="updateHnojeni()"/></label><br>
      <label>Hnojivo: 
        <select id="hnojivoSelect" onchange="updateHnojeni()"><option>Načítám…</option></select>
      </label><br>
      <div id="hnojeniResult">
        <p>Potřeba N: <strong><span id="needNkg">–</span></strong> kg → hnojiva: <strong><span id="fertNkg">–</span></strong> kg</p>
        <p>Potřeba P: <strong><span id="needPg">–</span></strong> g → hnojiva: <strong><span id="fertPg">–</span></strong> g</p>
        <p>Potřeba K: <strong><span id="needKg">–</span></strong> g → hnojiva: <strong><span id="fertKg">–</span></strong> g</p>
      </div>`;
    loadPlodiny();
    loadHnojiva();
    updateHnojeni();
  }
  else if(typ==="sklizen"){
    html+=`
      <label>Plodina:<input type="text" id="udalostPlodina"/></label><br>
      <label>Výnos (kg):<input type="number" id="udalostVynos"/></label><br>`;
  }
  else if(typ==="analyza"){
    // opakuje showAnalysisForm
    return showAnalysisForm();
  }
  html+=`<label>Poznámka:<input type="text" id="udalostPoznamka"/></label><br>
         <button onclick="ulozUdalost('${typ}')">Uložit</button>`;
  c.innerHTML = html;
}

// — Uložení události / sklizení / hnojení / setí —
function ulozUdalost(typ){
  alert("Uloženo " + typ);
  zpetNaDetailZahonu();
}

// — Analýza —
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
      <div class="nutrient"><label>N:</label><input type="number" id="analN"/></div>
      <div class="nutrient"><label>P:</label><input type="number" id="analP"/></div>
      <div class="nutrient"><label>K:</label><input type="number" id="analK"/></div>
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
function setActiveIcon(active){
  ["mereni","seti","hnojeni","sklizen","analyza","nastaveni"]
    .forEach(t=>{
      const el=document.getElementById(`icon-${t}`);
      if(el) el.classList.toggle("active", t===active);
    });
}
function onIconClick(typ){
  setActiveIcon(typ);
  document.getElementById("modalViewDefault").style.display="none";
  document.getElementById("modalViewUdalost").style.display="none";
  if(["seti","hnojeni","sklizen"].includes(typ)) showUdalostForm(typ);
  else if(typ==="mereni") document.getElementById("modalViewDefault").style.display="block";
  else if(typ==="analyza") showAnalysisForm();
  else if(typ==="nastaveni") {
    // sem případně setup budoucího nastavení
  }
}

// — Vizualizace záhonu —
function nakresliZahonCanvas(d,s){
  const cont = document.getElementById("zahonVizualizace");
  cont.innerHTML="";
  const cv=document.createElement("canvas");
  cv.width=cv.height=200;
  const ctx=cv.getContext("2d");
  // zelené pozadí
  ctx.fillStyle="#009900";
  ctx.fillRect(0,0,200,200);
  // hnědý záhon
  const scale=Math.min(200/(d||1),200/(s||1));
  const w=(d||1)*scale, h=(s||1)*scale;
  const x=(200-w)/2, y=(200-h)/2;
  ctx.fillStyle="#c2b280";
  ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2;
  ctx.strokeStyle="#000";
  ctx.strokeRect(x,y,w,h);
  // klik pro zoom
  cv.style.cursor="pointer";
  cv.onclick=()=>{ if(document.getElementById("modal").style.display==="flex"&&aktualniZahon) openZoom(aktualniZahon.Delka,aktualniZahon.Sirka); };
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