const proxyUrl = "/.netlify/functions/proxy";
let userID = null;

function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const params = new URLSearchParams();
    params.append("action", "login");
    params.append("username", username);
    params.append("password", password);

    fetch(proxyUrl + "?" + params)
        .then(async res => {
            if (!res.ok) {
                const text = await res.text();
                throw new Error("Chybná odpověď z proxy: " + text);
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                userID = data.userID;
                document.getElementById("loginDiv").style.display = "none";
                document.getElementById("appDiv").style.display = "block";
                loadZahony();
            } else {
                document.getElementById("loginMsg").innerText = "Neplatné přihlášení.";
            }
        })
        .catch(err => {
            console.error("Chyba při přihlašování:", err);
            document.getElementById("loginMsg").innerText = "Chyba na serveru.";
        });
}

function loadZahony() {
    const params = new URLSearchParams();
    params.append("action", "getZahony");
    params.append("userID", userID);

    fetch(proxyUrl + "?" + params)
        .then(async res => {
            if (!res.ok) {
                const text = await res.text();
                throw new Error("Chybná odpověď z proxy: " + text);
            }
            return res.json();
        })
        .then(data => {
            const tbody = document.querySelector("#zahonyTable tbody");
            tbody.innerHTML = "";
            data.forEach(zahon => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${zahon.ZahonID}</td>
                    <td>${zahon.NazevZahonu}</td>
                    <td>${zahon.Velikost_m2}</td>
                    <td><button onclick="deleteZahon(${zahon.ZahonID})">Smazat</button></td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => console.error("Chyba při načítání záhonů:", err));
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

function deleteZahon(zahonID) {
    const params = new URLSearchParams();
    params.append("action", "deleteZahon");
    params.append("ZahonID", zahonID);

    fetch(proxyUrl + "?" + params)
        .then(res => res.text())
        .then(() => loadZahony());
}
