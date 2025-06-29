// URL vašeho Google Apps Scriptu
const SERVER_URL = "https://script.google.com/macros/s/AKfycby5Q582sTjMVzHDwInTpUQqQDbMMaZoAT90Lv1hEiB8rcRVs3XX21JUKYNmg16nYsGW/exec";

let aktualniZahon = null;

// — Přihlášení / odhlášení —
async function login() {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  try {
    const res = await fetch(`${SERVER_URL}?action=login`, {
      method: 'POST',
      body: new URLSearchParams({ username: u, password: p })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('userID', data.userID);
      document.getElementById('loginDiv').style.display = 'none';
      document.getElementById('appDiv').style.display   = 'block';
      loadZahony();
    } else {
      document.getElementById('loginMsg').innerText = 'Neplatné přihlašovací údaje.';
    }
  } catch {
    document.getElementById('loginMsg').innerText = 'Chyba při přihlášení.';
  }
}
function logout() {
  localStorage.removeItem('userID');
  document.getElementById('appDiv').style.display   = 'none';
  document.getElementById('loginDiv').style.display = 'block';
}

// — Záhony —
function loadZahony() {
  const userID = localStorage.getItem('userID');
  if (!userID) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${userID}`)
    .then(r => r.json())
    .then(arr => {
      const tb = document.querySelector('#zahonyTable tbody');
      tb.innerHTML = '';
      arr.forEach(z => {
        const row = document.createElement('tr');

        // checkbox
        const td1 = document.createElement('td');
        const cb  = document.createElement('input'); cb.type='checkbox'; cb.dataset.id = z.ZahonID;
        td1.appendChild(cb);

        // název
        const td2 = document.createElement('td');
        const a   = document.createElement('a');
        a.href = '#';
        a.textContent = z.NazevZahonu;
        a.onclick   = () => otevriModal(z);
        td2.appendChild(a);

        // plocha
        const td3 = document.createElement('td');
        const plo = (z.Velikost_m2 != null)
          ? z.Velikost_m2
          : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        td3.textContent = plo + ' m²';

        row.appendChild(td1);
        row.appendChild(td2);
        row.appendChild(td3);
        tb.appendChild(row);
      });
    });
}

function deleteSelected() {
  const checks = document.querySelectorAll(
    '#zahonyTable tbody input[type="checkbox"]:checked'
  );
  if (!checks.length) return;
  checks.forEach(cb => {
    const id = cb.dataset.id;
    const ps = new URLSearchParams();
    ps.append('action','deleteZahon');
    ps.append('ZahonID', id);
    fetch(SERVER_URL, { method:'POST', body:ps })
      .then(r=>r.text())
      .then(txt => {
        if (txt.trim()==='OK') loadZahony();
      });
  });
}

function addZahon() {
  const u = localStorage.getItem('userID');
  const n = document.getElementById('newNazev').value.trim();
  const d = parseFloat(document.getElementById('newDelka').value)||0;
  const s = parseFloat(document.getElementById('newSirka').value)||0;
  if (!n||d<=0||s<=0) return alert('Vyplňte správně název, délku i šířku.');
  const ps = new URLSearchParams();
  ps.append('action','addZahon');
  ps.append('userID',u);
  ps.append('NazevZahonu',n);
  ps.append('Delka',d);
  ps.append('Sirka',s);
  fetch(SERVER_URL,{method:'POST',body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if (txt.trim()==='OK') {
        ['newNazev','newDelka','newSirka'].forEach(id=>document.getElementById(id).value='');
        loadZahony();
      }
    });
}

// — Modální okno —
function otevriModal(z) {
  aktualniZahon = z;
  setActiveIcon(null);
  // default view
  document.getElementById('editNazev').value = z.NazevZahonu;
  document.getElementById('editDelka').value = z.Delka||0;
  document.getElementById('editSirka').value = z.Sirka||0;
  updatePlocha();
  nakresliZahonCanvas(z.Delka,z.Sirka);
  document.getElementById('modalViewDefault').style.display  = 'block';
  document.getElementById('modalViewUdalost').style.display = 'none';
  document.getElementById('modal').style.display            = 'flex';
}
function closeModal() {
  aktualniZahon = null;
  document.getElementById('modal').style.display = 'none';
}

// — Úprava záhonu —
function updatePlocha() {
  const d = parseFloat(document.getElementById('editDelka').value)||0;
  const s = parseFloat(document.getElementById('editSirka').value)||0;
  document.getElementById('vypocetPlochy').textContent = (d*s).toFixed(2);
}
function saveZahon() {
  const n = document.getElementById('editNazev').value.trim();
  const d = parseFloat(document.getElementById('editDelka').value)||0;
  const s = parseFloat(document.getElementById('editSirka').value)||0;
  if (!n||d<=0||s<=0) return alert('Vyplňte správně všechno.');
  const ps = new URLSearchParams();
  ps.append('action','updateZahon');
  ps.append('ZahonID',aktualniZahon.ZahonID);
  ps.append('NazevZahonu',n);
  ps.append('Delka',d);
  ps.append('Sirka',s);
  fetch(SERVER_URL,{method:'POST',body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if (txt.trim()==='OK') {
        closeModal();
        loadZahony();
      }
    });
}

// — Události —
function showUdalostForm(typ) {
  const c = document.getElementById('modalViewUdalost');
  c.classList.remove('analysis');
  document.getElementById('modalViewDefault').style.display  = 'none';
  c.style.display = 'block';
  document.getElementById('udalostFormContainer').innerHTML = `
    <h4>${typ.charAt(0).toUpperCase()+typ.slice(1)}</h4>
    <label>Datum: <input type="date" id="udalostDatum" /></label><br>
    ${typ==='seti' ? '<label>Plodina: <input type="text" id="udalostPlodina"/></label><br>' : ''}
    ${typ==='hnojeni' ? '<label>Hnojivo: <input type="text" id="udalostHnojivo"/></label><br><label>Množství (kg): <input type="number" id="udalostMnozstvi"/></label><br>' : ''}
    ${typ==='sklizen' ? '<label>Plodina: <input type="text" id="udalostPlodina"/></label><br><label>Výnos (kg): <input type="number" id="udalostVynos"/></label><br>' : ''}
    <label>Poznámka: <input type="text" id="udalostPoznamka"/></label><br>
    <button onclick="ulozUdalost('${typ}')">Uložit</button>
  `;
}
function ulozUdalost(typ) {
  // sem doplňte volání na backend...
  alert('Uloženo '+typ);
  zpetNaDetailZahonu();
}

// — Analýza —
function showAnalysisForm() {
  const c = document.getElementById('modalViewUdalost');
  c.classList.add('analysis');
  document.getElementById('modalViewDefault').style.display  = 'none';
  c.style.display = 'block';
  document.getElementById('udalostFormContainer').innerHTML = `
    <h4>Analýza</h4>
    <label for="analDatum">Datum:</label>
    <input type="date" id="analDatum" /><br>

    <div class="nutrients">
      <div class="nutrient">
        <label for="analPH">pH (–):</label>
        <input type="number" step="0.1" id="analPH" />
      </div>
      <div class="nutrient">
        <label for="analN">N (ppm):</label>
        <input type="number" id="analN" />
      </div>
      <div class="nutrient">
        <label for="analP">P (ppm):</label>
        <input type="number" id="analP" />
      </div>
      <div class="nutrient">
        <label for="analK">K (ppm):</label>
        <input type="number" id="analK" />
      </div>
    </div>

    <div class="soil-info">
      <label for="soilType">Typ půdy:</label>
      <input type="text" id="soilType" /><br>
      <label for="soilColor">Barva půdy:</label>
      <input type="text" id="soilColor" />
    </div>

    <button onclick="saveAnalysis()">Uložit analýzu</button>
  `;
}
function saveAnalysis() {
  // sem doplňte volání na backend...
  alert('Analýza uložena');
  zpetNaDetailZahonu();
}

// — Vrátit zpět —
function zpetNaDetailZahonu() {
  document.getElementById('modalViewUdalost').style.display = 'none';
  document.getElementById('modalViewDefault').style.display  = 'block';
  setActiveIcon(null);
}

// — Zobrazit / smazat události —
function zobrazUdalosti(zID) { /* ...pokud potřebujete */ }
function smazUdalost(uID,zID) { /* ...pokud potřebujete */ }

// — Boční ikony —
function setActiveIcon(active) {
  ['seti','hnojeni','sklizen','analyza'].forEach(t => {
    const el = document.getElementById(`icon-${t}`);
    el && el.classList.toggle('active', t===active);
  });
}
function onIconClick(typ) {
  setActiveIcon(typ);
  if (typ==='analyza') showAnalysisForm();
  else showUdalostForm(typ);
}

function nakresliZahonCanvas(delka, sirka) {
  const container = document.getElementById("zahonVizualizace");
  container.innerHTML = "";

  const canvas = document.createElement("canvas");
  canvas.width  = 200;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");

  // 1) zelené "pole" jako pozadí
  ctx.fillStyle = "#009900";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2) hnědý záhon uprostřed
  const scale = Math.min(canvas.width  / (delka || 1),
                         canvas.height / (sirka  || 1));
  const w = (delka || 1) * scale;
  const h = (sirka  || 1) * scale;
  const x = (canvas.width  - w) / 2;
  const y = (canvas.height - h) / 2;

  // výplň záhonu
  ctx.fillStyle = "#c2b280";
  ctx.fillRect(x, y, w, h);

  // 3) černý obrys kolem záhonu
  ctx.lineWidth   = 2;        // tloušťka čáry
  ctx.strokeStyle = "#000000"; // černá barva
  ctx.strokeRect(x, y, w, h);

  container.appendChild(canvas);
}