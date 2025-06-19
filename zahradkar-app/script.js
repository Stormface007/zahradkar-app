// - Dynamické <select> pro plodiny a hnojiva
// - Výpis a mazání událostí pro konkrétní záhon

const SERVER_URL = 'https://script.google.com/macros/s/AKfycbwjdWV6J04OJQ4VHxqL5YKKb81DJ5jGbEVs_CX5-3TbWSHD4s0mzMpGAQsz5pAiUXE/exec'; // ← ZDE NAHRAĎ svou skutečnou URL

let aktualniZahon = null;

// Přihlášení uživatele
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

// Načíst záhony uživatele
function loadZahony() {
const userID = localStorage.getItem("userID");
if (!userID) return;

fetch(${SERVER_URL}?action=getZahony&userID=${userID})
.then(res => res.json())
.then(data => {
const tbody = document.querySelector("#zahonyTable tbody");
tbody.innerHTML = "";

pgsql
Zkopírovat
Upravit
  data.forEach(z => {
    const row = document.createElement("tr");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.dataset.id = z.ZahonID;

    const nameLink = document.createElement("a");
    nameLink.href = "#";
    nameLink.textContent = z.NazevZahonu;
    nameLink.onclick = () => otevriModal(z);

    row.innerHTML = `
      <td></td>
      <td></td>
      <td>${z.Velikost_m2} m²</td>
    `;
    row.children[0].appendChild(check);
    row.children[1].appendChild(nameLink);

    tbody.appendChild(row);
  });
});
}

// Otevře modal pro úpravu záhonu
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
ctx.fillStyle = "#d2b48c"; // světle hnědá
ctx.fillRect(0, 0, canvas.width, canvas.height);

document.getElementById("modal").style.display = "block";
loadPlodiny();
loadHnojiva();
zobrazUdalosti(zahon.ZahonID);
}

// Zavře modal
function closeModal() {
aktualniZahon = null;
document.getElementById("modal").style.display = "none";
}

// Uloží záhon
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

// Načte plodiny do <select>
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

// Načte hnojiva do <select>
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

// Načti a zobraz události
function zobrazUdalosti(zahonID) {
fetch(${SERVER_URL}?action=getZahonUdalosti&zahonID=${zahonID})
.then(r => r.json())
.then(data => {
const container = document.getElementById("udalostSeznamContainer");
container.innerHTML = "";
if (data.length === 0) {
container.textContent = "Žádné události.";
return;
}

javascript
Zkopírovat
Upravit
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

// Smazání události
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
