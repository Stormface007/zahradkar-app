// URL vašeho Google Apps Scriptu
const SERVER_URL = "https://script.google.com/macros/s/AKfycby5Q582sTjMVzHDwInTpUQqQDbMMaZoAT90Lv1hEiB8rcRVs3XX21JUKYNmg16nYsGW/exec";

let aktualniZahon = null;

// ----------------------
// Přihlášení / odhlášení
// ----------------------
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  try {
    const res = await fetch(`${SERVER_URL}?action=login`, {
      method: "POST",
      body: new URLSearchParams({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem("userID", data.userID);
      document.getElementById("loginDiv").style.display = "none";
      document.getElementById("appDiv").style.display   = "block";
      loadZahony();
    } else {
      document.getElementById("loginMsg").innerText = "Neplatné přihlašovací údaje.";
    }
  } catch (err) {
    console.error("Login error:", err);
    document.getElementById("loginMsg").innerText = "Chyba při přihlášení.";
  }
}

function logout() {
  localStorage.removeItem("userID");
  document.getElementById("appDiv").style.display   = "none";
  document.getElementById("loginDiv").style.display = "block";
}

// ----------------------
// Práce se záhony
// ----------------------
function loadZahony() {
  const userID = localStorage.getItem("userID");
  if (!userID) return;

  fetch(`${SERVER_URL}?action=getZahony&userID=${userID}`)
    .then(r => r.json())
    .then(data => {
      const tbody = document.querySelector("#zahonyTable tbody");
      tbody.innerHTML = "";

      data.forEach(z => {
        const row    = document.createElement("tr");
        const tdChk  = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.id = z.ZahonID;
        tdChk.appendChild(checkbox);

        const tdName = document.createElement("td");
        const link   = document.createElement("a");
        link.href    = "#";
        link.textContent = z.NazevZahonu;
        link.onclick = () => otevriModal(z);
        tdName.appendChild(link);

        const plocha = z.Velikost_m2 != null
          ? z.Velikost_m2
          : ((z.Delka || 0) * (z.Sirka || 0)).toFixed(2);
        const tdSize = document.createElement("td");
        tdSize.textContent = `${plocha} m²`;

        row.appendChild(tdChk);
        row.appendChild(tdName);
        row.appendChild(tdSize);
        tbody.appendChild(row);
      });
    })
    .catch(e => console.error("Chyba načtení záhonů:", e));
}

function deleteSelected() {
  const checks = document.querySelectorAll(
    '#zahonyTable tbody input[type="checkbox"]:checked'
  );
  if (checks.length === 0) {
    console.warn("Žádné označené záhony k smazání");
    return;
  }
  checks.forEach(cb => {
    const id = cb.dataset.id;
    const params = new URLSearchParams();
    params.append("action", "deleteZahon");
    params.append("ZahonID", id);

    fetch(SERVER_URL, { method: "POST", body: params })
      .then(r => r.text())
      .then(txt => {
        if (txt.trim() === "OK") loadZahony();
        else console.error("Mazání se nepovedlo:", txt);
      })
      .catch(e => console.error("Chyba mazání záhonu:", e));
  });
}

function addZahon() {
  const userID = localStorage.getItem("userID");
  const nazev  = document.getElementById("newNazev").value.trim();
  const delka  = parseFloat(document.getElementById("newDelka").value) || 0;
  const sirka  = parseFloat(document.getElementById("newSirka").value) || 0;
  if (!nazev || delka <= 0 || sirka <= 0) {
    alert("Vyplňte správně název, délku a šířku záhonu.");
    return;
  }
  const form = new URLSearchParams();
  form.append("action", "addZahon");
  form.append("userID", userID);
  form.append("NazevZahonu", nazev);
  form.append("Delka", delka);
  form.append("Sirka", sirka);

  fetch(SERVER_URL, { method: "POST", body: form })
    .then(r => r.text())
    .then(txt => {
      if (txt.trim() === "OK") {
        ["newNazev","newDelka","newSirka"].forEach(id => document.getElementById(id).value = "");
        loadZahony();
      } else {
        alert("Chyba při přidávání záhonu: " + txt);
      }
    })
    .catch(e => console.error("Chyba addZahon:", e));
}

// ----------------------
// Modální okno
// ----------------------
function otevriModal(zahon) {
  aktualniZahon = zahon;
  setActiveIcon(null);

  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka || 0;
  document.getElementById("editSirka").value = zahon.Sirka || 0;
  updatePlocha();
  nakresliZahonCanvas(zahon.Delka, zahon.Sirka);

  document.getElementById("modalViewDefault").style.display = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modal").style.display = "flex";
}

function closeModal() {
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}

// ----------------------
// Úprava záhonu
// ----------------------
function updatePlocha() {
  const d = parseFloat(document.getElementById("editDelka").value) || 0;
  const s = parseFloat(document.getElementById("editSirka").value) || 0;
  document.getElementById("vypocetPlochy").textContent = (d * s).toFixed(2);
}

function saveZahon() {
  const nazev = document.getElementById("editNazev").value.trim();
  const delka = parseFloat(document.getElementById("editDelka").value) || 0;
  const sirka = parseFloat(document.getElementById("editSirka").value) || 0;
  if (!nazev || delka <= 0 || sirka <= 0) {
    alert("Vyplňte správně název, délku a šířku.");
    return;
  }
  const p = new URLSearchParams();
  p.append("action","updateZahon");
  p.append("ZahonID", aktualniZahon.ZahonID);
  p.append("NazevZahonu", nazev);
  p.append("Delka", delka);
  p.append("Sirka", sirka);

  fetch(SERVER_URL, { method: "POST", body: p })
    .then(r => r.text())
    .then(txt => {
      if (txt.trim()==="OK") {
        closeModal();
        loadZahony();
      } else {
        alert("Chyba při ukládání: "+txt);
      }
    })
    .catch(e => console.error("Chyba saveZahon:", e));
}

// ----------------------
// Boční ikony
// ----------------------
function setActiveIcon(activeTyp) {
  ["seti","hnojeni","sklizen","analyza"].forEach(t => {
    const el = document.getElementById("icon-"+t);
    if (!el) return;
    el.classList.toggle("active", t===activeTyp);
  });
}
function onIconClick(typ) {
  setActiveIcon(typ);
  showUdalostForm(typ);
}

// ----------------------
// Plodiny / hnojiva (pokud je v modálu <select>)
// ----------------------
function loadPlodiny() {
  fetch(`${SERVER_URL}?action=getPlodiny`)
    .then(r=>r.json())
    .then(data=>{
      const sel = document.getElementById("plodinaSelect");
      if (!sel) return;
      sel.innerHTML = "";
      data.forEach(p => {
        const o = document.createElement("option");
        o.value = p.nazev;
        o.textContent = p.nazev;
        sel.appendChild(o);
      });
    });
}
function loadHnojiva() {
  fetch(`${SERVER_URL}?action=getHnojiva`)
    .then(r=>r.json())
    .then(data=>{
      const sel = document.getElementById("hnojivoSelect");
      if (!sel) return;
      sel.innerHTML = "";
      data.forEach(h => {
        const o = document.createElement("option");
        o.value = h.nazev;
        o.textContent = h.nazev;
        sel.appendChild(o);
      });
    });
}

// ----------------------
// Události
// ----------------------
function showUdalostForm(typ) {
  document.getElementById("modalViewDefault").style.display = "none";
  document.getElementById("modalViewUdalost").style.display = "block";
  const c = document.getElementById("udalostFormContainer");
  c.innerHTML = `<h4>${typ[0].toUpperCase()+typ.slice(1)}</h4>`+
                `<label>Datum: <input type="date" id="udalostDatum"/></label><br>`+
                `<label>Plodina: <input type="text" id="udalostPlodina"/></label><br>`+
                `<label>Poznámka: <input type="text" id="udalostPoznamka"/></label><br>`+
                `<button onclick="ulozUdalost('${typ}')">Uložit</button>`;
}
function zpetNaDetailZahonu() {
  document.getElementById("modalViewDefault").style.display = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  setActiveIcon(null);
}
function ulozUdalost(typ) {
  const d = document.getElementById("udalostDatum").value;
  const p = document.getElementById("udalostPlodina").value;
  const n = document.getElementById("udalostPoznamka").value;
  alert(`Ukládám ${typ}: ${d}, ${p}, ${n}`);
  zpetNaDetailZahonu();
}

// ----------------------
// Zobrazení seznamu událostí
// ----------------------
function zobrazUdalosti(zahonID) {
  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${zahonID}`)
    .then(r=>r.json())
    .then(arr=>{
      const c = document.getElementById("udalostSeznamContainer");
      c.innerHTML = "";
      if (!arr.length) {
        c.textContent = "Žádné události.";
        return;
      }
      arr.forEach(u => {
        const d = document.createElement("div");
        d.className = "udalost-item";
        d.innerHTML = `
          <strong>${u.Typ}</strong> (${u.Datum})<br>
          ${u.Plodina||""} ${u.Hnojivo||""}<br>
          Množství: ${u.Mnozstvi||"-"} kg<br>
          Výnos: ${u.Vynos||"-"} kg<br>
          <em>${u.Poznamka||""}</em><br>
          <button onclick="smazUdalost(${u.UdalostID},${zahonID})">🗑️</button>
        `;
        c.appendChild(d);
      });
    })
    .catch(e=>console.error("Chyba načtení událostí:",e));
}

function smazUdalost(udalostID,zID) {
  const p = new URLSearchParams();
  p.append("action","deleteUdalost");
  p.append("udalostID",udalostID);
  fetch(SERVER_URL,{method:"POST",body:p})
    .then(r=>r.text())
    .then(txt=>{
      if(txt.trim()==="OK") zobrazUdalosti(zID);
      else alert("Chyba při mazání události: "+txt);
    })
    .catch(e=>console.error("Chyba smazUdalost:",e));
}

// ----------------------
// Vizualizace záhonu
// ----------------------
function nakresliZahonCanvas(delka,sirka) {
  const cont = document.getElementById("zahonVizualizace");
  cont.innerHTML = "";
  const cv = document.createElement("canvas");
  cv.width = cv.height = 200;
  const ctx = cv.getContext("2d");
  const scale = Math.min(200/(delka||1), 200/(sirka||1));
  const w = (delka||1)*scale, h = (sirka||1)*scale;
  ctx.fillStyle = "#c2b280";
  ctx.fillRect((200-w)/2,(200-h)/2,w,h);
  cont.appendChild(cv);
}