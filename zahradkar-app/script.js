// URL vašeho Google Apps Scriptu
const SERVER_URL = "https://script.google.com/macros/s/AKfycbzIbLz5PiesOcF13vJFU84YBL7duwEMpoXJF9Ha8jxqrJBRAWiR8B8qnVhOeS3O1om3/exec";

let aktualniZahon = null;

// — Počasí podle geolokace —
function loadWeatherByGeolocation() {
  const iconEl = document.getElementById("weatherIcon");
  const tempEl = document.getElementById("weatherTemp");
  if (!navigator.geolocation) {
    tempEl.textContent = "–";
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lon } = pos.coords;
    fetch(`https://wttr.in/${lat},${lon}?format=j1`)
      .then(r => r.json())
      .then(data => {
        const cur = data.current_condition[0];
        iconEl.src = cur.weatherIconUrl[0].value;
        iconEl.alt = cur.weatherDesc[0].value;
        tempEl.textContent = `${cur.temp_C} °C`;
      })
      .catch(err => {
        console.error("Počasí:", err);
        tempEl.textContent = "–";
      });
  }, err => {
    console.warn("Geolokace selhala:", err);
    tempEl.textContent = "–";
  });
}

// — Indikátor akce (rotující obrázek) —
function showActionIndicator() {
  const imgs = [
    "Plodina_mrkev .png",
    "Plodina_rajce.png",
    "Plodina_petrzel_koren.png"
  ];
  const idx = Math.floor(Math.random() * imgs.length);
  const imgEl = document.querySelector("#actionIndicator img");
  imgEl.src = `img/${imgs[idx]}`;
  document.getElementById("actionIndicator").classList.add("active");
}
function hideActionIndicator() {
  document.getElementById("actionIndicator").classList.remove("active");
}

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
  loadWeatherByGeolocation();
}
function logout() {
  localStorage.removeItem("userID");
  document.getElementById("appDiv").style.display   = "none";
  document.getElementById("loginDiv").style.display = "block";
}

// — Načtení a zobrazení záhonů —
function loadZahony() {
  const uid = localStorage.getItem("userID");
  if (!uid) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${uid}`)
    .then(r => r.json())
    .then(arr => {
      const tbody = document.querySelector("#zahonyTable tbody");
      tbody.innerHTML = "";
      arr.forEach(z => {
        const row = document.createElement("tr");
        // checkbox
        const td1 = document.createElement("td");
        const cb  = document.createElement("input");
        cb.type  = "checkbox";
        cb.value = z.ZahonID;
        td1.appendChild(cb);
        // název + ikona
        const td2 = document.createElement("td");
        const link = document.createElement("a");
        link.href      = "#";
        link.className = "zahon-link";
        link.onclick   = () => otevriModal(z);
        const ico = document.createElement("img");
        ico.src       = "img/Freefield.png";
        ico.alt       = "";
        ico.className = "zahon-icon";
        link.appendChild(ico);
        link.appendChild(document.createTextNode(z.NazevZahonu));
        td2.appendChild(link);
        // plocha
        const plo = (z.Velikost_m2 != null)
          ? z.Velikost_m2
          : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        const td3 = document.createElement("td");
        td3.textContent = plo + " m²";
        // sestavení
        row.append(td1, td2, td3);
        tbody.appendChild(row);
      });
    })
    .catch(e => console.error("Chyba načtení záhonů:", e));
}

// — Mazání označených záhonů —
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
    return fetch(SERVER_URL, { method:"POST", body:ps }).then(r=>r.text());
  }))
    .then(results => {
      if (!results.every(t => t.trim()==="OK"))
        console.warn("Některé mazání selhalo:", results);
      loadZahony();
    })
    .catch(e => console.error("Chyba mazání:", e))
    .finally(hideActionIndicator);
}

// — Přidání nového záhonu —
function addZahon() {
  const uid = localStorage.getItem("userID");
  const n   = document.getElementById("newNazev").value.trim();
  const d   = parseFloat(document.getElementById("newDelka").value)||0;
  const s   = parseFloat(document.getElementById("newSirka").value)||0;
  if (!n||d<=0||s<=0) return alert("Vyplňte správně název, délku i šířku.");
  showActionIndicator();
  const ps = new URLSearchParams();
  ps.append("action","addZahon");
  ps.append("userID",uid);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if (txt.trim()==="OK") {
        ["newNazev","newDelka","newSirka"].forEach(id=>
          document.getElementById(id).value=""
        );
        loadZahony();
      } else {
        alert("Chyba při přidání: "+txt);
      }
    })
    .catch(e=>console.error("Chyba addZahon:",e))
    .finally(hideActionIndicator);
}

// — Otevření modálního okna záhonu —
function otevriModal(zahon) {
  aktualniZahon = zahon;
  setActiveIcon(null);
  // vyplnit formulář
  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka || 0;
  document.getElementById("editSirka").value = zahon.Sirka || 0;
  updatePlocha();
  // nakreslit canvas
  nakresliZahonCanvas(zahon.Delka, zahon.Sirka);
  // zobrazit default view
  document.getElementById("modalViewDefault").style.display  = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modal").style.display            = "flex";
}

// — Zavření modalu —
function closeModal() {
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}

// — Pře­počítat plo­chu zá­ho­nu —
function updatePlocha() {
  const d = parseFloat(document.getElementById("editDelka").value)||0;
  const s = parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent = (d*s).toFixed(2);
}

// — Uložit změny záhonu —
function saveZahon() {
  const n = document.getElementById("editNazev").value.trim();
  const d = parseFloat(document.getElementById("editDelka").value)||0;
  const s = parseFloat(document.getElementById("editSirka").value)||0;
  if (!n||d<=0||s<=0) return alert("Vyplňte správně všechno.");
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
      if (txt.trim()==="OK") {
        closeModal();
        loadZahony();
      } else {
        alert("Chyba při ukládání: "+txt);
      }
    })
    .catch(e=>console.error("Chyba saveZahon:",e))
    .finally(hideActionIndicator);
}

// — Načtení plodin pro setí —
function loadPlodiny() {
  fetch(`${SERVER_URL}?action=getPlodiny`)
    .then(r=>r.json())
    .then(arr=>{
      const sel = document.getElementById("plodinaSelect");
      sel.innerHTML = `<option value="">– vyber plodinu –</option>`;
      arr.forEach(p=>{
        const o = document.createElement("option");
        o.value = p.nazev;
        o.textContent = p.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>{
      console.error("Chyba plodiny:",e);
      const sel = document.getElementById("plodinaSelect");
      if (sel) sel.innerHTML = `<option>Chyba načítání</option>`;
    });
}

// — Načtení hnojiv pro hnojení —
function loadHnojiva() {
  fetch(`${SERVER_URL}?action=getHnojiva`)
    .then(r=>r.json())
    .then(arr=>{
      const sel = document.getElementById("hnojivoSelect");
      sel.innerHTML = `<option value="">– vyber hnojivo –</option>`;
      arr.forEach(h=>{
        const o = document.createElement("option");
        o.value = h.nazev;
        o.textContent = h.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>{
      console.error("Chyba hnojiva:",e);
      const sel = document.getElementById("hnojivoSelect");
      if (sel) sel.innerHTML = `<option>Chyba načítání</option>`;
    });
}

// — Načtení historie hnojení pro záhon —
function loadHnojeniHistory() {
  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`)
    .then(r=>r.json())
    .then(arr=>{
      const hist = arr.filter(u =>
        u.Typ.toLowerCase()==="hnojení" || u.Typ.toLowerCase()==="hnojeni"
      );
      const c = document.getElementById("hnojeniHistory");
      if (!hist.length) {
        c.innerHTML = "<p>Žádné záznamy hnojení.</p>";
        return;
      }
      let tbl = `
        <table>
          <thead><tr>
            <th>Datum</th><th>Hnojivo</th><th>N (g/m²)</th><th>P (g/m²)</th><th>K (g/m²)</th>
          </tr></thead><tbody>
      `;
      hist.forEach(u=>{
        tbl += `
          <tr>
            <td>${u.Datum}</td>
            <td>${u.Hnojivo}</td>
            <td>${u.N_g_m2 ?? "-"}</td>
            <td>${u.P_g_m2 ?? "-"}</td>
            <td>${u.K_g_m2 ?? "-"}</td>
          </tr>
        `;
      });
      tbl += "</tbody></table>";
      c.innerHTML = tbl;
    })
    .catch(e=>{
      console.error("Chyba historie hnojení:",e);
      document.getElementById("hnojeniHistory").innerHTML =
        "<p class='error'>Nepodařilo se načíst historii.</p>";
    });
}

// — Přepínání formulářů v modalu —
function showUdalostForm(typ) {
  // skryjeme defaultní úpravu záhonu
  document.getElementById("modalViewDefault").style.display = "none";
  // zobrazíme kontejner událostí
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";

  // začneme skládat HTML pro formulář
  const c = document.getElementById("udalostFormContainer");
  let html = `<h4>${typ.charAt(0).toUpperCase() + typ.slice(1)}</h4>
    <label>Datum:
      <input type="date" id="udalostDatum"/>
    </label><br>`;

  if (typ === "seti") {
    html += `<label>Plodina:
        <select id="plodinaSelect">
          <option>Načítám…</option>
        </select>
      </label><br>`;
  }

  if (typ === "hnojeni") {
    html += `<label>Hnojivo:
        <select id="hnojivoSelect">
          <option>Načítám…</option>
        </select>
      </label><br>
      <label>Množství (kg):
        <input type="number" id="udalostMnozstvi"/>
      </label><br>
      <div id="hnojeniHistory" class="hnojeni-history">
        <em>Načítám historii hnojení…</em>
      </div>`;
  }

  if (typ === "sklizen") {
    html += `<label>Plodina:
        <input type="text" id="udalostPlodina"/>
      </label><br>
      <label>Výnos (kg):
        <input type="number" id="udalostVynos"/>
      </label><br>`;
  }

  // vložíme vygenerované HTML
  c.innerHTML = html;

  // načteme dynamická data
  if (typ === "seti") {
    loadPlodiny();
  }
  if (typ === "hnojeni") {
    loadHnojiva();
    loadHnojeniHistory();
  }
}
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
      <label>Typ půdy: <input type="text" id="soilType"/></label><br>
      <label>Barva půdy: <input type="text" id="soilColor"/></label>
    </div>`;
}
function zpetNaDetailZahonu() {
  const uv = document.getElementById("modalViewUdalost");
  uv.style.display = "none";
  uv.classList.remove("analysis");
  document.getElementById("modalViewDefault").style.display = "block";
  setActiveIcon(null);
}
function ulozUdalost(typ) {
  // sem doplníte volání na backend podle vaší code.gs
  alert("Uloženo: " + typ);
  zpetNaDetailZahonu();
}
function saveAnalysis() {
  alert("Analýza uložena");
  zpetNaDetailZahonu();
}

// — Boční ikony —
function setActiveIcon(active) {
  ["mereni","seti","hnojeni","sklizen","analyza","nastaveni"]
    .forEach(t => {
      const el = document.getElementById(`icon-${t}`);
      if (el) el.classList.toggle("active", t === active);
    });
}
function onIconClick(typ) {
  setActiveIcon(typ);
  document.getElementById("modalViewDefault").style.display  = "none";
  document.getElementById("modalViewUdalost").style.display  = "none";
  if (["seti","hnojeni","sklizen"].includes(typ)) showUdalostForm(typ);
  else if (typ === "mereni") document.getElementById("modalViewDefault").style.display = "block";
  else if (typ === "analyza") showAnalysisForm();
}

// — Kreslení a zoom záhonu —
function nakresliZahonCanvas(d, s) {
  const cont = document.getElementById("zahonVizualizace");
  cont.innerHTML = "";
  const cv = document.createElement("canvas");
  cv.width = cv.height = 200;
  const ctx = cv.getContext("2d");
  // zelené pozadí
  ctx.fillStyle = "#009900"; ctx.fillRect(0,0,200,200);
  // hnědý záhon
  const scale = Math.min(200/(d||1),200/(s||1));
  const w = (d||1)*scale, h = (s||1)*scale;
  const x = (200-w)/2, y = (200-h)/2;
  ctx.fillStyle = "#c2b280"; ctx.fillRect(x,y,w,h);
  // černý obrys
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  // klik pro zoom
  cv.style.cursor = "pointer";
  cv.onclick = () => {
    if (document.getElementById("modal").style.display==="flex" && aktualniZahon) {
      openZoom(aktualniZahon.Delka, aktualniZahon.Sirka);
    }
  };
  cont.appendChild(cv);
}
function openZoom(d, s) {
  const cv = document.getElementById("zoomCanvas");
  const factor = 5, base=80;
  cv.width = base*factor;
  cv.height= base*factor;
  const ctx = cv.getContext("2d");
  ctx.fillStyle="#009900"; ctx.fillRect(0,0,cv.width,cv.height);
  const scale = Math.min(cv.width/(d||1),cv.height/(s||1));
  const w=(d||1)*scale,h=(s||1)*scale;
  const x=(cv.width-w)/2,y=(cv.height-h)/2;
  ctx.fillStyle="#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  document.getElementById("zoomModal").style.display="flex";
}
function closeZoom() {
  document.getElementById("zoomModal").style.display="none";
}

// — Inicializace po načtení stránky —
document.addEventListener("DOMContentLoaded",()=>{
  // bind zoom-close
  const zm = document.getElementById("zoomModal");
  if(zm) zm.querySelector("button").addEventListener("click", closeZoom);
  // pokud je uživatel přihlášen, rovnou načti
  if(localStorage.getItem("userID")) onLoginSuccess();
});