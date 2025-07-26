// URL vašeho Google Apps Scriptu
const SERVER_URL = "https://script.google.com/macros/s/AKfycbzIbLz5PiesOcF13vJFU84YBL7duwEMpoXJF9Ha8jxqrJBRAWiR8B8qnVhOeS3O1om3/exec";

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

// — Načtení záhonů —
function loadZahony() {
  const userID = localStorage.getItem("userID");
  if (!userID) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${userID}`)
    .then(r => r.json())
    .then(arr => {
      const tbody = document.querySelector("#zahonyTable tbody");
      tbody.innerHTML = "";
      arr.forEach(z => {
        const tr = document.createElement("tr");
        // checkbox
        const tdChk = document.createElement("td");
        const cb    = document.createElement("input");
        cb.type     = "checkbox";
        cb.value    = z.ZahonID;
        tdChk.appendChild(cb);
        // název
        const tdNm = document.createElement("td");
        const a    = document.createElement("a");
        a.href        = "#";
        a.textContent = z.NazevZahonu;
        a.onclick     = () => otevriModal(z);
        tdNm.appendChild(a);
        // plocha
        const plo = (z.Velikost_m2 != null)
          ? z.Velikost_m2
          : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        const tdSz = document.createElement("td");
        tdSz.textContent = plo + " m²";
        tr.append(tdChk, tdNm, tdSz);
        tbody.appendChild(tr);
      });
    })
    .catch(e => console.error("Chyba načtení záhonů:", e));
}

// — Smazat vybrané záhony —
function deleteSelected() {
  const checks = document.querySelectorAll(
    "#zahonyTable tbody input[type='checkbox']:checked"
  );
  if (!checks.length) return alert("Neoznačili jste žádný záhon.");
  Promise.all(Array.from(checks).map(cb => {
    const ps = new URLSearchParams();
    ps.append("action","deleteZahon");
    ps.append("ZahonID",cb.value);
    return fetch(SERVER_URL,{method:"POST",body:ps}).then(r=>r.text());
  }))
  .then(()=>loadZahony())
  .catch(e=>console.error(e));
}

// — Přidat nový záhon —
function addZahon() {
  const userID = localStorage.getItem("userID");
  const nazev  = document.getElementById("newNazev").value.trim();
  const delka  = parseFloat(document.getElementById("newDelka").value)||0;
  const sirka  = parseFloat(document.getElementById("newSirka").value)||0;
  if (!nazev||delka<=0||sirka<=0) return alert("Vyplňte název, délku i šířku.");
  const ps = new URLSearchParams();
  ps.append("action","addZahon");
  ps.append("userID",userID);
  ps.append("NazevZahonu",nazev);
  ps.append("Delka",delka);
  ps.append("Sirka",sirka);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if (txt.trim()==="OK") {
        ["newNazev","newDelka","newSirka"]
          .forEach(id=>document.getElementById(id).value="");
        loadZahony();
      }
    })
    .catch(e=>console.error(e));
}

// — Otevřít modal záhonu —
function otevriModal(zahon) {
  aktualniZahon = zahon;
  setActiveIcon(null);
  // naplnit základní údaje
  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka||0;
  document.getElementById("editSirka").value = zahon.Sirka||0;
  updatePlocha();
  // vykreslit záhon
  nakresliZahonCanvas(zahon.Delka,zahon.Sirka);
  // zobrazit výchozí view
  document.getElementById("modalViewDefault").style.display = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modal").style.display            = "flex";
}
function closeModal() {
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}

// — Uložit změny záhonu —
function updatePlocha() {
  const d = parseFloat(document.getElementById("editDelka").value)||0;
  const s = parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy")
    .textContent = (d*s).toFixed(2);
}
function saveZahon() {
  const nazev = document.getElementById("editNazev").value.trim();
  const delka = parseFloat(document.getElementById("editDelka").value)||0;
  const sirka = parseFloat(document.getElementById("editSirka").value)||0;
  if (!nazev||delka<=0||sirka<=0)
    return alert("Vyplňte korektně všechny údaje.");
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
        closeModal(); loadZahony();
      } else alert("Chyba: "+txt);
    })
    .catch(e=>console.error(e));
}

// — Načíst hnojiva pro select —
function loadHnojiva() {
  fetch(`${SERVER_URL}?action=getHnojiva`)
    .then(r=>r.json())
    .then(arr=>{
      const sel = document.getElementById("udalostHnojivo");
      sel.innerHTML = `<option value="">– vyber hnojivo –</option>`;
      arr.forEach(h=>{
        const o = document.createElement("option");
        o.value       = h.nazev;
        o.textContent = h.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>{
      console.error(e);
      document.getElementById("udalostHnojivo")
        .innerHTML = `<option>Chyba načítání</option>`;
    });
}

// — Vypis hnojení pro aktuální záhon —
function loadHnojeniList() {
  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`)
    .then(r=>r.json())
    .then(arr=>{
      // vyber jen typ "Hnojení"
      const hno = arr.filter(u=>u.Typ.toLowerCase()==="hnojení");
      const box = document.getElementById("udalostiHnojeniList");
      if (!hno.length) {
        box.innerHTML = "<em>Žádné hnojení.</em>";
        return;
      }
      // vytvořit tabulku
      let html = `<table class="hno-table">
        <thead><tr>
          <th>Hnojivo</th><th>Datum</th>
          <th>N (g/m²)</th><th>P (g/m²)</th><th>K (g/m²)</th>
        </tr></thead><tbody>`;
      hno.forEach(u=>{
        html += `<tr>
          <td>${u.Hnojivo}</td>
          <td>${u.Datum}</td>
          <td>${u.N_g_m2||"-"}</td>
          <td>${u.P_g_m2||"-"}</td>
          <td>${u.K_g_m2||"-"}</td>
        </tr>`;
      });
      html += "</tbody></table>";
      box.innerHTML = html;
    })
    .catch(e=>{
      console.error(e);
      document.getElementById("udalostiHnojeniList")
        .innerHTML = "<em>Chyba při načítání seznamu.</em>";
    });
}

// — Zobrazit formulář „hnojení“ —
function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display = "block";

  const c = document.getElementById("udalostFormContainer");
  // jen Save / Back jako obrázky
  let html = `<h4>Hnojení</h4>
    <label>Datum:
      <input type="date" id="udalostDatum"/>
    </label><br>
    <label>Hnojivo:
      <select id="udalostHnojivo">
        <option>Načítám…</option>
      </select>
    </label><br>
    <label>Množství (kg):
      <input type="number" id="udalostMnozstvi"/>
    </label><br>
    <div class="udalost-buttons">
      <img src="img/Safe.png"
           alt="Uložit"
           class="modal-btn"
           onclick="ulozUdalost('hnojeni')" />
      <img src="img/Goback .png"
           alt="Zpět"
           class="modal-btn"
           onclick="zpetNaDetailZahonu()" />
    </div>
    <hr>
    <div id="udalostiHnojeniList"><em>Načítám historii…</em></div>
  `;
  c.innerHTML = html;

  // načíst výběr hnojiv a pak seznam událostí
  loadHnojiva();
  loadHnojeniList();
}

// — Uložit hnojení do Udalosti —
function ulozUdalost(typ) {
  const datum = document.getElementById("udalostDatum").value;
  const hnoj   = document.getElementById("udalostHnojivo").value;
  const mnoz   = parseFloat(document.getElementById("udalostHnojivo").value || 0;
  if (!datum||!hnoj||!mnoz) {
    return alert("Vyplňte datum, hnojivo i množství.");
  }
  const ps = new URLSearchParams();
  ps.append("action","addUdalost");
  ps.append("zahonID",aktualniZahon.ZahonID);
  ps.append("typ","hnojení");
  ps.append("datum",datum);
  ps.append("plodina","");
  ps.append("hnojivo",hnoj);
  ps.append("mnozstvi",mnoz);
  ps.append("vynos","");
  ps.append("poznamka","");
  // server‐side musí uložit i sloupce I, J, K (g/m²) – spočítáte buď v GAS, nebo tady
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if (txt.trim()==="OK") {
        // aktualizovat seznam hnojení
        loadHnojeniList();
      } else {
        alert("Chyba ukládání: "+txt);
      }
    })
    .catch(e=>console.error(e));
}

// — Návrat na detail záhonu —
function zpetNaDetailZahonu() {
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modalViewDefault").style.display = "block";
  setActiveIcon(null);
}

// — Boční ikony —
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
  document.getElementById("modalViewUdalost").style.display  = "none";
  if (["seti","hnojeni","sklizen"].includes(typ)) showUdalostForm(typ);
  else if (typ==="mereni")
    document.getElementById("modalViewDefault").style.display = "block";
  else if (typ==="analyza")
    showAnalysisForm();
}

// — Kreslení záhonu —
function nakresliZahonCanvas(delka,sirka) {
  const c = document.getElementById("zahonVizualizace");
  c.innerHTML = "";
  const cv = document.createElement("canvas");
  cv.width = cv.height = 200;
  const ctx = cv.getContext("2d");
  // zelené pozadí
  ctx.fillStyle = "#009900"; ctx.fillRect(0,0,200,200);
  // hnědý záhon
  const scale = Math.min(200/(delka||1),200/(sirka||1));
  const w = (delka||1)*scale, h = (sirka||1)*scale;
  const x = (200-w)/2, y = (200-h)/2;
  ctx.fillStyle = "#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  c.appendChild(cv);
}

// — Zoom modal (nezměněno) —
function openZoom(d,s){ /* … */ }
function closeZoom(){ document.getElementById("zoomModal").style.display="none"; }

// — Auto-login po načtení —
document.addEventListener("DOMContentLoaded",()=>{
  if (localStorage.getItem("userID")) onLoginSuccess();
});
