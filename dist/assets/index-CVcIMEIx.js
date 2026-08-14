var N=Object.defineProperty;var _=(a,e,t)=>e in a?N(a,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):a[e]=t;var l=(a,e,t)=>_(a,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function t(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(n){if(n.ep)return;n.ep=!0;const s=t(n);fetch(n.href,s)}})();class A{constructor(){l(this,"dataset",null);l(this,"individualsMap",new Map);l(this,"branches",[]);l(this,"summary",null);l(this,"isLoaded",!1)}async load(){var e,t;if(!this.isLoaded)try{const i=await fetch("./family_tree_dataset.json");this.dataset=await i.json(),this.summary=((e=this.dataset)==null?void 0:e.summary)||null,this.branches=((t=this.dataset)==null?void 0:t.branches)||[],this.dataset&&Array.isArray(this.dataset.individuals)&&this.dataset.individuals.forEach(n=>{this.individualsMap.set(n.id,n)}),this.isLoaded=!0}catch(i){console.error("Failed to load family_tree_dataset.json:",i)}}getAllIndividuals(){return Array.from(this.individualsMap.values())}getIndividual(e){return this.individualsMap.get(Number(e))||null}getParents(e){const t=this.getIndividual(e);return!t||!t.parents?[]:t.parents.map(i=>this.getIndividual(i)).filter(i=>!!i)}getChildren(e){const t=this.getIndividual(e);return!t||!t.children?[]:t.children.map(i=>this.getIndividual(i)).filter(i=>!!i)}getSpouses(e){const t=this.getIndividual(e);return!t||!t.spouses?[]:t.spouses.map(i=>this.getIndividual(i)).filter(i=>!!i)}getSiblings(e){const t=this.getIndividual(e);if(!t||!t.parents||t.parents.length===0)return[];const i=new Set;return t.parents.forEach(n=>{const s=this.getIndividual(n);s&&s.children&&s.children.forEach(o=>{o!==t.id&&i.add(o)})}),Array.from(i).map(n=>this.getIndividual(n)).filter(n=>!!n)}getAncestors(e,t=6){const i=[],n=[{id:Number(e),depth:0}],s=new Set([Number(e)]);for(;n.length>0;){const o=n.shift();if(o.depth>=t)continue;const f=this.getParents(o.id);for(const c of f)s.has(c.id)||(s.add(c.id),i.push({...c,relationDepth:o.depth+1}),n.push({id:c.id,depth:o.depth+1}))}return i}getDescendants(e,t=6){const i=[],n=[{id:Number(e),depth:0}],s=new Set([Number(e)]);for(;n.length>0;){const o=n.shift();if(o.depth>=t)continue;const f=this.getChildren(o.id);for(const c of f)s.has(c.id)||(s.add(c.id),i.push({...c,relationDepth:o.depth+1}),n.push({id:c.id,depth:o.depth+1}))}return i}search(e){if(!e||e.trim().length===0)return[];const t=e.trim().toLowerCase(),i=[];for(const n of this.individualsMap.values()){const s=n.fullName.toLowerCase().includes(t),o=n.tamilName&&n.tamilName.includes(t),f=n.nativePlace&&n.nativePlace.toLowerCase().includes(t),c=n.notes&&n.notes.toLowerCase().includes(t);if(s||o||f||c){const h=this.getParents(n.id),g=this.getSpouses(n.id);let d="";h.length>0&&(d=`${n.gender==="male"?"S/o":"D/o"} ${h.map(L=>L.fullName.split(" ")[0]).join(" & ")}`);let p="";g.length>0&&(p=`${n.gender==="male"?"H/o":"W/o"} ${g.map(L=>L.fullName.split(" ")[0]).join(", ")}`);const E=n.isLiving?n.birthYear?`b. ${n.birthYear}`:"Living":`${n.birthYear||"?"} – ${n.passingYear||"Deceased"}`;i.push({individual:n,parentClue:d,spouseClue:p,lifespan:E,generation:n.generation,branch:n.branch||"Main Lineage"})}}return i.slice(0,15)}getGenerationsMap(){const e=new Map;for(let t=1;t<=6;t++)e.set(t,[]);for(const t of this.individualsMap.values()){const i=t.generation||1;e.has(i)||e.set(i,[]),e.get(i).push(t)}return e}}const m=new A,I=typeof window<"u"&&(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"),u={PROJECT_KEY:"rithamic_familytree",API_BASE_URL:I?"http://localhost:3000":"https://api.rithamic.co.in",AUTH_HUB_URL:I?"http://localhost:5174":"https://auth.rithamic.co.in",STORAGE_KEYS:{AUTH_TOKEN:"rithamic_familytree_token",AUTH_USER:"rithamic_familytree_user",TREE_STATE:"rithamic_familytree_state"}};let w=localStorage.getItem("familytree_session_id");w||(w="sess_"+Math.random().toString(36).substring(2,11),localStorage.setItem("familytree_session_id",w));const y=(a,e,t={})=>{const i=localStorage.getItem(u.STORAGE_KEYS.AUTH_USER),n=i?JSON.parse(i):null,s={events:[{eventType:a,eventName:e,metadata:t,sessionId:w,userIdentifier:n?n.email:"anonymous_family_viewer"}]};fetch(`${u.API_BASE_URL}/api/metrics/${u.PROJECT_KEY}/events`,{method:"POST",headers:{"Content-Type":"application/json","X-Session-Id":w||"anonymous"},body:JSON.stringify(s)}).catch(()=>{})};class k{constructor(){l(this,"token");l(this,"user");l(this,"listeners",[]);this.token=localStorage.getItem(u.STORAGE_KEYS.AUTH_TOKEN);const e=localStorage.getItem(u.STORAGE_KEYS.AUTH_USER);this.user=e?JSON.parse(e):null}onAuthChange(e){this.listeners.push(e)}notifyListeners(){const e={isAuthenticated:this.isAuthenticated(),user:this.user,isAdmin:this.isAdmin(),isEditor:this.isEditor()};this.listeners.forEach(t=>t(e))}isAuthenticated(){return!!(this.token&&this.user)}isAdmin(){var e;return((e=this.user)==null?void 0:e.role)==="admin"}isEditor(){var e,t;return((e=this.user)==null?void 0:e.role)==="admin"||((t=this.user)==null?void 0:t.role)==="editor"}getUser(){return this.user}getToken(){return this.token}async handleUrlTicketExchange(){const e=new URLSearchParams(window.location.search),t=e.get("ticket"),i=e.get("token");if(t)try{const n=await fetch(`${u.API_BASE_URL}/api/auth/sso/exchange`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ticket:t,targetProjectKey:u.PROJECT_KEY})}),s=await n.json();if(n.ok&&s.token)return this.setSession(s.token,s.user),y("auth","sso_login_success",{email:s.user.email}),this.cleanUrlParams(),!0}catch(n){console.error("SSO exchange error:",n)}else i&&(await this.verifyAndSetToken(i),this.cleanUrlParams());return this.token&&await this.verifyCurrentSession(),!1}async verifyAndSetToken(e){try{const t=await fetch(`${u.API_BASE_URL}/api/auth/${u.PROJECT_KEY}/verify-session`,{headers:{Authorization:`Bearer ${e}`}}),i=await t.json();t.ok&&i.valid&&this.setSession(e,i.user)}catch{}}async verifyCurrentSession(){try{const e=await fetch(`${u.API_BASE_URL}/api/auth/${u.PROJECT_KEY}/verify-session`,{headers:{Authorization:`Bearer ${this.token}`}}),t=await e.json();(!e.ok||!t.valid)&&this.logout()}catch{}}setSession(e,t){this.token=e,this.user=t,localStorage.setItem(u.STORAGE_KEYS.AUTH_TOKEN,e),localStorage.setItem(u.STORAGE_KEYS.AUTH_USER,JSON.stringify(t)),this.notifyListeners()}logout(){this.token=null,this.user=null,localStorage.removeItem(u.STORAGE_KEYS.AUTH_TOKEN),localStorage.removeItem(u.STORAGE_KEYS.AUTH_USER),this.notifyListeners(),y("auth","logout")}redirectToCentralLogin(){const e=window.location.origin+window.location.pathname,t=`${u.AUTH_HUB_URL}?project=${u.PROJECT_KEY}&returnUrl=${encodeURIComponent(e)}`;window.location.href=t}async requestDirectOtp(e){const t=await fetch(`${u.API_BASE_URL}/api/auth/${u.PROJECT_KEY}/otp/request`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recipient:e,channel:"email",purpose:"login"})}),i=await t.json();if(!t.ok)throw new Error(i.error||"Failed to send verification code");return i}async verifyDirectOtp(e,t){const i=await fetch(`${u.API_BASE_URL}/api/auth/${u.PROJECT_KEY}/otp/verify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recipient:e,otp:t})}),n=await i.json();if(!i.ok)throw new Error(n.error||"Invalid verification code");return this.setSession(n.token,n.user),y("auth","otp_login_success",{email:n.user.email}),n}maskSensitiveData(e){var i;if(!e)return e;const t={...e};if(!this.isAuthenticated()){if(t.contact){const n=t.contact.split(" ");t.contact=n.length>1?`${n[0]} ${(i=n[1])==null?void 0:i.substring(0,3)} •••••`:"+91 ••••••••••"}t.isLiving&&t.notes&&t.notes.length>50&&(t.notes=t.notes.substring(0,50)+"… [Sign in to view full family record]")}return t}cleanUrlParams(){const e=new URL(window.location.href);e.searchParams.delete("ticket"),e.searchParams.delete("token"),window.history.replaceState({},document.title,e.toString())}}const v=new k;class O{constructor(e,t){l(this,"container");l(this,"viewport");l(this,"canvas");l(this,"onNodeSelect");l(this,"zoom",1);l(this,"panX",0);l(this,"panY",0);l(this,"isDragging",!1);l(this,"startX",0);l(this,"startY",0);l(this,"selectedId",null);l(this,"filterBranch","ALL");l(this,"filterGeneration","ALL");l(this,"viewMode","FULL");l(this,"focusNodeId",null);this.container=e,this.onNodeSelect=t,this.initCanvas()}initCanvas(){this.container.innerHTML=`
      <div class="tree-viewport" id="treeViewport">
        <div class="tree-canvas" id="treeCanvas"></div>
      </div>
    `,this.viewport=this.container.querySelector("#treeViewport"),this.canvas=this.container.querySelector("#treeCanvas"),this.setupPanAndZoom()}setupPanAndZoom(){this.viewport.addEventListener("mousedown",e=>{e.target.closest(".node-card")||(this.isDragging=!0,this.startX=e.clientX-this.panX,this.startY=e.clientY-this.panY,this.viewport.style.cursor="grabbing")}),window.addEventListener("mousemove",e=>{this.isDragging&&(this.panX=e.clientX-this.startX,this.panY=e.clientY-this.startY,this.updateTransform())}),window.addEventListener("mouseup",()=>{this.isDragging=!1,this.viewport.style.cursor="grab"}),this.viewport.addEventListener("wheel",e=>{e.preventDefault();const t=1.1;e.deltaY<0?this.zoomIn(t):this.zoomOut(t)},{passive:!1})}zoomIn(e=1.2){this.zoom=Math.min(this.zoom*e,2.5),this.updateTransform()}zoomOut(e=1.2){this.zoom=Math.max(this.zoom/e,.35),this.updateTransform()}resetView(){this.zoom=1,this.panX=0,this.panY=0,this.updateTransform()}fitToScreen(){this.zoom=.85,this.panX=40,this.panY=40,this.updateTransform()}updateTransform(){this.canvas.style.transform=`translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`}render(e="ALL",t="ALL"){this.filterBranch=e,this.filterGeneration=t,this.canvas.innerHTML="",this.viewMode==="FOCUS"&&this.focusNodeId?this.renderFocusView(this.focusNodeId):this.renderFullHierarchy()}renderFullHierarchy(){const e=m.getGenerationsMap(),t=document.createElement("div");t.className="hierarchy-container";for(let i=1;i<=6;i++){if(this.filterGeneration!=="ALL"&&Number(this.filterGeneration)!==i)continue;const s=(e.get(i)||[]).filter(c=>this.filterBranch==="ALL"?!0:c.branch&&c.branch.includes(this.filterBranch));if(s.length===0)continue;const o=document.createElement("div");o.className="generation-row",o.innerHTML=`
        <div class="generation-label">
          <span class="gen-tag">Gen ${i}</span>
          <span class="gen-title">${this.getGenerationTitle(i)}</span>
        </div>
        <div class="nodes-track" id="genTrack_${i}"></div>
      `;const f=o.querySelector(`#genTrack_${i}`);s.forEach(c=>{const h=this.createNodeCard(c);f.appendChild(h)}),t.appendChild(o)}this.canvas.appendChild(t)}renderFocusView(e){var h;const t=m.getIndividual(e);if(!t)return;const i=m.getAncestors(e),n=m.getDescendants(e),s=document.createElement("div");s.className="focus-pedigree-container",s.innerHTML=`
      <div class="focus-bar">
        <span class="focus-title">Focus Lineage: <strong>${t.fullName}</strong></span>
        <button class="btn-exit-focus" id="btnExitFocus">← View Full Family Tree</button>
      </div>
      <div class="pedigree-section" id="ancestorsSection">
        <h4 class="pedigree-heading">Ancestors & Parents</h4>
        <div class="pedigree-row" id="ancestorRow"></div>
      </div>
      <div class="pedigree-section focal-section">
        <h4 class="pedigree-heading">Selected Member</h4>
        <div class="pedigree-row" id="focalRow"></div>
      </div>
      <div class="pedigree-section" id="descendantsSection">
        <h4 class="pedigree-heading">Children & Descendants</h4>
        <div class="pedigree-row" id="descendantRow"></div>
      </div>
    `;const o=s.querySelector("#ancestorRow");i.length===0?o.innerHTML='<p class="text-muted" style="color: #64748b; font-size: 13px;">No earlier ancestors recorded</p>':i.forEach(g=>o.appendChild(this.createNodeCard(g))),s.querySelector("#focalRow").appendChild(this.createNodeCard(t,!0));const c=s.querySelector("#descendantRow");n.length===0?c.innerHTML='<p class="text-muted" style="color: #64748b; font-size: 13px;">No recorded descendants</p>':n.forEach(g=>c.appendChild(this.createNodeCard(g))),(h=s.querySelector("#btnExitFocus"))==null||h.addEventListener("click",()=>{this.viewMode="FULL",this.focusNodeId=null,this.render(),this.fitToScreen()}),this.canvas.appendChild(s)}createNodeCard(e,t=!1){const i=document.createElement("div");i.className=`node-card ${e.gender} ${t?"focal-node":""} ${this.selectedId===e.id?"selected":""}`,i.id=`node_${e.id}`,i.dataset.id=String(e.id);const n=e.fullName.split(" ").map(o=>o[0]).join("").substring(0,2).toUpperCase(),s=this.getBranchClass(e.branch||"");return i.innerHTML=`
      <div class="node-branch-stripe ${s}"></div>
      <div class="node-content">
        <div class="node-avatar ${e.gender}">${n}</div>
        <div class="node-details">
          <div class="node-name">${e.fullName}</div>
          ${e.tamilName?`<div class="node-tamil">${e.tamilName}</div>`:""}
          <div class="node-meta">
            <span class="node-lifespan">${e.birthYear||(e.isLiving?"Living":"Deceased")}</span>
            ${e.nativePlace?`<span class="node-place">📍 ${e.nativePlace.split(",")[0]}</span>`:""}
          </div>
        </div>
      </div>
    `,i.addEventListener("click",o=>{o.stopPropagation(),this.selectNode(e.id)}),i}selectNode(e){this.selectedId=Number(e),document.querySelectorAll(".node-card").forEach(n=>n.classList.remove("selected"));const t=document.getElementById(`node_${e}`);t&&t.classList.add("selected");const i=m.getIndividual(e);i&&this.onNodeSelect&&(this.onNodeSelect(i),y("interaction","node_focus",{id:i.id,name:i.fullName}))}setFocusView(e){this.viewMode="FOCUS",this.focusNodeId=Number(e),this.render(),this.resetView()}getGenerationTitle(e){return{1:"1st Generation – Forefathers & Roots",2:"2nd Generation – Lineage Elders",3:"3rd Generation – Patriarchs & Matriarchs",4:"4th Generation – Senior Family Members",5:"5th Generation – Contemporary Generation",6:"6th Generation – Children & Next Lineage"}[e]||`Generation ${e}`}getBranchClass(e){return e?e.includes("Velusamy")?"branch-velusamy":e.includes("Anna Anban")?"branch-annan":e.includes("Kandasamy")?"branch-kandasamy":e.includes("Palani Vel")?"branch-palanivel":"branch-default":"branch-default"}}let r=null;document.addEventListener("DOMContentLoaded",async()=>{await m.load();const a=document.getElementById("treeContainer");r=new O(a,S),r.render(),r.fitToScreen(),await v.handleUrlTicketExchange(),b(),B(),U(),R(),M(),y("page_view","familytree_loaded",{totalMembers:m.getAllIndividuals().length})});function b(){const a=document.getElementById("guestAuthView"),e=document.getElementById("userAuthView"),t=document.getElementById("userDisplayName"),i=document.getElementById("userRoleBadge");if(v.isAuthenticated()){const n=v.getUser();a.classList.add("hidden"),e.classList.remove("hidden"),n&&(t.textContent=n.fullName||n.email.split("@")[0],i.textContent=(n.role||"viewer").toUpperCase())}else a.classList.remove("hidden"),e.classList.add("hidden")}function B(){const a=document.getElementById("searchInput"),e=document.getElementById("searchDropdown");let t=null;a.addEventListener("input",i=>{t&&clearTimeout(t);const n=i.target.value.trim();if(n.length===0){e.classList.add("hidden");return}t=window.setTimeout(()=>{const s=m.search(n);P(s),y("search_query","member_search",{query:n,matchCount:s.length})},200)}),document.addEventListener("click",i=>{i.target.closest(".search-container")||e.classList.add("hidden")})}function P(a){const e=document.getElementById("searchDropdown");if(e.innerHTML="",a.length===0){e.innerHTML='<div style="padding: 16px; color: #94a3b8; font-size: 13px;">No family members found matching that name.</div>',e.classList.remove("hidden");return}a.forEach(t=>{const i=t.individual,n=document.createElement("div");n.className="search-item",n.innerHTML=`
      <div class="search-item-name">${i.fullName} ${i.tamilName?`<span style="color: #f59e0b; font-weight: normal;">(${i.tamilName})</span>`:""}</div>
      <div class="search-item-clue">${t.parentClue||""} ${t.spouseClue?`&bull; ${t.spouseClue}`:""}</div>
      <div class="search-item-meta">
        <span class="badge-tag">Gen ${t.generation}</span>
        <span class="badge-tag">${t.lifespan}</span>
        <span class="badge-tag">${t.branch}</span>
      </div>
    `,n.addEventListener("click",()=>{e.classList.add("hidden"),document.getElementById("searchInput").value=i.fullName,r&&r.selectNode(i.id)}),e.appendChild(n)}),e.classList.remove("hidden")}function S(a){var g;const e=v.maskSensitiveData(a),t=document.getElementById("profileDrawer"),i=document.getElementById("drawerBody"),n=m.getParents(e.id),s=m.getSpouses(e.id),o=m.getSiblings(e.id),f=m.getChildren(e.id),c=e.fullName.split(" ").map(d=>d[0]).join("").substring(0,2).toUpperCase();i.innerHTML=`
    <div class="drawer-avatar-section">
      <div class="drawer-avatar ${e.gender}" style="background: ${e.gender==="male"?"#2563eb":"#ec4899"};">
        ${c}
      </div>
      <div class="drawer-name">${e.fullName}</div>
      ${e.tamilName?`<div class="drawer-tamil">${e.tamilName}</div>`:""}
      <div style="margin-top: 8px;">
        <span class="badge-tag" style="background: #f59e0b; color: #0f172a; font-weight: bold;">Gen ${e.generation}</span>
        <span class="badge-tag">${e.isLiving?"🟢 Living":"⚪ Deceased"}</span>
      </div>
      <button class="btn-auth" id="btnFocusPedigree" style="margin-top: 14px; width: 100%; justify-content: center;">
        🔍 Focus Lineage & Ancestry
      </button>
    </div>

    <!-- Relationships -->
    <div class="drawer-section">
      <div class="drawer-section-title">Parents</div>
      <div class="relation-chips" id="parentsChips">
        ${n.length>0?n.map(d=>`<button class="rel-chip" data-id="${d.id}">${d.fullName}</button>`).join(""):'<span style="font-size: 13px; color: #64748b;">Not recorded</span>'}
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Spouse(s)</div>
      <div class="relation-chips" id="spousesChips">
        ${s.length>0?s.map(d=>`<button class="rel-chip" data-id="${d.id}">💍 ${d.fullName}</button>`).join(""):'<span style="font-size: 13px; color: #64748b;">Not recorded</span>'}
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Siblings</div>
      <div class="relation-chips" id="siblingsChips">
        ${o.length>0?o.map(d=>`<button class="rel-chip" data-id="${d.id}">${d.fullName}</button>`).join(""):'<span style="font-size: 13px; color: #64748b;">None recorded</span>'}
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Children</div>
      <div class="relation-chips" id="childrenChips">
        ${f.length>0?f.map(d=>`<button class="rel-chip" data-id="${d.id}">${d.fullName}</button>`).join(""):'<span style="font-size: 13px; color: #64748b;">No descendants recorded</span>'}
      </div>
    </div>

    <!-- Personal & Contact Info -->
    <div class="drawer-section">
      <div class="drawer-section-title">Life & Contact Details</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Birth / Passing:</span>
          <span class="info-value">${e.birthYear||"?"} ${e.passingYear?`– ${e.passingYear}`:""}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Native Place:</span>
          <span class="info-value">${e.nativePlace||"Kangayam"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Branch:</span>
          <span class="info-value">${e.branch||"Main Lineage"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Contact:</span>
          <span class="info-value">${e.contact||"Not available"}</span>
        </div>
      </div>

      ${v.isAuthenticated()?"":`
        <div class="privacy-lock-notice">
          <span>🔒 Contact details are masked for privacy.</span>
          <button class="btn-auth" id="btnUnlockPrivacy" style="padding: 4px 10px; font-size: 11px;">Sign in</button>
        </div>
      `}
    </div>

    <!-- Biographical Notes -->
    ${e.notes?`
      <div class="drawer-section">
        <div class="drawer-section-title">Family History & Notes</div>
        <div style="background: #1e293b; padding: 12px; border-radius: 8px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
          ${e.notes}
        </div>
      </div>
    `:""}
  `,(g=i.querySelector("#btnFocusPedigree"))==null||g.addEventListener("click",()=>{r&&r.setFocusView(e.id),t.classList.remove("open")}),i.querySelectorAll(".rel-chip").forEach(d=>{d.addEventListener("click",()=>{const p=d.dataset.id;p&&r&&r.selectNode(p)})});const h=i.querySelector("#btnUnlockPrivacy");h&&h.addEventListener("click",()=>{$()}),t.classList.add("open")}function U(){var t,i,n,s;const a=document.getElementById("branchFilter"),e=document.getElementById("generationFilter");a.addEventListener("change",()=>{r&&r.render(a.value,e.value),y("filter_change","branch_filtered",{branch:a.value})}),e.addEventListener("change",()=>{r&&r.render(a.value,e.value),y("filter_change","generation_filtered",{generation:e.value})}),(t=document.getElementById("btnZoomIn"))==null||t.addEventListener("click",()=>r==null?void 0:r.zoomIn()),(i=document.getElementById("btnZoomOut"))==null||i.addEventListener("click",()=>r==null?void 0:r.zoomOut()),(n=document.getElementById("btnResetView"))==null||n.addEventListener("click",()=>r==null?void 0:r.resetView()),(s=document.getElementById("btnFitScreen"))==null||s.addEventListener("click",()=>r==null?void 0:r.fitToScreen())}function M(){var a;(a=document.getElementById("btnCloseDrawer"))==null||a.addEventListener("click",()=>{document.getElementById("profileDrawer").classList.remove("open")})}function R(){const a=document.getElementById("btnOpenLogin"),e=document.getElementById("btnCloseModal"),t=document.getElementById("btnLogout"),i=document.getElementById("btnSsoRedirect"),n=document.getElementById("quickOtpForm"),s=document.getElementById("quickOtpEmail"),o=document.getElementById("btnSendQuickOtp"),f=document.getElementById("quickOtpVerifyStep"),c=document.getElementById("quickOtpCode"),h=document.getElementById("btnVerifyQuickOtp");a.addEventListener("click",$),e.addEventListener("click",C),t.addEventListener("click",()=>{if(v.logout(),b(),r&&r.selectedId){const d=m.getIndividual(r.selectedId);d&&S(d)}}),i.addEventListener("click",()=>{v.redirectToCentralLogin()});let g="";n.addEventListener("submit",async d=>{d.preventDefault();const p=s.value.trim().toLowerCase();if(p){o.textContent="Sending code...",o.disabled=!0;try{await v.requestDirectOtp(p),g=p,n.classList.add("hidden"),f.classList.remove("hidden"),c.focus()}catch(E){alert(E.message||"Failed to send OTP code.")}finally{o.textContent="Send 6-Digit Code",o.disabled=!1}}}),h.addEventListener("click",async()=>{const d=c.value.trim();if(d.length!==6){alert("Please enter the 6-digit verification code.");return}h.textContent="Verifying...",h.disabled=!0;try{if(await v.verifyDirectOtp(g,d),C(),b(),r&&r.selectedId){const p=m.getIndividual(r.selectedId);p&&S(p)}}catch(p){alert(p.message||"Invalid code.")}finally{h.textContent="Verify & Sign In",h.disabled=!1}}),v.onAuthChange(()=>b())}function $(){var a;(a=document.getElementById("loginModal"))==null||a.classList.remove("hidden")}function C(){var a;(a=document.getElementById("loginModal"))==null||a.classList.add("hidden")}
