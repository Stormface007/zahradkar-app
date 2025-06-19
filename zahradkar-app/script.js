// - Dynamické <select> pro plodiny a hnojiva
// - Výpis a mazání událostí pro konkrétní záhon

const SERVER_URL = 'https://script.google.com/macros/s/AKfycbwjdWV6J04OJQ4VHxqL5YKKb81DJ5jGbEVs_CX5-3TbWSHD4s0mzMpGAQsz5pAiUXE/exec'; // ← ZDE NAHRAĎ svou skutečnou URL

let aktualniZahon = null;

// ✅ LOGIN
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const response = await fetch(SERVER_URL + "?action=login", {
    method: "POST",
    body: new URLSearchParams({
      username,
      password
    })
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem("userID", data.userID);
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    loadZahony(); // ← tato funkce musí být definovaná níže
  } else {
    document.getElementById("loginMsg").innerText = "Neplatné přihlašovací údaje.";
  }
}

// ✅ Uložení záhonu
function saveZahon() {
  const nazev = document.getElementById("editNazev").value;
  const delka = parseFloat(document.getElementById("editDelka").value) || 0;
  const sirka = parseFloat(document.getElementById("editSirka").value) || 0;

  if (!nazev || delka <= 0 || sirka <= 0) {
    alert("Vyplňte správně název, délku a šířku záhonu.");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "updateZahon");
  formData.append("ZahonID", aktualniZahon.ZahonID);
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
        alert("Záhon uložen.");
        closeModal();
        loadZahony();
      } else {
        alert("Chyba při ukládání: " + resp);
      }
    });
}

// ✅ Načti plodiny do <select>
function loadPlodiny() {
  fetch(SERVER_URL + "?action=getPlodiny")
    .then(r => r.json())
    .then(data => {
      const select = document.getElementById("plodinaSelect");
      if (!select) return;
      select.innerHTML = "";
      data.forEach(pl => {
        const opt = document.createElement("option");
        opt.value = pl.nazev;
        opt.textContent = pl.nazev;
        select.appendChild(opt);
      });
    });
}

// ✅ Načti hnojiva do <select>
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

// ✅ Zobraz události
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

// ✅ Smazání události
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
