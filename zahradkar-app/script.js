// — Vaše URL GAS webappu —  
const SERVER_URL = "https://script.google.com/macros/s/AKfycbyJAdUq9ZU_s_OEc-WiAaWsHc5rh4H-jUwo1vrh55dHvQ-xRDuyEKiFaUCikFvowm3y/exec";

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
async function login(){
  const u=document.getElementById("username").value,
        p=document.getElementById("password").value;
  try{
    const res = await fetch(`${SERVER_URL}?action=login`,{
      method:"POST",
      body:new URLSearchParams({username:u,password:p})
    });
    const data = await res.json();
    if(data.success){
      localStorage.setItem("userID",data.userID);
      onLoginSuccess();
    } else {
      document.getElementById("loginMsg").innerText="Neplatné přihlašovací údaje.";
    }
  }catch(e){
    console.error(e);
    document.getElementById("loginMsg").innerText="Chyba při přihlášení.";
  }
}
function onLoginSuccess(){
  document.getElementById("loginDiv").style.display="none";
  document.getElementById("appDiv").style.display="block";
  loadZahony();
}
function logout(){
  localStorage.removeItem("userID");
  document.getElementById("appDiv").style.display="none";
  document.getElementById("loginDiv").style.display="block";
}

// — Načtení seznamu záhonů —
async function loadZahony(){
  const uid = localStorage.getItem("userID");
  if(!uid) return;
  const res = await fetch(`${SERVER_URL}?action=getZahony&userID=${uid}`);
  const arr = await res.json();
  const tb = document.querySelector("#zahonyTable tbody");
  tb.innerHTML="";
  arr.forEach(z=>{
    const row=document.createElement("tr");
    // checkbox
    const td1=document.createElement("td"),
          cb=document.createElement("input");
    cb.type="checkbox"; cb.value=z.ZahonID;
    td1.append(cb);
    // odkaz
    const td2=document.createElement("td"),
          a=document.createElement("a");
    a.href="#"; a.textContent=z.NazevZahonu;
    a.onclick=()=>otevriModal(z);
    td2.append(a);
    // plocha
    const td3=document.createElement("td"),
          plo = z.Velikost_m2!=null
            ? z.Velikost_m2
            : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
    td3.textContent=`${plo} m²`;
    row.append(td1,td2,td3);
    tb.append(row);
  });
}

// — Mazání záhonů —
function deleteSelected(){
  const checks = document.querySelectorAll(
    "#zahonyTable tbody input:checked"
  );
  if(!checks.length) return alert("Neoznačili jste žádný záhon.");
  showActionIndicator();
  Promise.all(
    Array.from(checks).map(cb=>{
      const ps=new URLSearchParams();
      ps.append("action","deleteZahon");
      ps.append("ZahonID",cb.value);
      return fetch(SERVER_URL,{method:"POST",body:ps})
        .then(r=>r.text());
    })
  ).then(()=>loadZahony())
   .finally(()=>hideActionIndicator());
}

// — Přidání záhonu —
function addZahon(){
  const uid=localStorage.getItem("userID"),
        n=document.getElementById("newNazev").value.trim(),
        d=parseFloat(document.getElementById("newDelka").value)||0,
        s=parseFloat(document.getElementById("newSirka").value)||0;
  if(!n||d<=0||s<=0){
    alert("Vyplňte správně název, délku i šířku.");return;
  }
  showActionIndicator();
  const ps=new URLSearchParams();
  ps.append("action","addZahon");
  ps.append("userID",uid);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if(txt.trim()==="OK"){
        ["newNazev","newDelka","newSirka"]
          .forEach(id=>document.getElementById(id).value="");
        loadZahony();
      }
    })
    .finally(()=>hideActionIndicator());
}

// — Otevření modalu záhonu —
function otevriModal(z){
  aktualniZahon=z;
  setActiveIcon(null);
  // vyplnit form
  document.getElementById("editNazev").value=z.NazevZahonu;
  document.getElementById("editDelka").value=z.Delka||0;
  document.getElementById("editSirka").value=z.Sirka||0;
  updatePlocha();
  nakresliZahonCanvas(z.Delka,z.Sirka);
  // zobrazit default
  document.getElementById("modalViewDefault").style.display="block";
  document.getElementById("modalViewUdalost").style.display="none";
  document.getElementById("modal").style.display="flex";
}
function closeModal(){
  aktualniZahon=null;
  document.getElementById("modal").style.display="none";
}

// — Úprava záhonu —
function updatePlocha(){
  const d=parseFloat(document.getElementById("editDelka").value)||0,
        s=parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent=(d*s).toFixed(2);
}
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

// — Načtení plodin/hnojiv —
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
  // 1) schovej defaultní view
  document.getElementById("modalViewDefault").style.display = "none";

  // 2) připrav modální oblast událostí
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";

  // 3) vygeneruj formulář podle typu
  const c = document.getElementById("udalostFormContainer");
  let html = `
    <h4>${typ.charAt(0).toUpperCase()+typ.slice(1)}</h4>
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
        <select id="hnojivoSelect">
          <option>Načítám…</option>
        </select>
      </label><br>
      <label>Množství (kg):
        <input type="number" id="udalostMnozstvi"/>
      </label><br>

      <!-- historie hnojení se vloží jen pro „hnojení“ -->
      <div id="hnojeniHistory" class="hnojeni-history">
        <em>Načítám historii hnojení…</em>
      </div>
    `;
    loadHnojiva();
    loadHnojeniHistory();
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

  // 4) tlačítka „uložit“ a „zpět“
  html += `
    <img src="img/Safe.png"   alt="Uložit" class="modal-btn" onclick="ulozUdalost('${typ}')"/>
    <img src="img/Goback .png" alt="Zpět"  class="modal-btn" onclick="zpetNaDetailZahonu()"/>
  `;

  c.innerHTML = html;
}



// — Načtení historie hnojení —
function loadHnojeniHistory() {
  const container = document.getElementById("hnojeniHistory");
  if (!aktualniZahon) {
    container.innerHTML = `<p>Žádný výběr záhonu.</p>`;
    return;
  }

  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`)
    .then(r => r.json())
    .then(arr => {
      // vyber jen Hnojení
      const hist = arr.filter(u =>
        u.Typ.toLowerCase() === "Hnojení"
      );

      if (hist.length === 0) {
        container.innerHTML = `<p>Žádná historie hnojení.</p>`;
        return;
      }

      let html = `
        <table class="hnojeni-table">
          <thead>
            <tr>
              <th>Datum</th><th>Hnojivo</th><th>Množství (kg)</th>
              <th>N (g/m²)</th><th>P (g/m²)</th><th>K (g/m²)</th>
            </tr>
          </thead>
          <tbody>
      `;
      hist.forEach(u => {
        html += `
          <tr>
            <td>${u.Datum}</td>
            <td>${u.Hnojivo}</td>
            <td>${u.Mnozstvi}</td>
            <td>${u.N_g_m2||""}</td>
            <td>${u.P_g_m2||""}</td>
            <td>${u.K_g_m2||""}</td>
          </tr>
        `;
      });
      html += `</tbody></table>`;
      container.innerHTML = html;
    })
    .catch(e => {
      console.error("Chyba načtení historie hnojení:", e);
      container.innerHTML = `<p>Chyba při načítání historie.</p>`;
    });
}

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
  `;

  // a teď obrázky
  c.innerHTML += `
    <img src="img/Safe.png"    alt="Uložit analýzu" class="modal-btn" onclick="saveAnalysis()"/>
    <img src="img/Goback .png" alt="Zpět" class="modal-btn" onclick="zpetNaDetailZahonu()"/>
  `;
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
      const e=document.getElementById("icon-"+t);
      if(e) e.classList.toggle("active", t===active);
    });
}
function onIconClick(typ){
  setActiveIcon(typ);
  document.getElementById("modalViewDefault").style.display="none";
  document.getElementById("modalViewUdalost").style.display="none";
  if(["seti","hnojeni","sklizen"].includes(typ)) showUdalostForm(typ);
  else if(typ==="mereni") document.getElementById("modalViewDefault").style.display="block";
  else if(typ==="analyza") showAnalysisForm();
  // nastaveni zatím nic
}

// — Kreslení záhonu —
function nakresliZahonCanvas(d,s){
  const c=document.getElementById("zahonVizualizace");
  c.innerHTML="";
  const cv=document.createElement("canvas");
  cv.width=cv.height=200;
  const ctx=cv.getContext("2d");
  ctx.fillStyle="#009900"; ctx.fillRect(0,0,200,200);
  const scale=Math.min(200/(d||1),200/(s||1)),
        w=(d||1)*scale, h=(s||1)*scale,
        x=(200-w)/2, y=(200-h)/2;
  ctx.fillStyle="#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  cv.style.cursor="pointer";
  cv.onclick=()=>{ if(document.getElementById("modal").style.display==="flex"&&aktualniZahon){
      openZoom(aktualniZahon.Delka, aktualniZahon.Sirka);
    }};
  c.appendChild(cv);
}

// — Zoom modal —
function openZoom(d,s){
  const cv=document.getElementById("zoomCanvas"), factor=5, base=80;
  cv.width=base*factor; cv.height=base*factor;
  const ctx=cv.getContext("2d");
  ctx.fillStyle="#009900"; ctx.fillRect(0,0,cv.width,cv.height);
  const scale=Math.min(cv.width/(d||1),cv.height/(s||1)),
        w=(d||1)*scale, h=(s||1)*scale,
        x=(cv.width-w)/2, y=(cv.height-h)/2;
  ctx.fillStyle="#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  document.getElementById("zoomModal").style.display="flex";
}
function closeZoom(){
  document.getElementById("zoomModal").style.display="none";
}

// — Auto-login + počasí při načtení —
document.addEventListener("DOMContentLoaded", ()=>{
  const zm=document.getElementById("zoomModal");
  if(zm) zm.querySelector("button")?.addEventListener("click", closeZoom);
  if(localStorage.getItem("userID")) onLoginSuccess();
  loadWeatherByGeolocation();
});

async function ulozUdalost(typ) {
  // 1) základní hodnoty
  const zahonID = aktualniZahon?.ZahonID;
  const datum   = document.getElementById("udalostDatum").value;
  if (!zahonID || !datum) {
    return alert("Záhon a datum jsou povinné.");
  }

  // 2) připravíme parametry
  const ps = new URLSearchParams();
  ps.append("action",   "addUdalost");
  ps.append("zahonID",  zahonID);
  // server očekává velké "Typ" – tam dejme první písmeno uppercase:
  ps.append("typ",      typ.charAt(0).toUpperCase() + typ.slice(1));
  ps.append("datum",    datum);

  // 3) plodina (jen pro setí)
  if (typ === "seti") {
    const pl = document.getElementById("plodinaSelect").value;
    ps.append("plodina", pl);
  } else {
    ps.append("plodina", "");
  }

  // 4) hnojivo a množství (jen pro hnojení)
  if (typ === "Hnojení") {
    const hnoj = document.getElementById("hnojivoSelect").value;
    const mnoz = parseFloat(document.getElementById("udalostMnozstvi").value) || 0;
    ps.append("hnojivo",   hnoj);
    ps.append("mnozstvi",  mnoz);
  } else {
    ps.append("hnojivo",  "");
    ps.append("mnozstvi", "");
  }

  // 5) sklizeň: výnos
  if (typ === "sklizen") {
    const vynos = parseFloat(document.getElementById("udalostVynos").value) || 0;
    ps.append("vynos", vynos);
  } else {
    ps.append("vynos", "");
  }

  // 6) poznámku teď ignorujeme (upravili jste, že tam nechcete)
  ps.append("poznamka", "");

  // 7) odešleme na server
  try {
    showActionIndicator?.();
    const res  = await fetch(SERVER_URL, { method: "POST", body: ps });
    const text = await res.text();
    if (text.trim() === "OK") {
      if (typ === "hnojeni") {
        // po hnojení obnovíme historii
        loadHnojeniHistory();
      }
      // a vrátíme se na detail záhonu
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