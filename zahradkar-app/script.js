const proxyUrl = "/.netlify/functions/proxy";
let userID = null;
let currentZahonID = null;
let currentTypUdalosti = "seti";

function login() {
const username = document.getElementById("username").value;
const password = document.getElementById("password").value;

const params = new URLSearchParams({ action: "login", username, password });

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
fetch(proxyUrl + "?action=getZahony&userID=" + userID)
.then(res => res.json())
.then(data => {
const tbody = document.querySelector("#zahonyTable tbody");
tbody.innerHTML = "";
data.forEach(z => {
const tr = document.createElement("tr");
tr.innerHTML = <td><input type="checkbox" class="zahonCheckbox" data-id="${z.ZahonID}"></td> <td onclick="editZahon(${z.ZahonID}, '${z.NazevZahonu}', ${z.Delka}, ${z.Sirka})">${z.NazevZahonu}</td> <td>${z.Velikost_m2} m²</td> ;
tbody.appendChild(tr);
});
});
}

function addZahon() {
const nazev = document.getElementById("newNazev").value;
const velikost = document.getElementById("newVelikost").value;

const params = new URLSearchParams({
action: "addZahon",
userID,
NazevZahonu: nazev,
Velikost_m2: velikost
});

fetch(proxyUrl + "?" + params)
.then(() => {
document.getElementById("newNazev").value = "";
document.getElementById("newVelikost").value = "";
loadZahony();
});
}

function deleteSelected() {
document.querySelectorAll(".zahonCheckbox:checked").forEach(cb => {
const zahonID = cb.dataset.id;
fetch(proxyUrl + "?action=deleteZahon&ZahonID=" + zahonID)
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
showUdalosti(); // zobraz seznam událostí
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

function saveZahon() {
const params = new URLSearchParams({
action: "updateZahon",
ZahonID: currentZahonID,
NazevZahonu: document.getElementById("editNazev").value,
Velikost_m2: document.getElementById("vypocetPlochy").innerText,
Delka: document.getElementById("editDelka").value,
Sirka: document.getElementById("editSirka").value
});

fetch(proxyUrl + "?" + params)
.then(() => {
closeModal();
loadZahony();
});
}

function closeModal() {
document.getElementById("modal").style.display = "none";
document.getElementById("udalostFormContainer").innerHTML = "";
document.getElementById("udalostListContainer").innerHTML = "";
currentZahonID = null;
}

function showUdalostForm(typ) {
currentTypUdalosti = typ;
const c = document.getElementById("udalostFormContainer");
c.innerHTML = "";

let html = <label>Datum:</label><input type="date" id="udalostDatum"><br>;

if (typ === "seti") {
html += <label>Plodina:</label><select id="udalostPlodina"></select><br>;
loadSelect("getPlodiny", "udalostPlodina");
}
if (typ === "hnojeni") {
html += <label>Hnojivo:</label><select id="udalostHnojivo"></select><br>;
html += <label>Množství (kg):</label><input type="number" id="udalostMnozstvi"><br>;
loadSelect("getHnojiva", "udalostHnojivo");
}
if (typ === "sklizen") {
html += <label>Plodina:</label><select id="udalostPlodina"></select><br>;
html += <label>Výnos (kg):</label><input type="number" id="udalostVynos"><br>;
loadSelect("getPlodiny", "udalostPlodina");
}

html += <label>Poznámka:</label><textarea id="udalostPoznamka"></textarea><br>;
html += <button onclick="saveUdalost()">Uložit událost</button>;
c.innerHTML = html;
}

function loadSelect(action, selectID) {
fetch(proxyUrl + "?action=" + action)
.then(res => res.json())
.then(data => {
const sel = document.getElementById(selectID);
sel.innerHTML = "";
data.forEach(item => {
const opt = document.createElement("option");
opt.value = item.nazev;
opt.textContent = item.nazev;
sel.appendChild(opt);
});
});
}

function saveUdalost() {
const datum = document.getElementById("udalostDatum").value;
const poznamka = document.getElementById("udalostPoznamka").value;
const params = new URLSearchParams({
action: "addUdalost",
zahonID: currentZahonID,
typ: currentTypUdalosti,
datum,
poznamka
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

fetch(proxyUrl + "?" + params)
.then(() => {
alert("Událost uložena.");
showUdalostForm(currentTypUdalosti);
showUdalosti();
});
}

function showUdalosti() {
const container = document.getElementById("udalostListContainer");
container.innerHTML = "<p>Načítání...</p>";
fetch(proxyUrl + "?action=getUdalosti&zahonID=" + currentZahonID)
.then(res => res.json())
.then(data => {
if (data.length === 0) {
container.innerHTML = "<p>Žádné události.</p>";
return;
}
let html = "<ul>";
data.forEach(u => {
html += <li>${u.Datum} – ${u.Typ.toUpperCase()} – ${u.Plodina || u.Hnojivo || ""} <button onclick="deleteUdalost(${u.UdalostID})">🗑️</button></li>;
});
html += "</ul>";
container.innerHTML = html;
});
}

function deleteUdalost(id) {
fetch(proxyUrl + "?action=deleteUdalost&udalostID=" + id)
.then(() => {
showUdalosti();
});
}
