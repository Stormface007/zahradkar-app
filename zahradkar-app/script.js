const SERVER_URL =
  "https://script.google.com/macros/s/AKfycbyGn2TAzvn4y0xd7I1fSluPxT5oBXVNgQ30Ln1Y2sdxdzpBjGvWKRw92SodvgwDZBXL/exec";

let aktualniZahon = null;

// ----------------------
// Přihlášení / odhlášení
// ----------------------
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  try {
    const response = await fetch(`${SERVER_URL}?action=login`, {
      method: "POST",
      body: new URLSearchParams({ username, password }),
    });
    const data = await response.json();
    if (data.success) {
      localStorage.setItem("userID", data.userID);
      document.getElementById("loginDiv").style.display = "none";
      document.getElementById("appDiv").style.display = "block";
      loadZahony();
    } else {
      document.getElementById("loginMsg").innerText =
        "Neplatné přihlašovací údaje.";
    }
  } catch (e) {
    console.error("Login error:", e);
    document.getElementById("loginMsg").innerText = "Chyba při přihlášení.";
  }
}

function logout() {
  localStorage.removeItem("userID");
  document.getElementById("loginDiv").style.display = "block";
  document.getElementById("appDiv").style.display = "none";
}

// ----------------------
// Práce se záhony
// ----------------------
function loadZahony() {
  const userID = localStorage.getItem("userID");
  if (!userID) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${userID}`)
    .then((r) => r.json())
    .then((data) => {
      const tbody = document.querySelector("#zahonyTable tbody");
      tbody.innerHTML = "";
      data.forEach((z) => {
        const row = document.createElement("tr");
        // checkbox
        const tdCheck = document.createElement("td");
        const check = document.createElement("input");
        check.type = "checkbox";
        check.dataset.id = z.ZahonID;
        tdCheck.appendChild(check);
        // název
        const tdName = document.createElement("td");
        const nameLink = document.createElement("a");
        nameLink.href = "#";
        nameLink.textContent = z.NazevZahonu;
        nameLink.onclick = () => otevriModal(z);
        tdName.appendChild(nameLink);
        // velikost
        const plocha = z.Velikost_m2
          ? z.Velikost_m2
          : ((z.Delka || 0) * (z.Sirka || 0)).toFixed(2);
        const tdSize = document.createElement("td");
        tdSize.textContent = `${plocha} m²`;
        row.appendChild(tdCheck);
        row.appendChild(tdName);
        row.appendChild(tdSize);
        tbody.appendChild(row);
      });
    })
    .catch((e) => console.error("Chyba načtení záhonů:", e));
}

function deleteSelected() {
  const checks = document.querySelectorAll(
    '#zahonyTable tbody input[type="checkbox"]:checked'
  );
  if (!checks.length) {
    console.warn("Žádné zaškrtnuté záhony k odstranění");
    return;
  }

  checks.forEach(cb => {
    // čteme přímo z data-id
    const zahonID = cb.dataset.id;
    console.log("Mazání záhonu ID:", zahonID);

    const params = new URLSearchParams();
    params.append("action", "deleteZahon");
    params.append("ZahonID", zahonID);

    fetch(SERVER_URL, {
      method: "POST",
      body: params
    })
    .then(res => res.text())
    .then(text => {
      console.log("Odezva deleteZahon:", text);
      if (text.trim() === "OK") {
        loadZahony();
      } else {
        console.error("Smazání neproběhlo OK, odpověď:", text);
      }
    })
    .catch(e => console.error("Chyba mazání záhonu:", e));
  });
}

function addZahon() {
  const userID = localStorage.getItem("userID");
  const nazev = document.getElementById("newNazev").value.trim();
  const delka = parseFloat(document.getElementById("newDelka").value) || 0;
  const sirka = parseFloat(document.getElementById("newSirka").value) || 0;
  if (!nazev || delka <= 0 || sirka <= 0) {
    alert("Vyplňte správně název, délku a šířku záhonu.");
    return;
  }
  const formData = new URLSearchParams();
  formData.append("action", "addZahon");
  formData.append("userID", userID);
  formData.append("NazevZahonu", nazev);
  formData.append("Delka", delka);
  formData.append("Sirka", sirka);
  fetch(SERVER_URL, { method: "POST", body: formData })
    .then((r) => r.text())
    .then((resp) => {
      if (resp === "OK") {
        document.getElementById("newNazev").value = "";
        document.getElementById("newDelka").value = "";
        document.getElementById("newSirka").value = "";
        loadZahony();
      } else {
        alert("Chyba při přidávání záhonu: " + resp);
      }
    })
    .catch((e) => console.error("Chyba addZahon:", e));
}

// ----------------------
// Modální okno
// ----------------------
function otevriModal(zahon) {
  aktualniZahon = zahon;
  // reset ikon
  setActiveIcon(null);
  // vyplnění polí
  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka || 0;
  document.getElementById("editSirka").value = zahon.Sirka || 0;
  updatePlocha();
  nakresliZahonCanvas(zahon.Delka, zahon.Sirka);
  // výchozí pohled
  document.getElementById("modalViewDefault").style.display = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modal").style.display = "flex";
}

function closeModal() {
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}

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
  const params = new URLSearchParams();
  params.append("action", "updateZahon");
  params.append("ZahonID", aktualniZahon.ZahonID);
  params.append("NazevZahonu", nazev);
  params.append("Delka", delka);
  params.append("Sirka", sirka);
  fetch(SERVER_URL, { method: "POST", body: params })
    .then((r) => r.text())
    .then((resp) => {
      if (resp === "OK") {
        alert("Záhon uložen.");
        closeModal();
        loadZahony();
      } else {
        alert("Chyba při ukládání záhonu: " + resp);
      }
    })
    .catch((e) => console.error("Chyba saveZahon:", e));
}

// ----------------------
// Plodiny / hnojiva
// ----------------------
function loadPlodiny() {
  fetch(`${SERVER_URL}?action=getPlodiny`)
    .then((r) => r.json())
    .then((data) => {
      const sel = document.getElementById("plodinaSelect");
      if (!sel) return;
      sel.innerHTML = "";
      data.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.nazev;
        opt.textContent = p.nazev;
        sel.appendChild(opt);
      });
    });
}

function loadHnojiva() {
  fetch(`${SERVER_URL}?action=getHnojiva`)
    .then((r) => r.json())
    .then((data) => {
      const sel = document.getElementById("hnojivoSelect");
      if (!sel) return;
      sel.innerHTML = "";
      data.forEach((h) => {
        const opt = document.createElement("option");
        opt.value = h.nazev;
        opt.textContent = h.nazev;
        sel.appendChild(opt);
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
  c.innerHTML = `<h4>${typ.charAt(0).toUpperCase() + typ.slice(1)}</h4>`;
  c.innerHTML += `
    <label>Datum: <input type="date" id="udalostDatum" /></label><br>
    <label>Plodina: <input type="text" id="udalostPlodina" /></label><br>
    <label>Poznámka: <input type="text" id="udalostPoznamka" /></label><br>
    <button onclick="ulozUdalost('${typ}')">Uložit</button>
  `;
}

function zpetNaDetailZahonu() {
  document.getElementById("modalViewDefault").style.display = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  setActiveIcon(null);
}

function ulozUdalost(typ) {
  const datum = document.getElementById("udalostDatum").value;
  const plodina = document.getElementById("udalostPlodina").value;
  const poznamka = document.getElementById("udalostPoznamka").value;
  alert(`Ukládám ${typ}: ${datum}, ${plodina}, ${poznamka}`);
  zpetNaDetailZahonu();
}

function zobrazUdalosti(zahonID) {
  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${zahonID}`)
    .then((r) => r.json())
    .then((data) => {
      const c = document.getElementById("udalostSeznamContainer");
      c.innerHTML = "";
      if (data.length === 0) { c.textContent = "Žádné události."; return; }
      data.forEach((u) => {
        const div = document.createElement("div");
        div.className = "udalost-item";
        div.innerHTML = `
          <strong>${u.Typ}</strong> (${u.Datum})<br>
          ${u.Plodina || ""} ${u.Hnojivo || ""}<br>
          Množství: ${u.Mnozstvi || "-"} kg<br>
          Výnos: ${u.Vynos || "-"} kg<br>
          <em>${u.Poznamka || ""}</em><br>
          <button onclick="smazUdalost(${u.UdalostID}, ${zahonID})">🗑️</button>
        `;
        c.appendChild(div);
      });
    })
    .catch((e) => console.error("Chyba načtení událostí:", e));
}

function smazUdalost(udalostID, zahonID) {
  const params = new URLSearchParams();
  params.append("action", "deleteUdalost");
  params.append("udalostID", udalostID);
  fetch(SERVER_URL, { method: "POST", body: params })
    .then((r) => r.text())
    .then((resp) => {
      if (resp === "OK") zobrazUdalosti(zahonID);
      else alert("Chyba mazání události: " + resp);
    })
    .catch((e) => console.error("Chyba smazUdalost:", e));
}

// ----------------------
// Boční ikony
// ----------------------
function onIconClick(typ) {
  setActiveIcon(typ);
  showUdalostForm(typ);
}
function setActiveIcon(activeTyp) {
  ['seti','hnojeni','sklizen'].forEach(t => {
    const el = document.getElementById(`icon-${t}`);
    if (!el) return;
    if (t === activeTyp) el.classList.add('active');
    else el.classList.remove('active');
  });
}

// ----------------------
// Vizualizace záhonu
// ----------------------
function nakresliZahonCanvas(delka, sirka) {
  const container = document.getElementById("zahonVizualizace");
  container.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  const scale = Math.min(canvas.width / (delka || 1), canvas.height / (sirka || 1));
  const w = (delka || 1) * scale;
  const h = (sirka || 1) * scale;
  ctx.fillStyle = "#c2b280";
  ctx.fillRect((canvas.width - w)/2, (canvas.height - h)/2, w, h);
  container.appendChild(canvas);
}
/**
 * Toto je vaše serverová funkce, která skutečně smaže řádek ze
 * sheetu „Zahony“. Volá ji klient s parametrem action=deleteZahon.
 */
function deleteZahon(e) {
  const zahonID = parseInt(e.parameter.ZahonID, 10);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Zahony");
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === zahonID) {
      sheet.deleteRow(i + 1);
      return ContentService
        .createTextOutput("OK")
        .setMimeType(ContentService.MimeType.TEXT);
    }
  }
  return ContentService
    .createTextOutput("Zahon not found")
    .setMimeType(ContentService.MimeType.TEXT);
}
