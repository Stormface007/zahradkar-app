const proxyUrl = "/.netlify/functions/proxy";
let userID = null;
let currentZahonID = null;
let currentTypUdalosti = "seti";

// LOGIN
function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const params = new URLSearchParams();
  params.append("action", "login");
  params.append("username", username);
  params.append("password", password);

  fetch(proxyUrl + "?" + params)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        userID = data.userID;
        document.getElementById("loginDiv").style.display = "none";
        document.getElementById("appDiv").style.display = "block";
        loadZahony();
      } else {
        document.getElementById("loginMsg").innerText = "Neplatné přihlášení.";
      }
    });
}

// ODHLÁŠENÍ
function logout() {
  userID = null;
  document.getElementById("appDiv").style.display = "none";
  document.getElementById("loginDiv").style.display = "block";
}

// NAČTENÍ ZÁHONŮ
function loadZahony() {
  const params = new URLSearchParams();
  params.append("action", "getZahony");
  params.append("userID", userID);

  fetch(proxyUrl + "?" + params)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#zahonyTable tbody");
      tbody.innerHTML = "";
      data.forEach(zahon => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><input type="checkbox" class="zahonCheckbox" data-id="${zahon.ZahonID}"></td>
          <td onclick="editZahon(${zahon.ZahonID}, '${zahon.NazevZahonu}', ${zahon.Delka_m}, ${zahon.Sirka_m})">
            ${zahon.NazevZahonu}
          </td>
          <td>${zahon.Velikost_m2} m²</td>
        `;
        tbody.appendChild(tr);
      });
    });
}

// PŘIDÁNÍ NOVÉHO ZÁHONU
function addZahon() {
  const nazev = document.getElementById("newNazev").value;
  const velikost = document.getElementById("newVelikost").value;

  const params = new URLSearchParams();
  params.append("action", "addZahon");
  params.append("userID", userID);
  params.append("NazevZahonu", nazev);
  params.append("Velikost_m2", velikost);

  fetch(proxyUrl + "?" + params)
    .then(res => res.text())
    .then(() => {
      document.getElementById("newNazev").value = "";
      document.getElementById("newVelikost").value = "";
      loadZahony();
    });
}

// SMAZÁNÍ VYBRANÝCH ZÁHONŮ
function deleteSelected() {
  const checkboxes = document.querySelectorAll(".zahonCheckbox:checked");
  checkboxes.forEach(cb => {
    const zahonID = cb.getAttribute("data-id");
    const params = new URLSearchParams();
    params.append("action", "deleteZahon");
    params.append("ZahonID", zahonID);

    fetch(proxyUrl + "?" + params)
      .then(res => res.text())
      .then(() => loadZahony());
  });
}

// ÚPRAVA ZÁHONU
function editZahon(id, nazev, delka, sirka) {
  currentZahonID = id;
  document.getElementById("editNazev").value = nazev;
  document.getElementById("editDelka").value = delka;
  document.getElementById("editSirka").value = sirka;
  updatePlocha();
  document.getElementById("modal").style.display = "flex";
  loadUdalostiForZahon(id);
}

// VÝPOČET A VIZUALIZACE PLOCHY
function updatePlocha() {
  const d = parseFloat(document.getElementById("editDelka").value) || 0;
  const s = parseFloat(document.getElementById("editSirka").value) || 0;
  const plocha = d * s;
  document.getElementById("vypocetPlochy").innerText = plocha.toFixed(2);

  const viz = document.getElementById("zahonVizualizace");
  const scale = 200 / Math.max(d, s || 1);
  viz.style.width = (s * scale) + "px";
  viz.style.height = (d * scale) + "px";
}

// ZAVŘENÍ MODÁLU
function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("udalostFormContainer").innerHTML = "";
  document.getElementById("udalostSeznamContainer").innerHTML = "";
  currentZahonID = null;
}

// ULOŽENÍ ZÁHONU
function saveZahon() {
  const params = new URLSearchParams();
  params.append("action", "updateZahon");
  params.append("ZahonID", currentZahonID);
  params.append("NazevZahonu", document.getElementById("editNazev").value);
  params.append("Delka_m", document.getElementById("editDelka").value);
  params.append("Sirka_m", document.getElementById("editSirka").value);
  params.append("Velikost_m2", document.getElementById("vypocetPlochy").innerText);

  fetch(proxyUrl + "?" + params)
    .then(res => res.text())
    .then(() => {
      closeModal();
      loadZahony();
    });
}

// ZOBRAZENÍ FORMULÁŘE UDÁLOSTI
function showUdalostForm(typ) {
  currentTypUdalosti = typ;
  const container = document.getElementById("udalostFormContainer");
  container.innerHTML = "";

  let html = `<h4>${typ.charAt(0).toUpperCase() + typ.slice(1)}</h4>
    <label>Datum:</label><input type="date" id="udalostDatum"><br>`;

  if (typ === "seti" || typ === "sklizen") {
    html += `<label>Plodina:</label><select id="udalostPlodina"></select><br>`;
  }

  if (typ === "hnojeni") {
    html += `<label>Hnojivo:</label><select id="udalostHnojivo"></select><br>
             <label>Množství (kg):</label><input type="number" id="udalostMnozstvi"><br>`;
  }

  if (typ === "sklizen") {
    html += `<label>Výnos (kg):</label><input type="number" id="udalostVynos"><br>`;
  }

  html += `<label>Poznámka:</label><textarea id="udalostPoznamka"></textarea><br>
           <button onclick="saveUdalost()">Uložit událost</button>`;

  container.innerHTML = html;

  if (typ === "seti" || typ === "sklizen") nactiPlodiny();
  if (typ === "hnojeni") nactiHnojiva();
}

// ULOŽENÍ UDÁLOSTI
function saveUdalost() {
  const datum = document.getElementById("udalostDatum").value;
  const poznamka = document.getElementById("udalostPoznamka").value;
  const params = new URLSearchParams();
  params.append("action", "addUdalost");
  params.append("zahonID", currentZahonID);
  params.append("typ", currentTypUdalosti);
  params.append("datum", datum);
  params.append("poznamka", poznamka);

  if (currentTypUdalosti === "seti") {
    params.append("plodina", document.getElementById("udalostPlodina").value);
  }
  if (currentTypUdalosti === "hnojeni") {
    params.append("hnojivo", document.getElementById("udalostHnojivo").value);
    params.append("mnozstvi", document.getElementById("udalostMnozstvi").value);
  }
  if (currentTypUdalosti === "sklizen") {
    params.append("plodina", document.getElementById("udalostPlodina").value);
    params.append("vynos", document.getElementById("udalostVynos").value);
  }

  fetch(proxyUrl + "?" + params)
    .then(res => res.text())
    .then(() => {
      alert("Událost uložena.");
      showUdalostForm(currentTypUdalosti);
      loadUdalostiForZahon(currentZahonID);
    });
}

// NAČTI PLODINY
function nactiPlodiny() {
  fetch(proxyUrl + "?action=getPlodiny")
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById("udalostPlodina");
      select.innerHTML = "";
      data.forEach(p => {
        const option = document.createElement("option");
        option.value = p.nazev;
        option.textContent = p.nazev;
        select.appendChild(option);
      });
    });
}

// NAČTI HNOJIVA
function nactiHnojiva() {
  fetch(proxyUrl + "?action=getHnojiva")
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById("udalostHnojivo");
      select.innerHTML = "";
      data.forEach(h => {
        const option = document.createElement("option");
        option.value = h.nazev;
        option.textContent = h.nazev;
        select.appendChild(option);
      });
    });
}

// NAČTI EXISTUJÍCÍ UDÁLOSTI
function loadUdalostiForZahon(zahonID) {
  const params = new URLSearchParams();
  params.append("action", "getZahonUdalosti");
  params.append("zahonID", zahonID);

  fetch(proxyUrl + "?" + params)
    .then(res => res.json())
    .then(data => {
      const div = document.getElementById("udalostSeznamContainer");
      div.innerHTML = "<h4>Události</h4>";
      if (data.length === 0) {
        div.innerHTML += "<p>Žádné události</p>";
        return;
      }
      data.forEach(u => {
        div.innerHTML += `
          <div>
            <strong>${u.Typ}</strong> - ${u.Datum} – ${u.Plodina || u.Hnojivo || ""} 
            ${u.Mnozstvi_kg || u.Vynos_kg || ""} kg 
            <button onclick="deleteUdalost(${u.UdalostID})">❌</button>
          </div>
        `;
      });
    });
}

// SMAZAT UDÁLOST
function deleteUdalost(id) {
  const params = new URLSearchParams();
  params.append("action", "deleteUdalost");
  params.append("udalostID", id);

  fetch(proxyUrl + "?" + params)
    .then(res => res.text())
    .then(() => loadUdalostiForZahon(currentZahonID));
}