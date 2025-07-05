// ← Nahraďte svou URL
const SERVER_URL = "https://script.google.com/macros/s/AKfycby5Q582sTjMVzHDwInTpUQqQDbMMaZoAT90Lv1hEiB8rcRVs3XX21JUKYNmg16nYsGW/exec";

let aktualniZahon = null;

// — Indikátor akce (rotující mrkev) —
function showActionIndicator() {
  const images = [
    'Plodina_mrkev .png',
    'Plodina_rajce.png',
    'Plodina_petrzel_koren.png'
  ];
  const idx = Math.floor(Math.random() * images.length);
  document.querySelector('#actionIndicator img').src = `img/${images[idx]}`;
  document.getElementById('actionIndicator').classList.add('active');
}
function hideActionIndicator() {
  document.getElementById('actionIndicator').classList.remove('active');
}

// — Přihlášení / odhlášení —
async function login() {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  try {
    const res = await fetch(`${SERVER_URL}?action=login`, {
      method: "POST",
      body: new URLSearchParams({ username: u, password: p })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem("userID", data.userID);
      onLoginSuccess();
    } else {
      document.getElementById("loginMsg").innerText = "Neplatné přihlašovací údaje.";
    }
  } catch (err) {
    console.error("Login error:", err);
    document.getElementById("loginMsg").innerText = "Chyba při přihlášení.";
  }
}
function onLoginSuccess() {
  document.getElementById("loginDiv").style.display = "none";
  document.getElementById("appDiv").style.display   = "block";
  loadZahony();
  loadWeatherByGeolocation();
}
function logout() {
  localStorage.removeItem("userID");
  document.getElementById("appDiv").style.display   = "none";
  document.getElementById("loginDiv").style.display = "block";
}

// — Seznam záhonů —
function loadZahony() {
  const userID = localStorage.getItem("userID");
  if (!userID) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${userID}`)
    .then(r => r.json())
    .then(arr => {
      const tbody = document.querySelector("#zahonyTable tbody");
      tbody.innerHTML = "";
      arr.forEach(z => {
        const row = document.createElement("tr");
        // checkbox
        const td1 = document.createElement("td");
        const cb  = document.createElement("input");
        cb.type    = "checkbox";
        cb.value   = z.ZahonID;
        td1.appendChild(cb);
        // název + Freefield.png
        const td2 = document.createElement("td");
        const a   = document.createElement("a");
        a.href        = "#";
        a.className   = "zahon-link";
        a.onclick     = () => otevriModal(z);
        const ico = document.createElement("img");
        ico.src       = "img/Freefield.png";
        ico.className = "zahon-icon";
        a.appendChild(ico);
        a.appendChild(document.createTextNode(z.NazevZahonu));
        td2.appendChild(a);
        // plocha
        const plo = (z.Velikost_m2 != null)
          ? z.Velikost_m2
          : ((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        const td3 = document.createElement("td");
        td3.textContent = plo + " m²";
        row.append(td1, td2, td3);
        tbody.appendChild(row);
      });
    })
    .catch(e => console.error("Chyba načtení záhonů:", e));
}

// — Mazání / přidání záhonů —
function deleteSelected() {
  const checks = document.querySelectorAll("#zahonyTable tbody input:checked");
  if (!checks.length) return alert("Neoznačili jste žádný záhon.");
  showActionIndicator();
  Promise.all(Array.from(checks).map(cb => {
    const ps = new URLSearchParams();
    ps.append("action","deleteZahon");
    ps.append("ZahonID", cb.value);
    return fetch(SERVER_URL,{method:"POST",body:ps}).then(r=>r.text());
  }))
  .then(() => loadZahony())
  .finally(() => hideActionIndicator());
}
function addZahon() {
  const u = localStorage.getItem("userID");
  const n = document.getElementById("newNazev").value.trim();
  const d = parseFloat(document.getElementById("newDelka").value)||0;
  const s = parseFloat(document.getElementById("newSirka").value)||0;
  if (!n||d<=0||s<=0) return alert("Vyplňte správně název, délku i šířku.");
  showActionIndicator();
  const ps = new URLSearchParams();
  ps.append("action","addZahon"); ps.append("userID",u);
  ps.append("NazevZahonu",n);   ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{ if(txt.trim()==="OK") {
      ["newNazev","newDelka","newSirka"].forEach(id=>document.getElementById(id).value="");
      loadZahony();
    }})
    .finally(()=>hideActionIndicator());
}

// — Modální okno záhonu —
function otevriModal(zahon) {
  aktualniZahon = zahon;
  setActiveIcon(null);
  document.getElementById("editNazev").value = zahon.NazevZahonu;
  document.getElementById("editDelka").value = zahon.Delka||0;
  document.getElementById("editSirka").value = zahon.Sirka||0;
  updatePlocha();
  nakresliZahonCanvas(zahon.Delka, zahon.Sirka);
  document.getElementById("modalViewDefault").style.display  = "block";
  document.getElementById("modalViewUdalost").style.display = "none";
  document.getElementById("modal").style.display            = "flex";
}
function closeModal() {
  aktualniZahon = null;
  document.getElementById("modal").style.display = "none";
}

// — Úprava záhonu —
function updatePlocha() {
  const d = parseFloat(document.getElementById("editDelka").value)||0;
  const s = parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent = (d*s).toFixed(2);
}
function saveZahon() {
  const nazev = document.getElementById("editNazev").value.trim();
  const delka = parseFloat(document.getElementById("editDelka").value)||0;
  const sirka = parseFloat(document.getElementById("editSirka").value)||0;
  if (!nazev||delka<=0||sirka<=0){
    return alert("Vyplňte správně název, délku i šířku.");
  }
  showActionIndicator();
  const ps = new URLSearchParams();
  ps.append("action","updateZahon");
  ps.append("ZahonID",aktualniZahon.ZahonID);
  ps.append("NazevZahonu",nazev);
  ps.append("Delka",delka);
  ps.append("Sirka",sirka);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{ if(txt.trim()==="OK"){
      closeModal(); loadZahony();
    }})
    .catch(e=>alert("Chyba při ukládání: "+e))
    .finally(()=>hideActionIndicator());
}

// — Události / Analýza…
function loadPlodiny(){ /* … */ }
function showUdalostForm(typ){ /* … */ }
function ulozUdalost(typ){ /* … */ }
function showAnalysisForm(){ /* … */ }
function saveAnalysis(){ /* … */ }
function zpetNaDetailZahonu(){ /* … */ }
function setActiveIcon(active){ /* … */ }
function onIconClick(typ){ /* … */ }

// — Kreslení záhonu & zoom —
function nakresliZahonCanvas(d,s){ /* … */ }
function openZoom(d,s){ /* … */ }
function closeZoom(){ /* … */ }

// — Počasí (wttr.in) —
function loadWeatherByGeolocation(){
  const ic = document.getElementById("weatherIcon");
  const tm = document.getElementById("weatherTemp");
  if(!navigator.geolocation){ tm.textContent="–"; return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude:lat,longitude:lon}=pos.coords;
    fetch(`https://wttr.in/${lat},${lon}?format=j1`)
      .then(r=>r.json())
      .then(data=>{
        const cur = data.current_condition[0];
        ic.src = cur.weatherIconUrl[0].value;
        ic.alt = cur.weatherDesc[0].value;
        tm.textContent = `${cur.temp_C} °C`;
      })
      .catch(e=>{ console.error("Počasí:",e); tm.textContent="–"; });
  },err=>{ console.warn("Geolokace selhala:",err); tm.textContent="–"; });
}

// — Auto-login při načtení stránky —
document.addEventListener("DOMContentLoaded", () => {
  // zoom-modální tlačítko zavřít
  const zm = document.getElementById("zoomModal");
  if (zm) zm.querySelector("button").addEventListener("click", closeZoom);
  // pokud je v localStorage userID, rovnou přihlásit
  if (localStorage.getItem("userID")) {
    onLoginSuccess();
  }
});