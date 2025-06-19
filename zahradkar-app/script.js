// - Dynamické <select> pro plodiny a hnojiva
// - Výpis a mazání událostí pro konkrétní záhon

const SERVER_URL = 'https://script.google.com/macros/s/AKfycby_trvEYUb8kJj5Qofs05lAysLbdhcUdvivusjUohNz2MqfEEHupvFeq8-FoIT77mu_/exec';

let aktualniZahon = null;

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const response = await fetch(SERVER_URL + "?action=login", {
    method: "POST",
    body: new URLSearchParams({ username, password })
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem("userID", data.userID);
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    loadZahony();
  } else {
    document.getElementById("loginMsg").innerText = "Neplatné přihlašovací údaje.";
  }
}

function logout() {
  localStorage.removeItem("userID");
  document.getElementById("loginDiv").style.display = "block";
  document.getElementById("appDiv").style.display = "none";
}

function loadZahony() {
  const userID = localStorage.getItem("userID");
  if (!userID) return;

  fetch(`${SERVER_URL}?action=getZahony&userID=${userID}`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#zahonyTable tbody");
      tbody.innerHTML = "";

      data.forEach(z => {
        const row = document.createElement("tr");

        const check = document.createElement("input");
        check.type = "checkbox";
        check.dataset.id = z.ZahonID;

        const nameLink = document.createElement("a");
        nameLink.href = "#";
        nameLink.textContent = z.NazevZahonu;
        nameLink.onclick = () => otevriModal(z);

      const plocha = z.Velikost_m2 || (z.Delka * z.Sirka).toFixed(2);
sizeCell.textContent = `${Plocha} m²`;


        row.innerHTML = `
          <td></td>
          <td></td>
          <td>${z.Velikost_m2 || "-"} m²</td>

        `;
        row.children[0].appendChild(check);
        row.children[1].appendChild(nameLink);

        tbody.appendChild(row);
      });
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

  fetch(SERVER_URL, {
    method: "POST",
    body: formData
  })
    .then(r => r.text())
    .then(resp => {
      if (resp === "OK") {
        loadZahony();
      } else {
        alert("Chyba při přidávání záhonu.");
      }
    });
}

function otevriModal(zahon) {
  aktualniZahon = zahon;
  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka;
  document.getElementById("editSirka").value = zahon.Sirka;

  const canvas = document.getElementById("zahonCanvas");
  const ctx = canvas.getContext("2d");
  const width = 200;
  const ratio = zahon.Sirka / zahon.Delka;
  canvas.width = width;
  canvas.height = width * ratio;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#d2b48c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  document.getElementById("modal").style.display = "block";
  loadPlodiny();
  loadHnojiva();
  zobrazUdalosti(zahon.ZahonID);
}

function closeModal() {
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}

function saveZahon() {
  const nazev = document.getElementById("editNazev").value;
  const delka = parseFloat(document.getElementById("editDelka").value) || 0;
  const sirka = parseFloat(document.getElementById("editSirka").value) || 0;

  if (!nazev || delka <= 0 || sirka <= 0) {
    alert("Vyplňte správně název, délku a šířku.");
    return;
  }

  const data = new URLSearchParams();
  data.append("action", "updateZahon");
  data.append("ZahonID", aktualniZahon.ZahonID);
  data.append("NazevZahonu", nazev);
  data.append("Delka", delka);
  data.append("Sirka", sirka);

  fetch(SERVER_URL, {
    method: "POST",
    body: data
  })
    .then(r => r.text())
    .then(res => {
      if (res === "OK") {
        alert("Záhon uložen.");
        closeModal();
        loadZahony();
      } else {
        alert("Chyba při ukládání: " + res);
      }
    });
}

function loadPlodiny() {
  fetch(SERVER_URL + "?action=getPlodiny")
    .then(r => r.json())
    .then(data => {
      const select = document.getElementById("plodinaSelect");
      if (!select) return;
      select.innerHTML = "";
      data.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.nazev;
        opt.textContent = p.nazev;
        select.appendChild(opt);
      });
    });
}

function loadHnojiva() {
  fetch(SERVER_URL + "?action=getHnojiva")
    .then(r => r.json())
    .then(data => {
      const select = document.getElementById("hnojivoSelect");
      if (!select) return;
      select.innerHTML = "";
      data.forEach(h => {
        const opt = document.createElement("option");
        opt.value = h.nazev;
        opt.textContent = h.nazev;
        select.appendChild(opt);
      });
    });
}

function zobrazUdalosti(zahonID) {
  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${zahonID}`)
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById("udalostSeznamContainer");
      container.innerHTML = "";
      if (data.length === 0) {
        container.textContent = "Žádné události.";
        return;
      }
      data.forEach(u => {
        const div = document.createElement("div");
        div.className = "udalost-item";
        div.innerHTML = `
          <strong>${u.Typ}</strong> (${u.Datum})<br>
          ${u.Plodina || ""} ${u.Hnojivo || ""}<br>
          Množství: ${u.Mnozstvi || "-"} kg<br>
          Výnos: ${u.Vynos || "-"} kg<br>
          <em>${u.Poznamka || ""}</em><br>
          <button onclick="smazUdalost(${u.UdalostID}, ${zahonID})">🗑️ Smazat</button>
        `;
        container.appendChild(div);
      });
    });
}

function smazUdalost(udalostID, zahonID) {
  const data = new URLSearchParams();
  data.append("action", "deleteUdalost");
  data.append("udalostID", udalostID);

  fetch(SERVER_URL, {
    method: "POST",
    body: data
  })
    .then(r => r.text())
    .then(resp => {
      if (resp === "OK") {
        zobrazUdalosti(zahonID);
      } else {
        alert("Chyba při mazání.");
      }
    });
}

