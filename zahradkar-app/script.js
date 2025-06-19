// - Dynamické <select> pro plodiny a hnojiva
// - Výpis a mazání událostí pro konkrétní záhon

const proxyUrl = "/.netlify/functions/proxy";
let userID = null;
let currentZahonID = null;
let currentTypUdalosti = "seti";

// Přihlášení
function login() {
const username = document.getElementById("username").value;
const password = document.getElementById("password").value;
const params = new URLSearchParams({ action: "login", username, password });

fetch(${proxyUrl}?${params})
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

// Odhlášení
function logout() {
userID = null;
document.getElementById("appDiv").style.display = "none";
document.getElementById("loginDiv").style.display = "block";
}

// Načti záhony
function loadZahony() {
const params = new URLSearchParams({ action: "getZahony", userID });
fetch(${proxyUrl}?${params})
.then(res => res.json())
.then(data => {
const tbody = document.querySelector("#zahonyTable tbody");
tbody.innerHTML = "";
data.forEach(zahon => {
const tr = document.createElement("tr");
tr.innerHTML = <td><input type="checkbox" class="zahonCheckbox" data-id="${zahon.ZahonID}"></td> <td onclick="editZahon(${zahon.ZahonID}, '${zahon.NazevZahonu}', ${zahon.Delka}, ${zahon.Sirka})"> ${zahon.NazevZahonu} </td> <td>${zahon.Velikost_m2} m²</td> ;
tbody.appendChild(tr);
});
});
}

// Přidání záhonu
function addZahon() {
const nazev = document.getElementById("newNazev").value;
const velikost = document.getElementById("newVelikost").value;

const params = new URLSearchParams({
action: "addZahon",
userID,
NazevZahonu: nazev,
Velikost_m2: velikost
});

fetch(${proxyUrl}?${params})
.then(() => {
document.getElementById("newNazev").value = "";
document.getElementById("newVelikost").value = "";
loadZahony();
});
}

// Smazání záhonů
function deleteSelected() {
const checkboxes = document.querySelectorAll(".zahonCheckbox:checked");
checkboxes.forEach(cb => {
const zahonID = cb.getAttribute("data-id");
const params = new URLSearchParams({ action: "deleteZahon", ZahonID: zahonID });

javascript
Zkopírovat
Upravit
fetch(`${proxyUrl}?${params}`)
  .then(() => loadZahony());
});
}

// Úprava záhonu
function editZahon(id, nazev, delka, sirka) {
currentZahonID = id;
document.getElementById("editNazev").value = nazev;
document.getElementById("editDelka").value = delka;
document.getElementById("editSirka").value = sirka;
updatePlocha();
showUdalostList(); // zobrazí existující události
document.getElementById("modal").style.display = "flex";
}

// Výpočet plochy a vizualizace
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

// Zavřít modální okno
function closeModal() {
document.getElementById("modal").style.display = "none";
currentZahonID = null;
document.getElementById("udalostFormContainer").innerHTML = "";
document.getElementById("udalostSeznamContainer").innerHTML = "";
}

// Uložit změny záhonu
function saveZahon() {
const params = new URLSearchParams({
action: "updateZahon",
ZahonID: currentZahonID,
NazevZahonu: document.getElementById("editNazev").value,
Delka: document.getElementById("editDelka").value,
Sirka: document.getElementById("editSirka").value
});

fetch(${proxyUrl}?${params})
.then(() => {
closeModal();
loadZahony();
});
}

// Zobrazí formulář události
function showUdalostForm(typ) {
currentTypUdalosti = typ;
const container = document.getElementById("udalostFormContainer");
container.innerHTML = "";

let html = <label>Datum:</label><input type="date" id="udalostDatum"><br>;

if (typ === "seti" || typ === "sklizen") {
html += <label>Plodina:</label><select id="udalostPlodina"></select><br>;
nactiPlodiny();
}

if (typ === "hnojeni") {
html += <label>Hnojivo:</label><select id="udalostHnojivo"></select><br>;
html += <label>Množství (kg):</label><input type="number" id="udalostMnozstvi"><br>;
nactiHnojiva();
}

if (typ === "sklizen") {
html += <label>Výnos (kg):</label><input type="number" id="udalostVynos"><br>;
}

html += <label>Poznámka:</label><textarea id="udalostPoznamka"></textarea><br> <button onclick="saveUdalost()">Uložit událost</button> ;

container.innerHTML = html;
}

// Načti plodiny do <select>
function nactiPlodiny() {
fetch(${proxyUrl}?action=getPlodiny)
.then(res => res.json())
.then(data => {
const select = document.getElementById("udalostPlodina");
if (!select) return;
select.innerHTML = "";
data.forEach(p => {
const option = document.createElement("option");
option.value = p.nazev;
option.textContent = p.nazev;
select.appendChild(option);
});
});
}

// Načti hnojiva do <select>
function nactiHnojiva() {
fetch(${proxyUrl}?action=getHnojiva)
.then(res => res.json())
.then(data => {
const select = document.getElementById("udalostHnojivo");
if (!select) return;
select.innerHTML = "";
data.forEach(h => {
const option = document.createElement("option");
option.value = h.nazev;
option.textContent = h.nazev;
select.appendChild(option);
});
});
}

// Uložit událost
function saveUdalost() {
const params = new URLSearchParams({
action: "addUdalost",
zahonID: currentZahonID,
typ: currentTypUdalosti,
datum: document.getElementById("udalostDatum").value,
poznamka: document.getElementById("udalostPoznamka").value
});

if (currentTypUdalosti === "seti" || currentTypUdalosti === "sklizen") {
params.append("plodina", document.getElementById("udalostPlodina").value);
}
if (currentTypUdalosti === "hnojeni") {
params.append("hnojivo", document.getElementById("udalostHnojivo").value);
params.append("mnozstvi", document.getElementById("udalostMnozstvi").value);
}
if (currentTypUdalosti === "sklizen") {
params.append("vynos", document.getElementById("udalostVynos").value);
}

fetch(${proxyUrl}?${params})
.then(() => {
alert("Událost uložena.");
showUdalostForm(currentTypUdalosti);
showUdalostList();
});
}

// Výpis událostí daného záhonu
function showUdalostList() {
const container = document.getElementById("udalostSeznamContainer");
container.innerHTML = "Načítám...";

fetch(${proxyUrl}?action=getZahonUdalosti&zahonID=${currentZahonID})
.then(res => res.json())
.then(data => {
if (data.length === 0) {
container.innerHTML = "<em>Žádné události</em>";
return;
}

javascript
Zkopírovat
Upravit
  let html = "<h4>Události:</h4><ul>";
  data.forEach(u => {
    html += `<li>
      <strong>${u.Typ}</strong> (${u.Datum}) – ${u.Plodina || u.Hnojivo || ""} 
      ${u.Mnozstvi ? `, ${u.Mnozstvi} kg` : ""} 
      ${u.Vynos ? `, výnos: ${u.Vynos} kg` : ""} 
      <button onclick="deleteUdalost(${u.UdalostID})">🗑️</button>
    </li>`;
  });
  html += "</ul>";
  container.innerHTML = html;
});
}

// Smazání události
function deleteUdalost(udalostID) {
if (!confirm("Opravdu smazat událost?")) return;

fetch(${proxyUrl}?action=deleteUdalost&udalostID=${udalostID})
.then(() => showUdalostList());
}
