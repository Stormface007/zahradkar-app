const proxyUrl = "/.netlify/functions/proxy";
let userID = null;
let currentZahonID = null;
let currentTypUdalosti = "seti";

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

function deleteSelected() {
  const checkboxes = document.querySelectorAll(".zahonCheckbox:checked");
  checkboxes.forEach(cb => {
    const zahonID = cb.getAttribute("data-id");
    const params = new URLSearchParams();
    params.append("action", "deleteZahon");
    params.append("ZahonID", zahonID);

    fetch(proxyUrl + "?" + params)
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
  nactiUdalosti(); // načíst události při otevření
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
  document.getElementById("udalostFormContainer").innerHTML = "";
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
    .then(() => {
      closeModal();
      loadZahony();
    });
}

// Formulář událostí
function showUdalostForm(typ) {
  const container = document.getElementById("udalostFormContainer");
  container.innerHTML = ""; // Vyčisti obsah

  let html = `<p><strong>${typ.charAt(0).toUpperCase() + typ.slice(1)}</strong></p>`;
  html += `<input type="date" id="udalostDatum" /><br/>`;

  if (typ === "seti" || typ === "sklizen") {
    html += `<label>Plodina:</label><select id="udalostPlodina"></select><br/>`;
    nactiPlodiny();
  }

  if (typ === "hnojeni") {
    html += `<label>Hnojivo:</label><select id="udalostHnojivo"></select><br/>`;
    html += `<label>Množství (kg):</label><input type="number" id="udalostMnozstvi" /><br/>`;
    nactiHnojiva();
  }

  if (typ === "sklizen") {
    html += `<label>Výnos (kg):</label><input type="number" id="udalostVynos" /><br/>`;
  }

  html += `<label>Poznámka:</label><textarea id="udalostPoznamka"></textarea><br/>`;
  html += `<button onclick="saveUdalost()">Uložit událost</button>`;

  container.innerHTML = html;
}

function nactiPlodinySelect(id) {
  fetch(proxyUrl + "?action=getPlodiny")
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById(id);
      data.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.nazev;
        opt.textContent = p.nazev;
        select.appendChild(opt);
      });
    });
}

function nactiHnojivaSelect(id) {
  fetch(proxyUrl + "?action=getHnojiva")
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById(id);
      data.forEach(h => {
        const opt = document.createElement("option");
        opt.value = h.nazev;
        opt.textContent = h.nazev;
        select.appendChild(opt);
      });
    });
}

function saveUdalost() {
  const params = new URLSearchParams();
  params.append("action", "addUdalost");
  params.append("zahonID", currentZahonID);
  params.append("typ", currentTypUdalosti);
  params.append("datum", document.getElementById("udalostDatum").value);
  params.append("poznamka", document.getElementById("udalostPoznamka").value);

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
    .then(() => {
      alert("Událost uložena.");
      showUdalostForm(currentTypUdalosti);
      nactiUdalosti();
    });
}
function loadUdalosti() {
  const params = new URLSearchParams();
  params.append("action", "getUdalosti");
  params.append("zahonID", currentZahonID);

  fetch(proxyUrl + "?" + params)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("udalostSeznamContainer");
      container.innerHTML = "<h4>Události</h4>";
      if (data.length === 0) {
        container.innerHTML += "<p>Žádné události.</p>";
        return;
      }

      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>Typ</th>
            <th>Datum</th>
            <th>Plodina</th>
            <th>Hnojivo</th>
            <th>Množství</th>
            <th>Výnos</th>
            <th>Poznámka</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      data.forEach(udalost => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${udalost.typ}</td>
          <td>${udalost.datum}</td>
          <td>${udalost.plodina || ""}</td>
          <td>${udalost.hnojivo || ""}</td>
          <td>${udalost.mnozstvi || ""}</td>
          <td>${udalost.vynos || ""}</td>
          <td>${udalost.poznamka || ""}</td>
          <td><button onclick="deleteUdalost(${udalost.id})">❌</button></td>
        `;
        table.querySelector("tbody").appendChild(row);
      });

      container.appendChild(table);
    });
}

function deleteUdalost(id) {
  if (!confirm("Opravdu chcete smazat tuto událost?")) return;

  const params = new URLSearchParams();
  params.append("action", "deleteUdalost");
  params.append("udalostID", id);

  fetch(proxyUrl + "?" + params)
    .then(res => res.text())
    .then(() => {
      alert("Událost smazána.");
      loadUdalosti();
    });
}
function nactiUdalosti() {
  const params = new URLSearchParams();
  params.append("action", "getUdalosti");
  params.append("zahonID", currentZahonID);

  fetch(proxyUrl + "?" + params)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("udalostFormContainer");
      const wrapper = document.createElement("div");
      wrapper.innerHTML = "<h4>Existující události:</h4>";

      data.forEach(udalost => {
        const div = document.createElement("div");
        div.className = "udalostItem";
        div.innerHTML = `
          <strong>${udalost.typ.toUpperCase()}</strong> – ${udalost.datum}
          <button onclick="smazUdalost(${udalost.id})">🗑️</button>
        `;
        wrapper.appendChild(div);
      });

      container.appendChild(wrapper);
    });
}

function smazUdalost(id) {
  const params = new URLSearchParams();
  params.append("action", "deleteUdalost");
  params.append("udalostID", id);

  fetch(proxyUrl + "?" + params)
    .then(() => {
      nactiUdalosti();
    });
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