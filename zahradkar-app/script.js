// URL vašeho Google Apps Scriptu
const SERVER_URL = "https://script.google.com/macros/s/AKfycbzIbLz5PiesOcF13vJFU84YBL7duwEMpoXJF9Ha8jxqrJBRAWiR8B8qnVhOeS3O1om3/exec";

// — Počasí podle geolokace —
function loadWeatherByGeolocation() {
  const ic = document.getElementById("weatherIcon");
  const tp = document.getElementById("weatherTemp");
  if (!navigator.geolocation) { tp.textContent = "–"; return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude:lat, longitude:lon } = pos.coords;
    fetch(`https://wttr.in/${lat},${lon}?format=j1`)
      .then(r=>r.json()).then(d=>{
        const c = d.current_condition[0];
        ic.src = c.weatherIconUrl[0].value;
        ic.alt = c.weatherDesc[0].value;
        tp.textContent = `${c.temp_C} °C`;
      }).catch(_=>tp.textContent="–");
  }, _=> tp.textContent="–");
}

// — Indikátor akce (rotující mrkev) —
function showActionIndicator() {
  const imgs = ['Plodina_mrkev .png','Plodina_rajce.png','Plodina_petrzel_koren.png'];
  const idx = Math.floor(Math.random()*imgs.length);
  document.querySelector('#actionIndicator img').src = `img/${imgs[idx]}`;
  document.getElementById('actionIndicator').classList.add('active');
}
function hideActionIndicator() {
  document.getElementById('actionIndicator').classList.remove('active');
}

// — Přihlášení / odhlášení —
async function login() {
  const u = document.getElementById("username").value,
        p = document.getElementById("password").value;
  try {
    const res = await fetch(`${SERVER_URL}?action=login`, {
      method:"POST",
      body:new URLSearchParams({username:u,password:p})
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem("userID", data.userID);
      onLoginSuccess();
    } else {
      document.getElementById("loginMsg").innerText = "Neplatné údaje.";
    }
  } catch (e) {
    console.error(e);
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

// — Seznam záhonů —
let aktualniZahon = null;
function loadZahony() {
  const u = localStorage.getItem("userID");
  if (!u) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${u}`)
    .then(r=>r.json()).then(arr=>{
      const tb = document.querySelector("#zahonyTable tbody");
      tb.innerHTML = "";
      arr.forEach(z=>{
        const row = document.createElement("tr");
        // checkbox
        const td1 = document.createElement("td"),
              cb  = document.createElement("input");
        cb.type="checkbox"; cb.value=z.ZahonID;
        td1.append(cb);
        // název + ikonka
        const td2 = document.createElement("td"),
              a   = document.createElement("a"),
              ico = document.createElement("img");
        a.href="#"; a.className="zahon-link";
        a.onclick = ()=>otevriModal(z);
        ico.src="img/Freefield.png"; ico.className="zahon-icon";
        a.append(ico, document.createTextNode(z.NazevZahonu));
        td2.append(a);
        // plocha
        const td3 = document.createElement("td"),
              plo = z.Velikost_m2!=null
                ? z.Velikost_m2
                : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        td3.textContent = plo + " m²";
        row.append(td1,td2,td3);
        tb.append(row);
      });
    })
    .catch(e=>console.error("Chyba načtení záhonů:",e));
}

// — Mazání záhonů —
function deleteSelected() {
  const cbs = document.querySelectorAll("#zahonyTable tbody input:checked");
  if (!cbs.length) return;
  showActionIndicator();
  Promise.all(Array.from(cbs).map(cb=>{
    const ps = new URLSearchParams();
    ps.append("action","deleteZahon");
    ps.append("ZahonID", cb.value);
    return fetch(SERVER_URL,{method:"POST",body:ps}).then(r=>r.text());
  }))
  .then(res=>{
    if (!res.every(t=>t.trim()==="OK"))
      console.warn("Některé mazání selhalo:",res);
    loadZahony();
  })
  .catch(e=>console.error(e))
  .finally(hideActionIndicator);
}

// — Přidání záhonu —
function addZahon() {
  const u = localStorage.getItem("userID"),
        n = document.getElementById("newNazev").value.trim(),
        d = parseFloat(document.getElementById("newDelka").value)||0,
        s = parseFloat(document.getElementById("newSirka").value)||0;
  if (!n||d<=0||s<=0) { alert("Vyplňte korektně."); return; }
  showActionIndicator();
  const ps = new URLSearchParams();
  ps.append("action","addZahon");
  ps.append("userID",u);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(t=>{
      if (t.trim()==="OK") {
        ["newNazev","newDelka","newSirka"].forEach(id=>document.getElementById(id).value="");
        loadZahony();
      } else alert("Chyba: "+t);
    })
    .catch(e=>console.error(e))
    .finally(hideActionIndicator);
}

// — Načtení hnojiv —
function loadHnojiva() {
  fetch(`${SERVER_URL}?action=getHnojiva`)
    .then(r=>r.json())
    .then(arr=>{
      const sel = document.getElementById("hnojivoSelect");
      sel.innerHTML = `<option value="">– vyber hnojivo –</option>`;
      arr.forEach(h=>{
        const o = document.createElement("option");
        o.value = h.nazev; o.textContent = h.nazev;
        sel.append(o);
      });
    })
    .catch(e=>{
      console.error("Chyba načítání hnojiv:",e);
      document.getElementById("hnojivoSelect").innerHTML =
        `<option>Chyba načítání</option>`;
    });
}

// — Výpis historie hnojení pro aktuální záhon —
function loadHnojeniList() {
  const cont = document.getElementById("hnojeniList");
  cont.innerHTML = `<h4>Historie hnojení</h4>`;
  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`)
    .then(r=>r.json())
    .then(arr=>{
      const hnojs = arr.filter(e=>e.Typ.toLowerCase()==="hnojení");
      if (!hnojs.length) {
        cont.innerHTML += "<p>Žádné záznamy.</p>";
        return;
      }
      const tbl = document.createElement("table");
      tbl.innerHTML = `
        <thead><tr>
          <th>Hnojivo</th><th>Datum</th><th>N (g/m²)</th><th>P (g/m²)</th><th>K (g/m²)</th>
        </tr></thead>`;
      const tb = document.createElement("tbody");
      hnojs.forEach(ev=>{
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${ev.Hnojivo}</td>
          <td>${ev.Datum}</td>
          <td>${ev.N_gm2 ?? ev.Ngm2 ?? ""}</td>
          <td>${ev.P_gm2 ?? ev.Pgm2 ?? ""}</td>
          <td>${ev.K_gm2 ?? ev.Kgm2 ?? ""}</td>
        `;
        tb.append(tr);
      });
      tbl.append(tb);
      cont.append(tbl);
    })
    .catch(e=>{
      console.error("Chyba historie hnojení:",e);
      cont.innerHTML += "<p>Chyba načtení.</p>";
    });
}

// — Formulář událostí / setí / hnojení / sklizeň —
function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";

  const c = document.getElementById("udalostFormContainer");
  let html = `<h4>${typ[0].toUpperCase()+typ.slice(1)}</h4>
    <label>Datum: <input type="date" id="udalostDatum"/></label><br>`;

  if (typ==="seti") {
    html += `<label>Plodina:
      <select id="plodinaSelect"><option>Načítám…</option></select>
    </label><br>`;
  }
  if (typ==="hnojeni") {
    html += `<label>Hnojivo:
      <select id="hnojivoSelect"><option>Načítám…</option></select>
    </label><br>
    <label>Množství (kg):
      <input type="number" id="udalostMnozstvi"/>
    </label><br>
    <div id="hnojeniList"></div>`;
  }
  if (typ==="sklizen") {
    html += `<label>Plodina:
      <input type="text" id="udalostPlodina"/>
    </label><br>
    <label>Výnos (kg):
      <input type="number" id="udalostVynos"/>
    </label><br>`;
  }

  // ikony Uložit / Zpět
  html += `
    <img src="img/Safe.png"   alt="Uložit" class="modal-btn" onclick="ulozUdalost('${typ}')"/>
    <img src="img/Goback.png" alt="Zpět"  class="modal-btn" onclick="zpetNaDetailZahonu()"/>
  `;
  c.innerHTML = html;

  if (typ==="seti")     loadPlodiny();
  if (typ==="hnojeni")  { loadHnojiva(); loadHnojeniList(); }
}

// — Uložení události (volání GAS) —
function ulozUdalost(typ) {
  const ps = new URLSearchParams();
  ps.append("action","addUdalost");
  ps.append("zahonID", aktualniZahon.ZahonID);
  ps.append("typ",     typ);
  ps.append("datum",   document.getElementById("udalostDatum").value);

  if (typ==="seti") {
    ps.append("plodina", document.getElementById("plodinaSelect").value);
  }
  if (typ==="hnojeni") {
    ps.append("hnojivo",  document.getElementById("hnojivoSelect").value);
    const m = parseFloat(document.getElementById("udalostMnozstvi").value) || 0;
    ps.append("mnozstvi", m);
  }
  if (typ==="sklizen") {
    ps.append("plodina", document.getElementById("udalostPlodina").value);
    const v = parseFloat(document.getElementById("udalostVynos").value)||0;
    ps.append("vynos", v);
  }

  showActionIndicator();
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(t=>{
      if (t.trim()==="OK") {
        zpetNaDetailZahonu();
        loadZahony();
      } else {
        alert("Chyba: "+t);
      }
    })
    .catch(e=>console.error(e))
    .finally(hideActionIndicator);
}

// — Analýza —
function showAnalysisForm() {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.add("analysis");
  uv.style.display = "block";
  document.getElementById("udalostFormContainer").innerHTML = `
    <h4>Analýza</h4>
    <label>Datum: <input type="date" id="analDatum"/></label><br>
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
function saveAnalysis() {
  alert("Analýza uložena");
  zpetNaDetailZahonu();
}

// — Návrat na detail záhonu —
function zpetNaDetailZahonu() {
  const uv = document.getElementById("modalViewUdalost");
  uv.style.display = "none";
  uv.classList.remove("analysis");
  document.getElementById("modalViewDefault").style.display = "block";
  setActiveIcon(null);
}

// — Boční panel ikon —
function setActiveIcon(active) {
  ["mereni","seti","hnojeni","sklizen","analyza","nastaveni"]
    .forEach(t=>{
      const el = document.getElementById(`icon-${t}`);
      if (el) el.classList.toggle("active", t===active);
    });
}
function onIconClick(typ) {
  setActiveIcon(typ);
  document.getElementById("modalViewDefault").style.display  = "none";
  document.getElementById("modalViewUdalost").style.display = "none";
  if (["seti","hnojeni","sklizen"].includes(typ)) showUdalostForm(typ);
  else if (typ==="mereni") document.getElementById("modalViewDefault").style.display = "block";
  else if (typ==="analyza") showAnalysisForm();
}

// — Vizualizace záhonu (canvas) —
function otevriModal(z) {
  aktualniZahon = z;
  setActiveIcon(null);
  document.getElementById("editNazev").value = z.NazevZahonu;
  document.getElementById("editDelka").value = z.Delka||0;
  document.getElementById("editSirka").value = z.Sirka||0;
  updatePlocha();
  nakresliZahonCanvas(z.Delka,z.Sirka);
  document.getElementById("modalViewDefault").style.display  = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modal").style.display            = "flex";
}
function closeModal() {
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}
function updatePlocha() {
  const d = parseFloat(document.getElementById("editDelka").value)||0,
        s = parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent = (d*s).toFixed(2);
}
function saveZahon() {
  const n = document.getElementById("editNazev").value.trim(),
        d = parseFloat(document.getElementById("editDelka").value)||0,
        s = parseFloat(document.getElementById("editSirka").value)||0;
  if (!n||d<=0||s<=0) { alert("Doplňte všechny údaje."); return; }
  showActionIndicator();
  const ps = new URLSearchParams();
  ps.append("action","updateZahon");
  ps.append("ZahonID",aktualniZahon.ZahonID);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(t=>{
      if (t.trim()==="OK") { closeModal(); loadZahony(); }
      else alert("Chyba: "+t);
    })
    .catch(e=>console.error(e))
    .finally(hideActionIndicator);
}

function nakresliZahonCanvas(d,s) {
  const cont = document.getElementById("zahonVizualizace");
  cont.innerHTML="";
  const cv = document.createElement("canvas");
  cv.width = cv.height = 200;
  const ctx = cv.getContext("2d");
  ctx.fillStyle="#009900"; ctx.fillRect(0,0,200,200);
  const scale = Math.min(200/(d||1),200/(s||1));
  const w = (d||1)*scale, h = (s||1)*scale;
  const x=(200-w)/2, y=(200-h)/2;
  ctx.fillStyle="#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  cv.style.cursor="pointer";
  cv.onclick = ()=>{ if (document.getElementById("modal").style.display==="flex" && aktualniZahon) openZoom(aktualniZahon.Delka,aktualniZahon.Sirka); };
  cont.append(cv);
}

// — Zoom modal —
function openZoom(d,s) {
  const cv = document.getElementById("zoomCanvas"),
        f = 5, b = 80;
  cv.width = b*f; cv.height = b*f;
  const ctx = cv.getContext("2d");
  ctx.fillStyle="#009900"; ctx.fillRect(0,0,cv.width,cv.height);
  const sc = Math.min(cv.width/(d||1),cv.height/(s||1));
  const w=(d||1)*sc, h=(s||1)*sc, x=(cv.width-w)/2, y=(cv.height-h)/2;
  ctx.fillStyle="#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  document.getElementById("zoomModal").style.display="flex";
}
function closeZoom() {
  document.getElementById("zoomModal").style.display="none";
}

// — Init —
document.addEventListener("DOMContentLoaded",()=>{
  loadWeatherByGeolocation();
  const zm = document.getElementById("zoomModal");
  if (zm) zm.querySelector("button").addEventListener("click", closeZoom);
  if (localStorage.getItem("userID")) onLoginSuccess();
});