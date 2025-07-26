// URL vašeho Google Apps Scriptu
const SERVER_URL = "https://script.google.com/macros/s/AKfycbyAmBWlgu-pxt9_T0tMq47HyD7wQmnCDg5L2N-zJ0CJNG1AsCERe3XJcd3oGfN6LSev/exec";

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

// — Seznam záhonů —
function loadZahony() {
  const userID = localStorage.getItem("userID");
  if (!userID) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${userID}`)
    .then(r => r.json())
    .then(arr => {
      const tbody = document.querySelector("#zahonyTable tbody");
      tbody.innerHTML = "";
      arr.forEach(z => {
        const row = document.createElement("tr");
        // checkbox
        const tdChk = document.createElement("td");
        const cb = document.createElement("input");
        cb.type  = "checkbox";
        cb.value = z.ZahonID;
        tdChk.appendChild(cb);
        // název se klikem otevře modal
        const tdName = document.createElement("td");
        const a = document.createElement("a");
        a.href        = "#";
        a.textContent = z.NazevZahonu;
        a.onclick     = () => otevriModal(z);
        tdName.appendChild(a);
        // plocha
        const plo = (z.Velikost_m2 != null)
          ? z.Velikost_m2
          : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        const tdSize = document.createElement("td");
        tdSize.textContent = plo + " m²";
        row.append(tdChk, tdName, tdSize);
        tbody.appendChild(row);
      });
    })
    .catch(e => console.error("Chyba načtení záhonů:", e));
}

// — Mazání záhonu —
function deleteSelected() {
  const checks = document.querySelectorAll(
    "#zahonyTable tbody input[type='checkbox']:checked"
  );
  if (!checks.length) return alert("Neoznačili jste žádný záhon.");
  const promises = Array.from(checks).map(cb => {
    const ps = new URLSearchParams();
    ps.append("action", "deleteZahon");
    ps.append("ZahonID", cb.value);
    return fetch(SERVER_URL, { method: "POST", body: ps }).then(r => r.text());
  });
  Promise.all(promises)
    .then(() => loadZahony())
    .catch(e => console.error("Chyba mazání záhonu:", e));
}

// — Přidání záhonu —
function addZahon() {
  const userID = localStorage.getItem("userID");
  const nazev  = document.getElementById("newNazev").value.trim();
  const delka  = parseFloat(document.getElementById("newDelka").value) || 0;
  const sirka  = parseFloat(document.getElementById("newSirka").value) || 0;
  if (!nazev || delka <= 0 || sirka <= 0) {
    alert("Vyplňte správně název, délku i šířku.");
    return;
  }
  const ps = new URLSearchParams();
  ps.append("action", "addZahon");
  ps.append("userID", userID);
  ps.append("NazevZahonu", nazev);
  ps.append("Delka", delka);
  ps.append("Sirka", sirka);
  fetch(SERVER_URL, { method: "POST", body: ps })
    .then(r => r.text())
    .then(txt => {
      if (txt.trim() === "OK") {
        ["newNazev","newDelka","newSirka"]
          .forEach(id => document.getElementById(id).value = "");
        loadZahony();
      } else {
        alert("Chyba při přidávání záhonu: " + txt);
      }
    })
    .catch(e => console.error("Chyba addZahon:", e));
}

// — Otevření modalu záhonu —
function otevriModal(zahon) {
  aktualniZahon = zahon;
  setActiveIcon(null);
  // naplnit údaje
  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka || 0;
  document.getElementById("editSirka").value = zahon.Sirka || 0;
  updatePlocha();
  // vykreslit záhon
  nakresliZahonCanvas(zahon.Delka, zahon.Sirka);
  // zobrazit default view
  document.getElementById("modalViewDefault").style.display = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modal").style.display            = "flex";
}
function closeModal() {
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}

// — Úprava záhonu —
function updatePlocha() {
  const d = parseFloat(document.getElementById("editDelka").value) || 0;
  const s = parseFloat(document.getElementById("editSirka").value) || 0;
  document.getElementById("vypocetPlochy").textContent = (d*s).toFixed(2);
}
function saveZahon() {
  const nazev = document.getElementById("editNazev").value.trim();
  const delka = parseFloat(document.getElementById("editDelka").value) || 0;
  const sirka = parseFloat(document.getElementById("editSirka").value) || 0;
  if (!nazev || delka<=0||sirka<=0) return alert("Vyplňte správně všechno.");
  const ps = new URLSearchParams();
  ps.append("action","updateZahon");
  ps.append("ZahonID",aktualniZahon.ZahonID);
  ps.append("NazevZahonu",nazev);
  ps.append("Delka",delka);
  ps.append("Sirka",sirka);
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
    .catch(e=>console.error("Chyba saveZahon:",e));
}

// — Načtení hnojiv pro modal hnojení —
function loadHnojiva() {
  fetch(`${SERVER_URL}?action=getHnojiva`)
    .then(r=>r.json())
    .then(arr=>{
      const sel = document.getElementById("udalostHnojivo");
      sel.innerHTML = `<option value="">– vyber hnojivo –</option>`;
      arr.forEach(h => {
        const o = document.createElement("option");
        o.value = h.nazev;       // sloupec B = název
        o.textContent = h.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>{
      console.error("Chyba při načítání hnojiv:", e);
      const sel = document.getElementById("udalostHnojivo");
      if (sel) sel.innerHTML = `<option>Chyba načítání</option>`;
    });
}

// — Přepínání na formulář události / hnojení / sklizeň / analýza —
function showUdalostForm(typ) {
  // schovat default
  document.getElementById("modalViewDefault").style.display = "none";
  // zobrazit event view
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";
  // postavit HTML
  const c = document.getElementById("udalostFormContainer");
  let html = `<h4>${typ.charAt(0).toUpperCase()+typ.slice(1)}</h4>
    <label>Datum: <input type="date" id="udalostDatum"/></label><br>`;
  if (typ === "seti") {
    html += `<label>Plodina: <input type="text" id="udalostPlodina"/></label><br>`;
  }
  else if (typ === "hnojeni") {
    html += `
      <label>Hnojivo:
        <select id="udalostHnojivo">
          <option>Načítám...</option>
        </select>
      </label><br>
      <label>Množství (kg):
        <input type="number" id="udalostMnozstvi"/>
      </label><br>
    `;
  }
  else if (typ === "sklizen") {
    html += `
      <label>Plodina: <input type="text" id="udalostPlodina"/></label><br>
      <label>Výnos (kg): <input type="number" id="udalostVynos"/></label><br>
    `;
  }
  html += `<button onclick="ulozUdalost('${typ}')">Uložit</button>
           <button onclick="zpetNaDetailZahonu()">Zpět</button>`;
  c.innerHTML = html;
  // pokud je to hnojení, načteme select hnojiv
  if (typ === "hnojeni") {
    loadHnojiva();
  }
}

// — Uložení události (setí/hnojení/sklizeň) —
function ulozUdalost(typ) {
  const datum    = document.getElementById("udalostDatum").value;
  const ps       = new URLSearchParams();
  ps.append("action", "addUdalost");
  ps.append("zahonID", aktualniZahon.ZahonID);
  ps.append("typ", typ);
  ps.append("datum", datum);
  // pro hnojení:
  if (typ === "hnojeni") {
    const hnoj = document.getElementById("udalostHnojivo").value;
    const mnoz = document.getElementById("udalostMnozstvi").value;
    ps.append("plodina", "");
    ps.append("hnojivo", hnoj);
    ps.append("mnozstvi", mnoz);
    ps.append("vynos", "");
    ps.append("poznamka", "");
  }
  // ostatní typy si můžete analogicky doplnit...
  fetch(SERVER_URL, { method: "POST", body: ps })
    .then(r=>r.text())
    .then(txt=>{
      if (txt.trim()==="OK") {
        zpetNaDetailZahonu();
      } else {
        alert("Chyba při ukládání události: " + txt);
      }
    })
    .catch(e=>console.error("Chyba ulozUdalost:",e));
}

// — Návrat na detail záhonu —
function zpetNaDetailZahonu() {
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modalViewDefault").style.display = "block";
  setActiveIcon(null);
}

// — Analytický režim (zatím beze změny) —
function showAnalysisForm() { /* … vaše analýzy … */ }

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

// — Vizualizace záhonu —
function nakresliZahonCanvas(d, s) {
  const c = document.getElementById("zahonVizualizace");
  c.innerHTML = "";
  const cv = document.createElement("canvas");
  cv.width = cv.height = 200;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#009900"; ctx.fillRect(0,0,200,200);
  const scale = Math.min(200/(d||1),200/(s||1));
  const w = (d||1)*scale, h = (s||1)*scale;
  const x = (200-w)/2, y = (200-h)/2;
  ctx.fillStyle = "#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  c.appendChild(cv);
}

// — Zoom modal (bez změn) —
function openZoom(d,s){/*…*/} 
function closeZoom(){/*…*/}

// — Auto-login při startu —
document.addEventListener("DOMContentLoaded", ()=>{
  if (localStorage.getItem("userID")) onLoginSuccess();
});