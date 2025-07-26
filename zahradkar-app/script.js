// URL vašeho Google Apps Scriptu
const SERVER_URL = "https://script.google.com/macros/s/AKfycbzIbLz5PiesOcF13vJFU84YBL7duwEMpoXJF9Ha8jxqrJBRAWiR8B8qnVhOeS3O1om3/exec";

let aktualniZahon = null;

// — Indikátor akce —
function showActionIndicator() {
  const imgs = ['Plodina_mrkev .png','Plodina_rajce.png','Plodina_petrzel_koren.png'];
  const idx = Math.floor(Math.random()*imgs.length);
  document.querySelector('#actionIndicator img').src = `img/${imgs[idx]}`;
  document.getElementById('actionIndicator').classList.add('active');
}
function hideActionIndicator() {
  document.getElementById('actionIndicator').classList.remove('active');
}

// — Login / Logout —
async function login() {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  try {
    const res = await fetch(`${SERVER_URL}?action=login`, {
      method:"POST",
      body:new URLSearchParams({username:u,password:p})
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem("userID",data.userID);
      onLoginSuccess();
    } else {
      document.getElementById("loginMsg").innerText="Neplatné údaje.";
    }
  } catch(err){
    console.error(err);
    document.getElementById("loginMsg").innerText="Chyba přihlášení.";
  }
}
function onLoginSuccess(){
  document.getElementById("loginDiv").style.display="none";
  document.getElementById("appDiv").style.display="block";
  loadZahony();
  loadWeatherByGeolocation();
}
function logout(){
  localStorage.removeItem("userID");
  document.getElementById("appDiv").style.display="none";
  document.getElementById("loginDiv").style.display="block";
}

// — Počasí podle geolokace —
function loadWeatherByGeolocation(){
  const ic = document.getElementById("weatherIcon");
  const tm = document.getElementById("weatherTemp");
  if(!navigator.geolocation){
    tm.textContent="–"; return;
  }
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude:lat,longitude:lon}=pos.coords;
    fetch(`https://wttr.in/${lat},${lon}?format=j1`)
      .then(r=>r.json())
      .then(d=>{
        const c = d.current_condition[0];
        ic.src = c.weatherIconUrl[0].value;
        ic.alt = c.weatherDesc[0].value;
        tm.textContent = `${c.temp_C} °C`;
      })
      .catch(e=>{console.error(e); tm.textContent="–";});
  },()=>{tm.textContent="–";});
}

// — Záhony —
function loadZahony(){
  const uid = localStorage.getItem("userID");
  if(!uid) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${uid}`)
    .then(r=>r.json())
    .then(arr=>{
      const tb = document.querySelector("#zahonyTable tbody");
      tb.innerHTML="";
      arr.forEach(z=>{
        const tr = document.createElement("tr");
        const td0 = `<td><input type="checkbox" value="${z.ZahonID}"></td>`;
        const ico = `<img src="img/Freefield.png" class="zahon-icon" alt="">`;
        const td1 = `<td><a href="#" class="zahon-link" onclick="otevriModal(${z.ZahonID},'${z.NazevZahonu}',${z.Delka},${z.Sirka},${z.Velikost_m2})">${ico}${z.NazevZahonu}</a></td>`;
        const td2 = `<td>${z.Velikost_m2} m²</td>`;
        tr.innerHTML = td0+td1+td2;
        tb.appendChild(tr);
      });
    });
}

function deleteSelected(){
  const checks = [...document.querySelectorAll("#zahonyTable tbody input:checked")];
  if(!checks.length) return alert("Neoznačeno.");
  showActionIndicator();
  Promise.all(checks.map(cb=>{
    const ps = new URLSearchParams();
    ps.append("action","deleteZahon");
    ps.append("ZahonID",cb.value);
    return fetch(SERVER_URL,{method:"POST",body:ps}).then(r=>r.text());
  }))
  .then(()=>loadZahony())
  .finally(hideActionIndicator);
}

function addZahon(){
  const na = document.getElementById("newNazev").value.trim();
  const de = parseFloat(document.getElementById("newDelka").value)||0;
  const si = parseFloat(document.getElementById("newSirka").value)||0;
  if(!na||de<=0||si<=0) return alert("Vyplňte název/délku/šířku.");
  showActionIndicator();
  const ps = new URLSearchParams();
  ps.append("action","addZahon");
  ps.append("userID",localStorage.getItem("userID"));
  ps.append("NazevZahonu",na);
  ps.append("Delka",de);
  ps.append("Sirka",si);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if(txt.trim()==="OK"){
        ["newNazev","newDelka","newSirka"].forEach(id=>document.getElementById(id).value="");
        loadZahony();
      }
    })
    .catch(console.error)
    .finally(hideActionIndicator);
}

// — Otevření modalu —
function otevriModal(id, name, delka, sirka, plocha){
  aktualniZahon = {ZahonID:id, NazevZahonu:name, Delka:delka, Sirka:sirka};
  setActiveIcon(null);
  document.getElementById("editNazev").value = name;
  document.getElementById("editDelka").value = delka;
  document.getElementById("editSirka").value = sirka;
  updatePlocha();
  nakresliZahonCanvas(delka,sirka);
  document.getElementById("modalViewDefault").style.display="block";
  document.getElementById("modalViewUdalost").style.display="none";
  document.getElementById("modal").style.display="flex";
}
function closeModal(){
  aktualniZahon = null;
  document.getElementById("modal").style.display="none";
}

// — Editace záhonu —
function updatePlocha(){
  const d = parseFloat(document.getElementById("editDelka").value)||0;
  const s = parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent = (d*s).toFixed(2);
}

function saveZahon(){
  const na = document.getElementById("editNazev").value.trim();
  const de = parseFloat(document.getElementById("editDelka").value)||0;
  const si = parseFloat(document.getElementById("editSirka").value)||0;
  if(!na||de<=0||si<=0) return alert("Chybné údaje.");
  showActionIndicator();
  const ps = new URLSearchParams();
  ps.append("action","updateZahon");
  ps.append("ZahonID",aktualniZahon.ZahonID);
  ps.append("NazevZahonu",na);
  ps.append("Delka",de);
  ps.append("Sirka",si);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if(txt.trim()==="OK"){
        closeModal();
        loadZahony();
      }
    })
    .catch(console.error)
    .finally(hideActionIndicator);
}

// — Plodiny / hnojiva / historie —
function loadPlodiny(){
  fetch(`${SERVER_URL}?action=getPlodiny`)
    .then(r=>r.json())
    .then(arr=>{
      const sel = document.getElementById("plodinaSelect");
      if(!sel) return;
      sel.innerHTML = `<option value="">– vyber –</option>`;
      arr.forEach(p=>sel.appendChild(Object.assign(document.createElement("option"),{
        value:p.nazev, textContent:p.nazev
      })));
    })
    .catch(e=>console.error(e));
}
function loadHnojiva(){
  fetch(`${SERVER_URL}?action=getHnojiva`)
    .then(r=>r.json())
    .then(arr=>{
      const sel = document.getElementById("hnojivoSelect");
      sel.innerHTML = `<option value="">– vyber –</option>`;
      arr.forEach(h=>sel.appendChild(Object.assign(document.createElement("option"),{
        value:h.nazev, textContent:h.nazev
      })));
    })
    .catch(e=>console.error(e));
}
function loadHnojeniHistory(){
  fetch(`${SERVER_URL}?action=getZahonUdalosti&zahonID=${aktualniZahon.ZahonID}`)
    .then(r=>r.json())
    .then(arr=>{
      const body = document.getElementById("hnojeniHistoryBody");
      body.innerHTML="";
      arr.filter(u=>u.Typ==="Hnojení")
         .forEach(u=>{
           const tr = document.createElement("tr");
           tr.innerHTML = `
             <td>${u.Datum}</td>
             <td>${u.Hnojivo}</td>
             <td>${u.N_g_m2}</td>
             <td>${u.P_g_m2}</td>
             <td>${u.K_g_m2}</td>
           `;
           body.appendChild(tr);
         });
    })
    .catch(console.error);
}

// — Formuláře v modalu —
function showUdalostForm(typ){
  document.getElementById("modalViewDefault").style.display="none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display="block";
  const c = document.getElementById("udalostFormContainer");
  let html = `<h4>${typ.charAt(0).toUpperCase()+typ.slice(1)}</h4>
    <label>Datum: <input type="date" id="udalostDatum"/></label><br>`;
  if(typ==="seti"){
    html += `<label>Plodina:
       <select id="plodinaSelect"><option>Načítám…</option></select>
      </label><br>
      <img src="img/Safe.png"    class="modal-btn" onclick="ulozUdalost('seti')" />
      <img src="img/Goback .png" class="modal-btn" onclick="zpetNaDetailZahonu()" />`;
  }
  if(typ==="hnojeni"){
    html += `<label>Hnojivo:
        <select id="hnojivoSelect"><option>Načítám…</option></select>
      </label><br>
      <label>Množství (kg): <input type="number" id="udalostMnozstvi"/></label><br>
      <img src="img/Safe.png"    class="modal-btn" onclick="ulozUdalost('hnojeni')" />
      <img src="img/Goback .png" class="modal-btn" onclick="zpetNaDetailZahonu()" />
      <div class="hnojeni-history">
        <table>
          <thead>
            <tr><th>Datum</th><th>Hnojivo</th><th>N (g/m²)</th><th>P (g/m²)</th><th>K (g/m²)</th></tr>
          </thead>
          <tbody id="hnojeniHistoryBody">
            <tr><td colspan="5">Načítám historii…</td></tr>
          </tbody>
        </table>
      </div>`;
  }
  if(typ==="sklizen"){
    html += `<label>Plodina: <input type="text" id="udalostPlodina"/></label><br>
             <label>Výnos (kg): <input type="number" id="udalostVynos"/></label><br>
             <img src="img/Safe.png"    class="modal-btn" onclick="ulozUdalost('sklizen')" />
             <img src="img/Goback .png" class="modal-btn" onclick="zpetNaDetailZahonu()" />`;
  }
  c.innerHTML=html;
  if(typ==="seti")    loadPlodiny();
  if(typ==="hnojeni"){ loadHnojiva(); loadHnojeniHistory(); }
}

// — Uložení události —
function ulozUdalost(typ){
  const ps = new URLSearchParams();
  ps.append("action","addUdalost");
  ps.append("zahonID",aktualniZahon.ZahonID);
  ps.append("typ",typ);
  ps.append("datum",document.getElementById("udalostDatum").value);
  if(typ==="seti"){
    ps.append("plodina",document.getElementById("plodinaSelect").value);
  }
  if(typ==="hnojeni"){
    ps.append("hnojivo",document.getElementById("hnojivoSelect").value);
    ps.append("mnozstvi",document.getElementById("udalostMnozstvi").value);
  }
  if(typ==="sklizen"){
    ps.append("plodina",document.getElementById("udalostPlodina").value);
    ps.append("vynos",document.getElementById("udalostVynos").value);
  }
  showActionIndicator();
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(()=> {
      zpetNaDetailZahonu();
    })
    .catch(console.error)
    .finally(hideActionIndicator);
}

// — Analýza —
function showAnalysisForm(){
  document.getElementById("modalViewDefault").style.display="none";
  const uv = document.getElementById("modalViewUdalost");
  uv.classList.add("analysis");
  uv.style.display="block";
  document.getElementById("udalostFormContainer").innerHTML=`
    <h4>Analýza</h4>
    <label>Datum: <input type="date" id="analDatum"/></label><br>
    <div class="nutrients">
      <div class="nutrient"><label>pH:</label><input step="0.1" id="analPH" type="number"/></div>
      <div class="nutrient"><label>N:</label><input id="analN" type="number"/></div>
      <div class="nutrient"><label>P:</label><input id="analP" type="number"/></div>
      <div class="nutrient"><label>K:</label><input id="analK" type="number"/></div>
    </div>
    <div class="soil-info">
      <label>Typ půdy:<input id="soilType" type="text"/></label><br>
      <label>Barva půdy:<input id="soilColor" type="text"/></label>
    </div>
    <img src="img/Safe.png"    class="modal-btn" onclick="saveAnalysis()"/>
    <img src="img/Goback .png" class="modal-btn" onclick="zpetNaDetailZahonu()"/>`;
}
function saveAnalysis(){
  // ...sem volání na backend...
  alert("Analýza uložena");
  zpetNaDetailZahonu();
}

// — Zpět na detail záhonu —
function zpetNaDetailZahonu(){
  const uv = document.getElementById("modalViewUdalost");
  uv.style.display="none";
  uv.classList.remove("analysis");
  document.getElementById("modalViewDefault").style.display="block";
  setActiveIcon(null);
}

// — Ikony panelu —
function setActiveIcon(act){
  ["mereni","seti","hnojeni","sklizen","analyza","nastaveni"]
    .forEach(t=>{
      const el = document.getElementById(`icon-${t}`);
      if(el) el.classList.toggle("active", t===act);
    });
}
function onIconClick(typ){
  setActiveIcon(typ);
  document.getElementById("modalViewDefault").style.display="none";
  document.getElementById("modalViewUdalost").style.display="none";
  if(["seti","hnojeni","sklizen"].includes(typ)) showUdalostForm(typ);
  else if(typ==="mereni") document.getElementById("modalViewDefault").style.display="block";
  else if(typ==="analyza") showAnalysisForm();
}

// — Kreslení záhonu & zoom —
function nakresliZahonCanvas(d,s){
  const c = document.getElementById("zahonVizualizace");
  c.innerHTML="";
  const cv = document.createElement("canvas");
  cv.width=cv.height=200;
  const ctx = cv.getContext("2d");
  ctx.fillStyle="#009900"; ctx.fillRect(0,0,200,200);
  const scale = Math.min(200/(d||1),200/(s||1));
  const w=(d||1)*scale, h=(s||1)*scale;
  const x=(200-w)/2, y=(200-h)/2;
  ctx.fillStyle="#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  cv.style.cursor="pointer";
  cv.onclick=()=>document.getElementById("modal").style.display==="flex"&&aktuálníZahon&&openZoom(d,s);
  c.appendChild(cv);
}
function openZoom(d,s){
  const cv = document.getElementById("zoomCanvas");
  const factor=5, base=80;
  cv.width=base*factor; cv.height=base*factor;
  const ctx = cv.getContext("2d");
  ctx.fillStyle="#009900"; ctx.fillRect(0,0,cv.width,cv.height);
  const scale=Math.min(cv.width/(d||1),cv.height/(s||1));
  const w=(d||1)*scale,h=(s||1)*scale;
  const x=(cv.width-w)/2,y=(cv.height-h)/2;
  ctx.fillStyle="#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  document.getElementById("zoomModal").style.display="flex";
}
function closeZoom(){
  document.getElementById("zoomModal").style.display="none";
}

// — Auto‐login a eventy na startu —
document.addEventListener("DOMContentLoaded",()=>{
  const zm=document.getElementById("zoomModal");
  if(zm) zm.querySelector("button")?.addEventListener("click",closeZoom);
  if(localStorage.getItem("userID")) onLoginSuccess();
});