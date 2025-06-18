const proxyUrl = "/.netlify/functions/proxy";
let userID = null;
let currentZahonID = null;

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

function logout() {
  userID = null;
  document.getElementById("appDiv").style.display = "none";
  document.getElementById("loginDiv").style.display = "block";
}

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
          <td onclick="editZahon(${zahon.ZahonID}, '${zahon.NazevZahonu}', ${zahon.Delka}, ${zahon.Sirka})">
            ${zahon.NazevZahonu}
          </td>
          <td>${zahon.Velikost_m2} m²</td>
        `;
        tbody.appendChild(tr);
      });
    });
}

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

function editZahon(id, nazev, delka, sirka) {
  currentZahonID = id;
  document.getElementById("editNazev").value = nazev;
  document.getElementById("editDelka").value = delka;
  document.getElementById("editSirka").value = sirka;
  updatePlocha();
  document.getElementById("modal").style.display = "flex";
}

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

function closeModal() {
  document.getElementById("modal").style.display = "none";
  currentZahonID = null;
}

function saveZahon() {
  const params = new URLSearchParams();
  params.append("action", "updateZahon");
  params.append("ZahonID", currentZahonID);
  params.append("NazevZahonu", document.getElementById("editNazev").value);
  params.append("Delka", document.getElementById("editDelka").value);
  params.append("Sirka", document.getElementById("editSirka").value);
  params.append("Velikost_m2", document.getElementById("vypocetPlochy").innerText);

  fetch(proxyUrl + "?" + params)
    .then(res => res.text())
    .then(() => {
      closeModal();
      loadZahony();
    });
}
let currentZahonID = null;
let currentTypUdalosti = "seti";

// Zobrazí formulář události
function showUdalostForm(typ) {
  currentTypUdalosti = typ;
  const container = document.getElementById("udalostFormContainer");
  container.innerHTML = "";

  let html = `
    <label>Datum:</label>
    <input type="date" id="udalostDatum"><br>
  `;

  if (typ === "seti") {
    html += `
      <label>Plodina:</label>
      <input type="text" id="udalostPlodina"><br>
    `;
  }

  if (typ === "hnojeni") {
    html += `
      <label>Hnojivo:</label>
      <input type="text" id="udalostHnojivo"><br>
      <label>Množství (kg):</label>
      <input type="number" id="udalostMnozstvi"><br>
    `;
  }

  if (typ === "sklizen") {
    html += `
      <label>Plodina:</label>
      <input type="text" id="udalostPlodina"><br>
      <label>Výnos (kg):</label>
      <input type="number" id="udalostVynos"><br>
    `;
  }

  html += `
    <label>Poznámka:</label>
    <textarea id="udalostPoznamka"></textarea><br>
    <button onclick="saveUdalost()">Uložit událost</button>
  `;

  container.innerHTML = html;
}

// Uloží událost
function saveUdalost() {
  const datum = document.getElementById("udalostDatum").value;
  const poznamka = document.getElementById("udalostPoznamka").value;

  let params = new URLSearchParams();
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

  fetch(proxyUrl + "?" + params.toString())
    .then(res => res.text())
    .then(() => {
      alert("Událost uložena.");
      document.getElementById("udalostFormContainer").innerHTML = "";
    })
    .catch(err => {
      console.error("Chyba při ukládání události:", err);
      alert("Chyba při ukládání události.");
    });
}

function zobrazUdalostForm(zahonID) {
  document.getElementById("udalostForm").style.display = "block";
  document.getElementById("udalostForm").setAttribute("data-zahonid", zahonID);
  nactiPlodiny();
  nactiHnojiva();
}

function handleTypChange() {
  const typ = document.getElementById("udalostTyp").value;

  document.getElementById("udalostPlodinaDiv").style.display = (typ === "seti") ? "block" : "none";
  document.getElementById("udalostHnojivoDiv").style.display = (typ === "hnojeni") ? "block" : "none";
  document.getElementById("udalostVynosDiv").style.display = (typ === "sklizen") ? "block" : "none";
}

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

function ulozUdalost() {
  const zahonID = document.getElementById("udalostForm").getAttribute("data-zahonid");
  const typ = document.getElementById("udalostTyp").value;
  const datum = document.getElementById("udalostDatum").value;
  const plodina = document.getElementById("udalostPlodina").value;
  const hnojivo = document.getElementById("udalostHnojivo").value;
  const mnozstvi = document.getElementById("udalostMnozstvi").value;
  const vynos = document.getElementById("udalostVynos").value;
  const poznamka = document.getElementById("udalostPoznamka").value;

  const params = new URLSearchParams();
  params.append("action", "addUdalost");
  params.append("zahonID", zahonID);
  params.append("typ", typ);
  params.append("datum", datum);
  params.append("plodina", typ === "seti" ? plodina : "");
  params.append("hnojivo", typ === "hnojeni" ? hnojivo : "");
  params.append("mnozstvi", typ === "hnojeni" ? mnozstvi : "");
  params.append("vynos", typ === "sklizen" ? vynos : "");
  params.append("poznamka", poznamka);

  fetch(proxyUrl + "?" + params)
    .then(res => res.text())
    .then(() => {
      alert("Událost uložena.");
      document.getElementById("udalostForm").reset();
      document.getElementById("udalostForm").style.display = "none";
    });
}

function showUdalostForm(typ) {
  const container = document.getElementById("udalostFormContainer");
  container.innerHTML = ""; // Vyčisti obsah

  let html = `<p><strong>${typ.charAt(0).toUpperCase() + typ.slice(1)}</strong></p>`;
  html += `<input type="date" id="udalostDatum" /><br/>`;

  if (typ === "seti") {
    html += `<input type="text" id="udalostPlodina" placeholder="Plodina" />`;
  } else if (typ === "hnojeni") {
    html += `<input type="text" id="udalostHnojivo" placeholder="Hnojivo" />`;
    html += `<input type="number" id="udalostMnozstvi" placeholder="Množství (kg)" />`;
  } else if (typ === "sklizen") {
    html += `<input type="text" id="udalostPlodina" placeholder="Plodina" />`;
    html += `<input type="number" id="udalostVynos" placeholder="Výnos (kg)" />`;
  }

  html += `<textarea id="udalostPoznamka" placeholder="Poznámka"></textarea>`;
  html += `<button onclick="saveUdalost('${typ}')">Uložit ${typ}</button>`;

  container.innerHTML = html;
}

