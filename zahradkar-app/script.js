// ← Nahraďte svou URL
const SERVER_URL = "https://script.google.com/macros/s/AKfycby5Q582sTjMVzHDwInTpUQqQDbMMaZoAT90Lv1hEiB8rcRVs3XX21JUKYNmg16nYsGW/exec";

let aktualniZahon = null;

// — Počasí podle geolokace —
function loadWeatherByGeolocation(){
  const contIcon = document.getElementById("weatherIcon");
  const contTemp = document.getElementById("weatherTemp");
  if(!navigator.geolocation){ contTemp.textContent="–"; return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude:lat, longitude:lon} = pos.coords;
    fetch(`https://wttr.in/${lat},${lon}?format=j1`)
      .then(r=>r.json())
      .then(data=>{
        const cur = data.current_condition[0];
        contIcon.src        = cur.weatherIconUrl[0].value;
        contIcon.alt        = cur.weatherDesc[0].value;
        contTemp.textContent = `${cur.temp_C} °C`;
      })
      .catch(err=>{
        console.error("Počasí:", err);
        contTemp.textContent="–";
      });
  },_=>{ contTemp.textContent="–"; });
}

// — Přihlášení / odhlášení —
async function login(){
  const u=document.getElementById("username").value;
  const p=document.getElementById("password").value;
  try {
    const res=await fetch(`${SERVER_URL}?action=login`, {
      method:"POST",
      body:new URLSearchParams({username:u,password:p})
    });
    const data=await res.json();
    if(data.success){
      localStorage.setItem("userID",data.userID);
      onLoginSuccess();
    } else {
      document.getElementById("loginMsg").innerText="Neplatné přihlašovací údaje.";
    }
  } catch(err){
    console.error("Login error:",err);
    document.getElementById("loginMsg").innerText="Chyba při přihlášení.";
  }
}
function onLoginSuccess(){
  document.getElementById("loginDiv").style.display="none";
  document.getElementById("appDiv").style.display="block";
  loadWeatherByGeolocation();
  loadZahony();
}
function logout(){
  localStorage.removeItem("userID");
  document.getElementById("appDiv").style.display="none";
  document.getElementById("loginDiv").style.display="block";
}

// — Seznam záhonů —
function loadZahony(){
  const uid=localStorage.getItem("userID");
  if(!uid) return;
  fetch(`${SERVER_URL}?action=getZahony&userID=${uid}`)
    .then(r=>r.json())
    .then(arr=>{
      const tb=document.querySelector("#zahonyTable tbody");
      tb.innerHTML="";
      arr.forEach(z=>{
        const row=document.createElement("tr");
        // checkbox
        const td1=document.createElement("td");
        const cb=document.createElement("input");
        cb.type="checkbox"; cb.value=z.ZahonID;
        td1.appendChild(cb);
        // název+ikona
        const td2=document.createElement("td");
        const a=document.createElement("a");
        a.href="#"; a.className="zahon-link";
        a.onclick=()=>otevriModal(z);
        const ico=document.createElement("img");
        ico.src="img/Freefield.png";
        ico.className="zahon-icon";
        a.appendChild(ico);
        a.appendChild(document.createTextNode(z.NazevZahonu));
        td2.appendChild(a);
        // plocha
        const td3=document.createElement("td");
        const plo=(z.Velikost_m2!=null)?z.Velikost_m2:((z.Delka||0)*(z.Sirka||0)).toFixed(2);
        td3.textContent=plo+" m²";
        row.append(td1,td2,td3);
        tb.appendChild(row);
      });
    })
    .catch(e=>console.error("Chyba načtení záhonů:",e));
}

// — Mazání záhonů —
function deleteSelected(){
  const checks=document.querySelectorAll("#zahonyTable tbody input:checked");
  if(!checks.length) return alert("Neoznačili jste žádný záhon.");
  const prom=Array.from(checks).map(cb=>{
    const ps=new URLSearchParams();
    ps.append("action","deleteZahon");
    ps.append("ZahonID",cb.value);
    return fetch(SERVER_URL,{method:"POST",body:ps}).then(r=>r.text());
  });
  Promise.all(prom).then(res=>{
    loadZahony();
  }).catch(e=>console.error("Chyba mazání:",e));
}

// — Přidání záhonu —
function addZahon(){
  const uid=localStorage.getItem("userID");
  const n=document.getElementById("newNazev").value.trim();
  const d=parseFloat(document.getElementById("newDelka").value)||0;
  const s=parseFloat(document.getElementById("newSirka").value)||0;
  if(!n||d<=0||s<=0) return alert("Vyplňte správně název, délku i šířku.");
  const ps=new URLSearchParams();
  ps.append("action","addZahon");
  ps.append("userID",uid);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if(txt.trim()==="OK"){
        ["newNazev","newDelka","newSirka"].forEach(id=>document.getElementById(id).value="");
        loadZahony();
      } else alert("Chyba: "+txt);
    })
    .catch(e=>console.error("Chyba addZahon:",e));
}

// — Modální okno —
function otevriModal(z){
  aktualniZahon=z;
  setActiveIcon(null);
  // fill
  document.getElementById("editNazev").value=z.NazevZahonu;
  document.getElementById("editDelka").value=z.Delka||0;
  document.getElementById("editSirka").value=z.Sirka||0;
  updatePlocha();
  // draw
  nakresliZahonCanvas(z.Delka,z.Sirka);
  // show
  document.getElementById("modalViewDefault").style.display="block";
  document.getElementById("modalViewUdalost").style.display="none";
  document.getElementById("modal").style.display="flex";
}
function closeModal(){
  aktualniZahon=null;
  document.getElementById("modal").style.display="none";
}

// — Úprava záhonu —
function updatePlocha(){
  const d=parseFloat(document.getElementById("editDelka").value)||0;
  const s=parseFloat(document.getElementById("editSirka").value)||0;
  document.getElementById("vypocetPlochy").textContent=(d*s).toFixed(2);
}
function saveZahon(){
  const n=document.getElementById("editNazev").value.trim();
  const d=parseFloat(document.getElementById("editDelka").value)||0;
  const s=parseFloat(document.getElementById("editSirka").value)||0;
  if(!n||d<=0||s<=0) return alert("Vyplňte správně všechno.");
  const ps=new URLSearchParams();
  ps.append("action","updateZahon");
  ps.append("ZahonID",aktualniZahon.ZahonID);
  ps.append("NazevZahonu",n);
  ps.append("Delka",d);
  ps.append("Sirka",s);
  fetch(SERVER_URL,{method:"POST",body:ps})
    .then(r=>r.text())
    .then(txt=>{
      if(txt.trim()==="OK"){
        closeModal();
        loadZahony();
      } else alert("Chyba: "+txt);
    })
    .catch(e=>console.error("Chyba saveZahon:",e));
}

// — Načtení plodin —
function loadPlodiny(){
  fetch(`${SERVER_URL}?action=getPlodiny`)
    .then(r=>r.json())
    .then(arr=>{
      const sel=document.getElementById("plodinaSelect");
      if(!sel) return;
      sel.innerHTML=`<option value="">– vyber plodinu –</option>`;
      arr.forEach(p=>{
        const o=document.createElement("option");
        o.value=p.nazev;
        o.textContent=p.nazev;
        sel.appendChild(o);
      });
    })
    .catch(e=>console.error("Chyba plodin:",e));
}

// — Události / analýza —
function showUdalostForm(typ){
  document.getElementById("modalViewDefault").style.display="none";
  const uv=document.getElementById("modalViewUdalost");
  uv.classList.remove("analysis");
  uv.style.display="block";
  const c=document.getElementById("udalostFormContainer");
  let html=`<h4>${typ.charAt(0).toUpperCase()+typ.slice(1)}</h4>
    <label>Datum:<input type="date" id="udalostDatum"/></label><br>`;
  if(typ==="seti"){
    html+=`<label>Plodina:<select id="plodinaSelect"><option>Načítám…</option></select></label><br>`;
  }
  if(typ==="hnojeni"){
    html+=`<label>Hnojivo:<input type="text" id="udalostHnojivo"/></label><br>
           <label>Množství (kg):<input type="number" id="udalostMnozstvi"/></label><br>`;
  }
  if(typ==="sklizen"){
    html+=`<label>Plodina:<input type="text" id="udalostPlodina"/></label><br>
           <label>Výnos (kg):<input type="number" id="udalostVynos"/></label><br>`;
  }
  html+=`<label>Poznámka:<input type="text" id="udalostPoznamka"/></label><br>
         <button onclick="ulozUdalost('${typ}')">Uložit</button>`;
  c.innerHTML=html;
  if(typ==="seti") loadPlodiny();
}
function ulozUdalost(typ){
  alert("Uloženo "+typ);
  zpetNaDetailZahonu();
}
function showAnalysisForm(){
  document.getElementById("modalViewDefault").style.display="none";
  const uv=document.getElementById("modalViewUdalost");
  uv.classList.add("analysis");
  uv.style.display="block";
  document.getElementById("udalostFormContainer").innerHTML=`
    <h4>Analýza</h4>
    <label>Datum:<input type="date" id="analDatum"/></label><br>
    <div class="nutrients">
      <div class="nutrient"><label>pH:</label><input type="number" step="0.1" id="analPH"/></div>
      <div class="nutrient"><label>N (ppm):</label><input type="number" id="analN"/></div>
      <div class="nutrient"><label>P (ppm):</label><input type="number" id="analP"/></div>
      <div class="nutrient"><label>K (ppm):</label><input type="number" id="analK"/></div>
    </div>
    <div class="soil-info">
      <label>Typ půdy:<input type="text" id="soilType"/></label><br>
      <label>Barva půdy:<input type="text" id="soilColor"/></label>
    </div>
    <button onclick="saveAnalysis()">Uložit analýzu</button>`;
}
function saveAnalysis(){
  alert("Analýza uložena");
  zpetNaDetailZahonu();
}
function zpetNaDetailZahonu(){
  const uv=document.getElementById("modalViewUdalost");
  uv.style.display="none";
  uv.classList.remove("analysis");
  document.getElementById("modalViewDefault").style.display="block";
  setActiveIcon(null);
}

// — Boční ikony —
function setActiveIcon(active){
  ["mereni","seti","hnojeni","sklizen","analyza","eshop","sluzba","market","nastaveni"]
    .forEach(t=>{
      const el=document.getElementById(`icon-${t}`);
      if(el) el.classList.toggle("active",t===active);
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

// — Kreslení záhonu —
function nakresliZahonCanvas(d,s){
  const cont=document.getElementById("zahonVizualizace");
  cont.innerHTML="";
  const cv=document.createElement("canvas");
  cv.width=cv.height=200;
  const ctx=cv.getContext("2d");
  ctx.fillStyle="#009900"; ctx.fillRect(0,0,200,200);
  const scale=Math.min(200/(d||1),200/(s||1));
  const w=(d||1)*scale, h=(s||1)*scale;
  const x=(200-w)/2, y=(200-h)/2;
  ctx.fillStyle="#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  cv.style.cursor="pointer";
  cv.onclick=()=>openZoom(aktualniZahon.Delka,aktualniZahon.Sirka);
  cont.appendChild(cv);
}

// — Zoom modal —
function openZoom(d,s){
  const cv=document.getElementById("zoomCanvas");
  const factor=5, base=80;
  cv.width=base*factor; cv.height=base*factor;
  const ctx=cv.getContext("2d");
  ctx.fillStyle="#009900"; ctx.fillRect(0,0,cv.width,cv.height);
  const scale=Math.min(cv.width/(d||1),cv.height/(s||1));
  const w=(d||1)*scale, h=(s||1)*scale;
  const x=(cv.width-w)/2, y=(cv.height-h)/2;
  ctx.fillStyle="#c2b280"; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeRect(x,y,w,h);
  document.getElementById("zoomModal").style.display="flex";
}
function closeZoom(){
  document.getElementById("zoomModal").style.display="none";
}

// — Auto-login + počasí na startu —
document.addEventListener("DOMContentLoaded",()=>{
  const zm=document.getElementById("zoomModal");
  if(zm) zm.querySelector("button")?.addEventListener("click",closeZoom);
  if(localStorage.getItem("userID")){
    onLoginSuccess();
  }
});