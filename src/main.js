/**
 * 🚀 PIXI 應用程式初始化與 Live2D 互動核心 (終極效能優化版)
 */

// 🛡️ 解決 favicon.ico 404 報錯問題 (動態注入隱形透明圖標，滿足瀏覽器強制請求)
if (!document.querySelector("link[rel~='icon']")) {
  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.href = 'data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAFElEQVR4XgXAAQ0AAABAMP1L30IDCPwC/o5WcS4AAAAASUVORK5CYII=';
  document.head.appendChild(favicon);
}

let app; 
let model;
let startX = 0; 
let startY = 0; 
let isOnModel = false;
let swipeAxis = null; 

// 🌟 參數狀態管理
let targetParam9 = 0, currentParam9 = 0; 
let targetParam10 = 0, currentParam10 = 0; 
let targetParam11 = 0, currentParam11 = 0; 
let targetParam12 = 0, currentParam12 = 0; 
let targetParam13 = 0, currentParam13 = 0; 
let targetParam14 = 0, currentParam14 = 0; 
let targetClothes = -1, currentClothes = -1;  
let targetParam7 = -1, currentParam7 = -1;    
let targetParam5 = -1, currentParam5 = -1;    
let targetParam3 = -1, currentParam3 = -1;    
let targetParam = -1, currentParam = -1;      
let targetParam6 = 0, currentParam6 = 0;      
let currentParam8 = 0;              
let blinkTarget = 1, blinkCurrent = 1;        

// 💖 表情連動與大振幅隨機眼神狀態 
let targetEyeX = 0, currentEyeX = 0; 
let targetEyeY = 0, currentEyeY = 0;
let targetMouthForm = 0, currentMouthForm = 0;

// 🔒 鎖定、記憶體與連續操作狀態
let isParam2Locked = false;
let isParam7Locked = false;
let isParam3Locked = false; 
let isParamLocked = false;  
let isParam6Triggered = false; 
let param5HoldStartTime = 0;   
let isHoldingForParam8 = false; 
let lockHistory = [];          
let lastTapTime = 0;
let lastExecutionTime = 0; 
let swipeActionTriggered = false; 
let legsWereOpenAtStart = false;  
let localSwipeCount = 0;          
let param8PressCount = 0;         
let swipeCounterForSwelling = 0;  
let hasTriggeredParam13Liquid = false; 
let isUnderwearReset = false; // 🛡️ 效能鎖定旗標：防止內褲狀態狂刷 DOM

// 🌟 追蹤互動與彈窗狀態
let hasUnlockedReward = false; 
let sessionRewardShown = false; 
let isRewardModalOpen = false; 
let isBioModalOpen = false;    

// 🔍 特寫功能狀態變數
let isPipActive = false;              

// 🚀 DOM 狀態快照與快取池 (效能核心，避免每幀查詢 DOM)
let domCache = {};
function getDOM(id) {
  if (!domCache[id]) domCache[id] = document.getElementById(id);
  return domCache[id];
}

let lastTreatUIDisplay = "";
let lastBtnMedicineStyle = "";
let lastHitboxDisplay = ""; // 🛡️ 效能鎖定旗標：防止 Hitbox 狂刷 DOM

// 📊 全網實時計數器狀態
let globalTotalCount = 0;
let globalDailyCount = 0;
let globalViewsTotal = 0;
let globalViewsDaily = 0;
let hasCountedThisSwipe = false; 
const COUNTER_NAMESPACE = 'waifu_live2d_project_2026'; 
const KEY_TOTAL = 'interactive_clicks'; 
const KEY_VIEWS_TOTAL = 'site_views_total';
const ABACUS_URL = 'https://abacus.jasoncameron.dev';

// 📈 實時滾動數字特效狀態變數
let displayedTotalCount = 0;
let displayedDailyCount = 0;
let displayedViewsTotal = 0;
let displayedViewsDaily = 0;
let isCounterInitialized = false; 
let lastRenderedTotal = -1;
let lastRenderedDaily = -1;
let lastRenderedViewsTotal = -1;
let lastRenderedViewsDaily = -1;

let userScaleOffset = 0.5; 
let zoomDirection = 0; 
let globalElapsedTime = 0; // 🛡️ 取代 Date.now() 解決呼吸動畫卡頓

// 🔍 畫中畫 (PiP) 特寫系統狀態
let pipContainer;
let pipSprite;
let pipRenderTexture;
let pipMask;
let pipBorder;
let pipLabelText; 
let currentPipAlpha = 0;

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * ⏳ 建立全螢幕載入動畫 UI
 */
function createLoadingUI() {
  const loader = document.createElement('div');
  loader.id = 'app-loader';
  loader.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: #111111;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    z-index: 99999; transition: opacity 0.5s ease-out;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes loader-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes loader-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
  `;
  document.head.appendChild(style);

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 60px; height: 60px; border: 6px solid rgba(255, 179, 198, 0.2);
    border-top-color: #ffb3c6; border-radius: 50%;
    animation: loader-spin 1s linear infinite; margin-bottom: 25px;
    box-shadow: 0 0 15px rgba(255, 179, 198, 0.4);
  `;
  
  const text = document.createElement('div');
  text.id = 'app-loader-text';
  text.style.cssText = `
    color: #ffb3c6; font-size: 22px; font-weight: bold; font-family: sans-serif;
    text-shadow: 0 0 10px rgba(255, 179, 198, 0.6);
    animation: loader-pulse 2s ease-in-out infinite;
  `;
  text.innerText = '準備載入...';

  loader.appendChild(spinner);
  loader.appendChild(text);
  document.body.appendChild(loader);
}

async function updateLoadingText(msg) {
  const el = getDOM('app-loader-text');
  if (el) el.innerText = msg;
  await new Promise(resolve => requestAnimationFrame(resolve));
}

function hideLoadingUI() {
  const el = getDOM('app-loader');
  if (el) {
    el.style.opacity = '0';
    setTimeout(() => {
        el.remove();
        showAgeVerification(); 
    }, 500);
  }
}

function showAgeVerification() {
  const gate = document.createElement('div');
  gate.id = 'age-gate-ui';
  gate.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(10, 10, 15, 0.95); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
    display: flex; flex-direction: column; justify-content: center; align-items: center; 
    z-index: 100000; color: white; font-family: sans-serif; user-select: none;
    transition: opacity 0.5s ease-out; opacity: 1;
  `;

  gate.innerHTML = `
    <div style="font-size: 26px; font-weight: 900; color: #ffb3c6; margin-bottom: 25px; text-shadow: 0 0 15px rgba(255,179,198,0.7); letter-spacing: 2px; text-align: center;">🔞 警告：限制級內容</div>
    <div style="font-size: 18px; margin-bottom: 40px; font-weight: bold; color: #ffffff; letter-spacing: 1px; text-align: center; line-height: 1.5; padding: 0 20px;">
      本網站包含成人專屬之色情互動內容。<br>請問您是否已滿 18 歲？
    </div>
    <div style="display: flex; gap: 20px;">
      <button id="btn-age-yes" style="background: linear-gradient(135deg, #ff4d88, #ff85a2); border: 2px solid #ffccdd; color: white; padding: 14px 45px; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(255,77,136,0.5); transition: transform 0.1s;">是 (Yes)</button>
      <button id="btn-age-no" style="background: #333333; border: 2px solid #555555; color: #aaaaaa; padding: 14px 45px; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; transition: transform 0.1s;">否 (No)</button>
    </div>
  `;
  document.body.appendChild(gate);

  const btnYes = document.getElementById('btn-age-yes');
  const btnNo = document.getElementById('btn-age-no');

  btnYes.addEventListener('pointerdown', (e) => { e.stopPropagation(); btnYes.style.transform = 'scale(0.95)'; });
  btnYes.addEventListener('pointerup', (e) => { e.stopPropagation(); btnYes.style.transform = 'scale(1)'; });
  btnYes.addEventListener('click', (e) => {
    e.stopPropagation();
    gate.style.opacity = '0';
    setTimeout(() => gate.remove(), 500);
  });

  btnNo.addEventListener('pointerdown', (e) => { e.stopPropagation(); btnNo.style.transform = 'scale(0.95)'; });
  btnNo.addEventListener('pointerup', (e) => { e.stopPropagation(); btnNo.style.transform = 'scale(1)'; });
  btnNo.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = 'https://www.instagram.com/zzzzihhj/';
  });

  gate.addEventListener('pointerdown', e => e.stopPropagation());
  gate.addEventListener('pointermove', e => e.stopPropagation());
  gate.addEventListener('pointerup', e => e.stopPropagation());
}

function getTaiwanDateString() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const twTime = new Date(utc + (3600000 * 8));
  const yyyy = twTime.getFullYear();
  const mm = String(twTime.getMonth() + 1).padStart(2, '0');
  const dd = String(twTime.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

let lastSyncedDate = getTaiwanDateString(); 

function buildNoCacheUrl(base) {
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}_=${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function safeFetch(url) {
  return fetch(buildNoCacheUrl(url), { cache: 'no-store' })
    .then(res => res.ok ? res.json() : null)
    .catch(() => null);
}

function setupCounter() {
  const counterDiv = document.createElement('div');
  counterDiv.id = 'global-counter-ui';
  counterDiv.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.7); border: 2px solid #ffb3c6; border-radius: 20px;
    padding: 14px 30px; color: #ffffff; font-family: sans-serif; font-weight: bold;
    text-align: center; box-shadow: 0 6px 20px rgba(255, 179, 198, 0.35); z-index: 10000;
    pointer-events: none; user-select: none; white-space: nowrap;
    transition: transform 0.1s ease-out; display: flex; flex-direction: column; gap: 4px;
  `;
  document.body.appendChild(counterDiv);

  counterDiv.innerHTML = `
    <div style="font-size: 14px; color: #a1c4fd; padding-bottom: 4px; border-bottom: 1px solid rgba(161, 196, 253, 0.2); margin-bottom: 4px; display: flex; justify-content: center; gap: 14px;">
      <div>今日瀏覽: <span id="views-daily" style="color: #66a6ff;">0</span></div>
      <div>歷史瀏覽: <span id="views-total" style="color: #4facfe;">0</span></div>
    </div>
    <div style="font-size: 16px; color: #ffb3c6;">今日被掰穴次數: <span id="count-daily" style="font-size: 18px; color: #ffb3c6;">0</span></div>
    <div style="font-size: 18px; color: #ffffff; border-top: 1px solid rgba(255, 179, 198, 0.3); padding-top: 4px; margin-top: 2px;">
      所有玩家總掰穴次數: <span id="count-total" style="font-size: 22px; color: #ff4d88;">0</span>
    </div>
  `;

  displayedTotalCount = 0;
  displayedDailyCount = 0;
  displayedViewsTotal = 0;
  displayedViewsDaily = 0;
  isCounterInitialized = true;

  updateCounterLayout(); 
  triggerPageView();
  syncWithCloud();
  setInterval(syncWithCloud, 3000); 
}

function updateCounterLayout() {
  const counterDiv = getDOM('global-counter-ui');
  if (!counterDiv) return;
  
  const isMobile = window.innerWidth < window.innerHeight;
  if (isMobile) {
    counterDiv.style.top = 'auto';
    counterDiv.style.bottom = '140px';
    counterDiv.style.left = '50%';
    counterDiv.style.transform = 'translateX(-50%)';
  } else {
    counterDiv.style.bottom = 'auto';
    counterDiv.style.top = '25px';
    counterDiv.style.left = '25px';
    counterDiv.style.transform = 'none';
  }
}

function createCharacterTagUI() {
  if (document.getElementById('character-tag-ui')) return;

  const tagDiv = document.createElement('div');
  tagDiv.id = 'character-tag-ui';
  tagDiv.style.cssText = `
    position: fixed; top: 25px; left: 50%; transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.65); border: 1px solid rgba(255, 179, 198, 0.4);
    border-radius: 16px; padding: 10px 28px; text-align: center;
    color: #ffffff; font-family: sans-serif; font-weight: bold;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6); z-index: 9999;
    user-select: none; pointer-events: auto; cursor: pointer;
    transition: all 0.25s ease-out;
  `;

  tagDiv.addEventListener('mouseenter', () => {
    tagDiv.style.border = '1px solid #ffb3c6';
    tagDiv.style.boxShadow = '0 4px 20px rgba(255, 179, 198, 0.35)';
  });
  tagDiv.addEventListener('mouseleave', () => {
    tagDiv.style.border = '1px solid rgba(255, 179, 198, 0.4)';
    tagDiv.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.6)';
  });

  const nameLayer = document.createElement('div');
  nameLayer.id = 'char-name-display';
  nameLayer.style.cssText = `
    font-size: 20px; color: #ffb3c6; text-shadow: 0 0 8px rgba(255, 179, 198, 0.6);
    margin-bottom: 2px; font-weight: 900;
  `;
  nameLayer.innerText = "口袋穴天使"; 

  const subLayer = document.createElement('div');
  subLayer.style.cssText = `
    font-size: 13px; color: #ffffff; opacity: 0.85; letter-spacing: 3px; font-weight: bold;
  `;
  subLayer.innerText = "試玩版";

  tagDiv.appendChild(nameLayer);
  tagDiv.appendChild(subLayer);

  tagDiv.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
  tagDiv.addEventListener('click', (e) => {
    e.stopPropagation(); 
    const currentName = nameLayer.innerText;
    const newName = prompt("📝 請輸入想要更改的自訂角色名稱：", currentName);
    if (newName !== null && newName.trim() !== "") {
      nameLayer.innerText = newName.trim();
      spawnFloatingText(window.innerWidth / 2, window.innerHeight * 0.22, "主體稱謂已更新 ✨", "#ffb3c6", 1500, "24px");
    }
  });

  document.body.appendChild(tagDiv);
}

function createTreatmentUI() {
  if (document.getElementById('treatment-ui')) return;

  const div = document.createElement('div');
  div.id = 'treatment-ui';
  div.style.cssText = `
    position: fixed; left: 50%; transform: translateX(-50%) scale(0.9);
    background: rgba(15, 15, 20, 0.85); border: 2px solid #ff4d88; border-radius: 20px;
    padding: 16px 26px; display: none; flex-direction: column; align-items: center;
    gap: 14px; z-index: 10001; box-shadow: 0 8px 30px rgba(255, 77, 136, 0.45);
    transition: bottom 0.3s ease-out, opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
    opacity: 0; color: #ffffff; font-family: sans-serif; pointer-events: auto; user-select: none;
  `;

  div.innerHTML = `
    <div style="font-weight: 900; color: #ffb3c6; font-size: 15px; text-shadow: 0 0 8px rgba(255,179,198,0.6); letter-spacing: 1px;">🩹 陰部外翻腫脹治療控制台</div>
    <div style="display: flex; gap: 16px;">
      <button id="btn-treat-open" style="background: linear-gradient(135deg, #ff4d88, #ff85a2); border: none; color: white; padding: 10px 22px; border-radius: 12px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 12px rgba(255,77,136,0.35); transition: transform 0.1s; font-size: 14px;">👐 掰開</button>
      <button id="btn-treat-medicine" style="background: #555555; border: none; color: white; padding: 10px 22px; border-radius: 12px; cursor: not-allowed; font-weight: bold; opacity: 0.5; transition: all 0.2s; font-size: 14px;">🧴 擦藥</button>
    </div>
    <div style="font-size: 12px; color: #ffcc00; font-weight: bold; margin-top: 2px; text-shadow: 0 0 6px rgba(0,0,0,0.8); letter-spacing: 0.5px;">⚠️ 腫脹太嚴重了，必須先按下「掰開」才能擦藥！</div>
  `;
  document.body.appendChild(div);

  const btnOpen = document.getElementById('btn-treat-open');
  const btnMedicine = document.getElementById('btn-treat-medicine');

  btnOpen.addEventListener('pointerdown', (e) => e.stopPropagation());
  btnOpen.addEventListener('click', (e) => {
    e.stopPropagation();
    targetParam14 = 1.0; 
    spawnFloatingText(window.innerWidth / 2, window.innerHeight * 0.4, "掰開私處檢查，並塗上藥膏！", "#ff3366", 1800, "26px");
  });

  btnMedicine.addEventListener('pointerdown', (e) => e.stopPropagation());
  btnMedicine.addEventListener('click', (e) => {
    e.stopPropagation();
    if (targetParam14 < 1.0) {
      spawnFloatingText(window.innerWidth / 2, window.innerHeight * 0.4, "⚠️ 必須先按下「掰開」才能擦藥！", "#ffcc00", 1800, "24px");
      return;
    }
    targetParam14 = 0;               
    swipeCounterForSwelling = 0;    
    spawnFloatingText(window.innerWidth / 2, window.innerHeight * 0.4, "擦藥治療成功，私處恢復原狀 ✨", "#a1c4fd", 2000, "26px");
  });
}

function showBioModal() {
  if (document.getElementById('bio-modal-ui')) return;

  isBioModalOpen = true; 
  targetParam5 = -1; 
  param5HoldStartTime = 0; 
  isOnModel = false;
  swipeAxis = null;
  isHoldingForParam8 = false;

  const modal = document.createElement('div');
  modal.id = 'bio-modal-ui';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(10, 10, 15, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    display: flex; flex-direction: column; justify-content: center; align-items: center; 
    z-index: 10005; pointer-events: auto; opacity: 0; 
    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1); user-select: none;
  `;

  modal.addEventListener('pointerdown', e => e.stopPropagation());
  modal.addEventListener('pointermove', e => e.stopPropagation());
  modal.addEventListener('pointerup', e => e.stopPropagation());

  modal.innerHTML = `
    <div style="position: relative; width: 85vw; max-width: 500px; padding: 40px 30px; border: 3px solid #ff4d88; border-radius: 24px; box-shadow: 0 0 40px rgba(255, 77, 136, 0.4); background: rgba(0, 0, 0, 0.9);">
      <div id="btn-close-bio" style="position: absolute; top: 16px; right: 16px; background: rgba(0, 0, 0, 0.75); color: #ffffff; border: 2px solid #ffb3c6; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-family: sans-serif; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.5); transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.2s;">✕</div>
      <div style="color: #ffccdd; font-size: 16px; line-height: 1.8; font-family: sans-serif; text-align: left; font-weight: bold; letter-spacing: 1.5px;">
        我是一個超級淫蕩的又沒有羞恥心的暴露色女，<br>
        明明知道女生的身體只有小穴是絕對不能被別人<br>
        看到的，我卻還是厚著臉皮做了這款遊戲…<br><br>
        一想到我沒穿衣服被好多陌生人盡情瀏覽、玩弄<br>
        ，還能隨意把我的騷穴掰開來欣賞、截圖、評論<br>
        ，我就興奮到小穴一直流水，忍不住偷偷自慰高<br>
        潮了好幾次…<br><br>
        可是我又好怕被認識的人發現…<br><br>
        萬一被朋友、同學或是熟人看到我這副淫亂的模<br>
        樣，發現我其實是一個喜歡掰穴給別人看的變態<br>
        暴露婊，應該會直接社死吧...
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.offsetHeight; 
  modal.style.opacity = '1';

  const closeBtn = document.getElementById('btn-close-bio');
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.transform = 'scale(1.15)'; closeBtn.style.color = '#ff4d88'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.transform = 'scale(1)'; closeBtn.style.color = '#ffffff'; });
  
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.remove();
        isBioModalOpen = false; 
    }, 400);
  });
}

function showRewardModal() {
  if (document.getElementById('reward-modal-ui')) return;

  isRewardModalOpen = true; 
  targetParam5 = -1; 
  param5HoldStartTime = 0; 
  isOnModel = false;
  swipeAxis = null;
  isHoldingForParam8 = false;

  const modal = document.createElement('div');
  modal.id = 'reward-modal-ui';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(10, 10, 15, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    display: flex; flex-direction: column; justify-content: center; align-items: center; 
    z-index: 10005; pointer-events: auto; opacity: 0; 
    transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1); user-select: none;
  `;

  modal.addEventListener('pointerdown', e => e.stopPropagation());
  modal.addEventListener('pointermove', e => e.stopPropagation());
  modal.addEventListener('pointerup', e => e.stopPropagation());

  modal.innerHTML = `
    <div style="position: relative; max-width: 90vw; max-height: 75vh; border: 3px solid #ff4d88; border-radius: 24px; overflow: hidden; box-shadow: 0 0 40px rgba(255, 77, 136, 0.7); background: #000000; display: flex; justify-content: center; align-items: center;">
      <img src="public/model/reward.jpg" alt="終極福利解鎖" style="max-width: 100%; max-height: 75vh; object-fit: contain; display: block;">
      <div id="btn-close-reward" style="position: absolute; top: 16px; right: 16px; background: rgba(0, 0, 0, 0.75); color: #ffffff; border: 2px solid #ffb3c6; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-family: sans-serif; font-size: 18px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.5); transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.2s;">✕</div>
    </div>
    <div style="color: #ffb3c6; font-size: 24px; font-weight: 900; margin-top: 25px; text-shadow: 0 0 12px rgba(255, 179, 198, 0.85); font-family: sans-serif; letter-spacing: 2px; text-align: center; padding: 0 20px; line-height: 1.4;">🎉 被掰穴到高潮了！大滿足福利照片解鎖。 🎉</div>
  `;
  document.body.appendChild(modal);

  modal.offsetHeight; 
  modal.style.opacity = '1';

  const closeBtn = document.getElementById('btn-close-reward');
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.transform = 'scale(1.15)'; closeBtn.style.color = '#ff4d88'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.transform = 'scale(1)'; closeBtn.style.color = '#ffffff'; });
  
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.remove();
        isRewardModalOpen = false; 
    }, 500);
  });
}

function triggerPageView() {
  const dailyViewsKey = `site_views_${getTaiwanDateString()}`;
  safeFetch(`${ABACUS_URL}/hit/${COUNTER_NAMESPACE}/${KEY_VIEWS_TOTAL}`).then(data => {
      if (data && data.value) globalViewsTotal = Math.max(globalViewsTotal, data.value);
  });
  safeFetch(`${ABACUS_URL}/hit/${COUNTER_NAMESPACE}/${dailyViewsKey}`).then(data => {
      if (data && data.value) globalViewsDaily = Math.max(globalViewsDaily, data.value);
  });
}

function syncWithCloud() {
  const dailyClicksKey = `interactive_clicks_${getTaiwanDateString()}`;
  const dailyViewsKey = `site_views_${getTaiwanDateString()}`;

  Promise.all([
    safeFetch(`${ABACUS_URL}/get/${COUNTER_NAMESPACE}/${KEY_TOTAL}`),
    safeFetch(`${ABACUS_URL}/get/${COUNTER_NAMESPACE}/${dailyClicksKey}`),
    safeFetch(`${ABACUS_URL}/get/${COUNTER_NAMESPACE}/${KEY_VIEWS_TOTAL}`),
    safeFetch(`${ABACUS_URL}/get/${COUNTER_NAMESPACE}/${dailyViewsKey}`)
  ]).then(([totalData, dailyData, totalViews, dailyViews]) => {
    const tVal = totalData && typeof totalData.value === 'number' ? totalData.value : -1;
    const dVal = dailyData && typeof dailyData.value === 'number' ? dailyData.value : -1;
    const tvVal = totalViews && typeof totalViews.value === 'number' ? totalViews.value : -1;
    const dvVal = dailyViews && typeof dailyViews.value === 'number' ? dailyViews.value : -1;

    const isIdle = (Date.now() - lastTapTime) > 3000;

    if (tVal !== -1) globalTotalCount = isIdle ? tVal : Math.max(globalTotalCount, tVal);
    if (dVal !== -1) globalDailyCount = isIdle ? dVal : Math.max(globalDailyCount, dVal);
    if (tvVal !== -1) globalViewsTotal = isIdle ? tvVal : Math.max(globalViewsTotal, tvVal);
    if (dvVal !== -1) globalViewsDaily = isIdle ? dvVal : Math.max(globalViewsDaily, dvVal);
  }).catch(() => {});
}

function handleGlobalDoubleTap(clientX, clientY) {
  if (isRewardModalOpen || isBioModalOpen) return; 

  const currentTime = Date.now();
  if (currentTime - lastTapTime < 300) {
    if (currentTime - lastExecutionTime > 50) {
      lastExecutionTime = currentTime;

      if (lockHistory.length > 0) {
        const lastLocked = lockHistory.pop(); 
        if (lastLocked === 'Param2') { isParam2Locked = false; targetClothes = -1; targetParam5 = -1; }
        else if (lastLocked === 'Param7') { isParam7Locked = false; targetParam7 = -1; }
        else if (lastLocked === 'Param3') { isParam3Locked = false; targetParam3 = -1; }
        else if (lastLocked === 'Param') { isParamLocked = false; targetParam = -1; }
      } else {
        if (targetParam9 === 1 && targetParam10 === 1) {
          targetParam10 = 0;
          targetClothes = -1; 
          isParam2Locked = false;
          spawnFloatingText(clientX, clientY, "穿回內褲...", "#ffb3c6", 1500, "28px");
        } else if (targetParam9 === 1 && targetParam10 === 0) {
          targetParam9 = 0;
          spawnFloatingText(clientX, clientY, "大腿合上了...", "#ffb3c6", 1500, "28px");
        } else if (targetParam11 === 1) {
          targetParam11 = 0;
          spawnFloatingText(clientX, clientY, "收回絲襪參數...✨", "#ffb3c6", 1500, "28px");
        } else if (targetParam10 === 1) {
          targetParam10 = 0;
          targetClothes = -1; 
          isParam2Locked = false;
          spawnFloatingText(clientX, clientY, "穿回內褲...", "#ffb3c6", 1500, "28px");
        }
      }
    }
  }
  lastTapTime = currentTime;
}

function incrementGlobalCount() {
  globalTotalCount++;
  globalDailyCount++;
  
  const counterDiv = getDOM('global-counter-ui');
  if (counterDiv) {
    const isMobile = window.innerWidth < window.innerHeight;
    const baseTransform = isMobile ? 'translateX(-50%)' : 'none';
    counterDiv.style.transform = `${baseTransform} scale(1.06)`;
    setTimeout(() => { if (counterDiv) counterDiv.style.transform = `${baseTransform} scale(1)`; }, 120);
  }
  
  const dailyClicksKey = `interactive_clicks_${getTaiwanDateString()}`;

  safeFetch(`${ABACUS_URL}/hit/${COUNTER_NAMESPACE}/${KEY_TOTAL}`).then(data => {
      if (data && data.value) globalTotalCount = Math.max(globalTotalCount, data.value);
  });
  safeFetch(`${ABACUS_URL}/hit/${COUNTER_NAMESPACE}/${dailyClicksKey}`).then(data => {
      if (data && data.value) globalDailyCount = Math.max(globalDailyCount, data.value);
  });
}

function resize() {
  if (!model || !app) return;

  try {
    if (app.renderer && typeof app.renderer.resize === 'function') {
      app.renderer.resize(window.innerWidth, window.innerHeight);
    }

    const isMobile = window.innerWidth < window.innerHeight;
    const paddingFactor = isMobile ? 0.8 : 1.0; 
    
    const scaleByWidth = (window.innerWidth * 0.00055) * paddingFactor; 
    const scaleByHeight = (window.innerHeight * 0.0004) * paddingFactor;

    let baseScale = Math.min(scaleByWidth, scaleByHeight);
    let finalScale = baseScale * userScaleOffset;

    if (finalScale > 2.0 || finalScale < 0.001 || isNaN(finalScale)) {
      finalScale = 0.15; 
    }

    model.scale.set(finalScale);
    model.anchor.set(0.5, 0.5);
    model.x = window.innerWidth / 2;
    model.y = window.innerHeight / 2;

    const btnIg = getDOM('btn-ig-link');
    const btnPatreon = getDOM('btn-patreon-link'); // 新增 Patreon 按鈕的 RWD 設定
    const btnPip = getDOM('btn-pip-toggle');
    const btn18 = getDOM('btn-reward-gallery');
    const btnBio = getDOM('btn-bio-text'); 
    const btnX2 = getDOM('btn-zoom-x2');
    const btnPlus = getDOM('btn-zoom-plus');
    const btnMinus = getDOM('btn-zoom-minus');
    
    if (btnPlus && btnMinus && btnX2) {
      const btnSize = isMobile ? '97.5px' : '65px'; 
      const fontSize = isMobile ? '52.5px' : '35px'; 
      const x2FontSize = isMobile ? '42px' : '28px';
      const btn18FontSize = isMobile ? '35px' : '24px';
      
      if (btnIg) { btnIg.style.width = btnSize; btnIg.style.height = btnSize; btnIg.style.fontSize = btn18FontSize; }
      if (btnPatreon) { btnPatreon.style.width = btnSize; btnPatreon.style.height = btnSize; btnPatreon.style.fontSize = btn18FontSize; }
      if (btnPip) { btnPip.style.width = btnSize; btnPip.style.height = btnSize; btnPip.style.fontSize = btn18FontSize; }
      if (btn18) { btn18.style.width = btnSize; btn18.style.height = btnSize; btn18.style.fontSize = btn18FontSize; }
      if (btnBio) { btnBio.style.width = btnSize; btnBio.style.height = btnSize; btnBio.style.fontSize = btn18FontSize; }
      btnX2.style.width = btnSize; btnX2.style.height = btnSize; btnX2.style.fontSize = x2FontSize;
      btnPlus.style.width = btnSize; btnPlus.style.height = btnSize; btnPlus.style.fontSize = fontSize;
      btnMinus.style.width = btnSize; btnMinus.style.height = btnSize; btnMinus.style.fontSize = fontSize;
    }

    const treatUI = getDOM('treatment-ui');
    if (treatUI) {
      treatUI.style.bottom = isMobile ? '360px' : '60px';
    }

    if (typeof updatePiPLayout === 'function') {
      updatePiPLayout();
    }
    updateCounterLayout();
  } catch (err) {
    console.error("Resize 計算失敗:", err);
  }
}

/**
 * 🎨 建立側邊按鈕 (加入 IG 連結、放大鏡特寫、福利按鈕與獨白按鈕)
 */
function createZoomButtons() {
  if (document.getElementById('zoom-container')) return; 

  const container = document.createElement('div');
  container.id = 'zoom-container';
  container.style.cssText = `
    position: fixed; bottom: 80px; right: 25px;
    display: flex; flex-direction: column; gap: 20px; z-index: 6000;
  `;

  const btnStyle = `
    border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.8);
    background: rgba(0, 0, 0, 0.7); color: white; font-weight: bold; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    user-select: none; touch-action: none; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    transition: transform 0.1s, box-shadow 0.2s;
  `;

  const btn18 = document.createElement('button');
  btn18.id = 'btn-reward-gallery';
  btn18.innerText = '18+';
  btn18.style.cssText = btnStyle;
  btn18.style.background = 'linear-gradient(135deg, #ff0055, #ff4d88)';
  btn18.style.color = '#ffffff';
  btn18.style.border = '2px solid #ffccdd';
  btn18.style.boxShadow = '0 0 15px rgba(255, 77, 136, 0.8)';
  btn18.style.display = hasUnlockedReward ? 'flex' : 'none'; 
  
  btn18.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
  btn18.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    showRewardModal();
  });
  btn18.addEventListener('mouseenter', () => btn18.style.transform = 'scale(1.1)');
  btn18.addEventListener('mouseleave', () => btn18.style.transform = 'scale(1)');

  const btnBio = document.createElement('button');
  btnBio.id = 'btn-bio-text';
  btnBio.innerText = '💬';
  btnBio.style.cssText = btnStyle;
  
  btnBio.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
  btnBio.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    showBioModal();
  });
  btnBio.addEventListener('mouseenter', () => btnBio.style.transform = 'scale(1.1)');
  btnBio.addEventListener('mouseleave', () => btnBio.style.transform = 'scale(1)');

  // 新增 Patreon 按鈕
  const btnPatreon = document.createElement('button');
  btnPatreon.id = 'btn-patreon-link';
  btnPatreon.innerText = 'PT';
  btnPatreon.style.cssText = btnStyle;
  btnPatreon.style.background = 'linear-gradient(135deg, #FF424D, #ff6b74)';
  btnPatreon.style.color = '#ffffff';
  btnPatreon.style.border = '2px solid #ffffff';
  
  btnPatreon.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
  btnPatreon.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    window.open('https://www.patreon.com/c/XingNuGame', '_blank');
  });
  btnPatreon.addEventListener('mouseenter', () => btnPatreon.style.transform = 'scale(1.1)');
  btnPatreon.addEventListener('mouseleave', () => btnPatreon.style.transform = 'scale(1)');

  const btnIg = document.createElement('button');
  btnIg.id = 'btn-ig-link';
  btnIg.innerText = 'IG';
  btnIg.style.cssText = btnStyle;
  btnIg.style.background = 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';
  btnIg.style.color = '#ffffff';
  btnIg.style.border = '2px solid #ffffff';
  
  btnIg.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
  btnIg.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    window.open('https://www.instagram.com/zzzzihhj/', '_blank');
  });
  btnIg.addEventListener('mouseenter', () => btnIg.style.transform = 'scale(1.1)');
  btnIg.addEventListener('mouseleave', () => btnIg.style.transform = 'scale(1.1)');

  const btnPip = document.createElement('button');
  btnPip.id = 'btn-pip-toggle';
  btnPip.innerText = '🔍';
  btnPip.style.cssText = btnStyle;

  btnPip.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
  btnPip.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    isPipActive = !isPipActive;
    if (isPipActive) {
      btnPip.style.background = 'linear-gradient(135deg, #ff4d88, #ff85a2)';
      btnPip.style.border = '2px solid #ffccdd';
      spawnFloatingText(window.innerWidth / 2, window.innerHeight * 0.3, "特寫開啟 🔍", "#ffb3c6", 1500, "28px");
    } else {
      btnPip.style.background = 'rgba(0, 0, 0, 0.7)';
      btnPip.style.border = '2px solid rgba(255, 255, 255, 0.8)';
      spawnFloatingText(window.innerWidth / 2, window.innerHeight * 0.3, "特寫關閉 🔍", "#ff4d4d", 1500, "28px");
    }
  });
  btnPip.addEventListener('mouseenter', () => btnPip.style.transform = 'scale(1.1)');
  btnPip.addEventListener('mouseleave', () => btnPip.style.transform = 'scale(1.1)');

  const btnX2 = document.createElement('button');
  btnX2.id = 'btn-zoom-x2';
  btnX2.innerText = 'x2'; 
  btnX2.style.cssText = btnStyle;
  btnX2.style.color = '#ffb3c6'; 
  
  btnX2.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (userScaleOffset === 1.0) {
      userScaleOffset = 0.5; 
      btnX2.style.color = '#ffb3c6'; 
    } else {
      userScaleOffset = 1.0; 
      btnX2.style.color = '#ff4d88'; 
    }
    resize();
    if (app.render) app.render();
  });

  const btnPlus = document.createElement('button');
  btnPlus.id = 'btn-zoom-plus';
  btnPlus.innerText = '＋'; 
  btnPlus.style.cssText = btnStyle;

  const btnMinus = document.createElement('button');
  btnMinus.id = 'btn-zoom-minus';
  btnMinus.innerText = '－'; 
  btnMinus.style.cssText = btnStyle;

  const setZoom = (dir) => (e) => { e.preventDefault(); zoomDirection = dir; };
  const stopZoom = (e) => { e.preventDefault(); zoomDirection = 0; };

  btnPlus.addEventListener('pointerdown', setZoom(1));
  btnMinus.addEventListener('pointerdown', setZoom(-1));

  const stopEvents = ['pointerup', 'pointerleave', 'pointercancel', 'pointerout'];
  stopEvents.forEach(evt => {
    btnPlus.addEventListener(evt, stopZoom);
    btnMinus.addEventListener(evt, stopZoom);
  });

  container.appendChild(btn18); 
  container.appendChild(btnBio); 
  container.appendChild(btnPatreon); // 放置在 IG 的上方 
  container.appendChild(btnIg);  
  container.appendChild(btnPip); 
  container.appendChild(btnX2);
  container.appendChild(btnPlus);
  container.appendChild(btnMinus);
  document.body.appendChild(container);
}

function createEffectContainer() {
  if (document.getElementById('effect-container')) return;
  const container = document.createElement('div');
  container.id = 'effect-container';
  container.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    pointer-events: none; z-index: 9999; overflow: hidden;
  `;
  document.body.appendChild(container);
}

function spawnFloatingText(x, y, text = "嗯...❤️", color = "#ffb3c6", duration = 1500, fontSize = "28px") {
  const container = getDOM('effect-container');
  if (!container) return;

  const textEl = document.createElement('div');
  textEl.innerText = text;
  textEl.style.cssText = `
    position: absolute; left: ${x}px; top: ${y}px; color: ${color}; 
    font-size: ${fontSize}; font-weight: bold; font-family: sans-serif;
    text-shadow: 2px 2px 6px rgba(0,0,0,0.8); transform: translate(-50%, -50%); 
    opacity: 0; white-space: nowrap; 
  `;

  container.appendChild(textEl);

  const animation = textEl.animate([
    { transform: 'translate(-50%, -50%)', opacity: 0 },
    { transform: 'translate(-50%, -70%)', opacity: 1, offset: 0.1 },  
    { transform: 'translate(-50%, -100%)', opacity: 1, offset: 0.8 }, 
    { transform: 'translate(-50%, -120%)', opacity: 0 }                
  ], { duration: duration, easing: 'ease-out', fill: 'forwards' });

  animation.onfinish = () => { textEl.remove(); };
}

// 移除原有的 30 次觸發福利照機制，僅保留流水特效機制
function triggerClimaxEvents(x, y) {
  if (param8PressCount === 10) {
    targetParam12 = 1; 
    spawnFloatingText(x, y, "受不了刺激流出液體了...💧", "#00f2fe", 2000, "28px");
  }
  if (param8PressCount === 25) {
    hasTriggeredParam13Liquid = true;
    spawnFloatingText(x, y + 40, "受到刺激又流出來了...💧", "#00e5ff", 2500, "32px");
  }
}

function createInvisibleHitbox() {
  if (document.getElementById('param8-invisible-hitbox')) return;
  
  const hitbox = document.createElement('div');
  hitbox.id = 'param8-invisible-hitbox';
  hitbox.style.cssText = `
    position: fixed; left: 50%; top: 38%; width: 60vw; height: 35vh;
    max-width: 400px; max-height: 400px; transform: translate(-50%, -50%);
    z-index: 5000; display: none; touch-action: none;
  `;

  hitbox.addEventListener('pointerdown', (e) => {
    if (isRewardModalOpen || isBioModalOpen) return;

    if (targetParam14 >= 0.5) {
      spawnFloatingText(e.clientX, e.clientY - 30, "⚠️ 腫脹嚴重，請先治療！", "#ffcc00", 1500, "24px");
      return; 
    }

    if (isParam7Locked && targetParam9 === 1) {
      isOnModel = true;
      startX = e.clientX; startY = e.clientY;
      swipeAxis = null;
      isHoldingForParam8 = true;
      legsWereOpenAtStart = (targetParam9 === 1); 

      if (targetParam10 === 1) {
        param8PressCount++;
        triggerClimaxEvents(e.clientX, e.clientY - 30);
      }

      spawnFloatingText(e.clientX + 30, e.clientY - 60, "嗯...❤️", "#ffb3c6", 1500, "28px");
    }
  });

  document.body.appendChild(hitbox);
}

function setupPiP() {
  const isMobile = window.innerWidth < window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  
  const maxDimension = Math.max(window.screen?.width || 0, window.screen?.height || 0, window.innerWidth, window.innerHeight);
  const safeMaxRes = 4096 / (maxDimension || 2000); 
  let desiredRes = isMobile ? Math.max(dpr * 1.5, 2.5) : Math.max(dpr * 2, 4);
  const superRes = Math.min(desiredRes, safeMaxRes);

  pipRenderTexture = PIXI.RenderTexture.create({
    width: window.innerWidth, height: window.innerHeight, resolution: superRes, scaleMode: PIXI.SCALE_MODES.LINEAR 
  });
  
  pipSprite = new PIXI.Sprite(pipRenderTexture);
  pipContainer = new PIXI.Container();
  pipContainer.alpha = 0; 
  pipMask = new PIXI.Graphics();
  pipBorder = new PIXI.Graphics();
  
  const textStyle = new PIXI.TextStyle({
      fontFamily: 'sans-serif', fontSize: isMobile ? 18 : 24, fontWeight: 'bold',
      fill: ['#ffffff'], stroke: '#ffb3c6', strokeThickness: 4, dropShadow: true,
      dropShadowColor: '#000000', dropShadowBlur: 4, dropShadowAngle: Math.PI / 4, dropShadowDistance: 2,
  });
  pipLabelText = new PIXI.Text('小穴特寫', textStyle);
  
  pipContainer.addChild(pipSprite);
  pipContainer.addChild(pipMask);
  pipContainer.addChild(pipBorder);
  pipContainer.addChild(pipLabelText); 
  pipSprite.mask = pipMask;
  
  app.stage.addChild(pipContainer);
  updatePiPLayout();
}

function updatePiPLayout() {
  if (!pipContainer || !pipRenderTexture || !model) return;
  if (window.innerWidth > 0 && window.innerHeight > 0) {
    try {
      pipRenderTexture.resize(window.innerWidth, window.innerHeight);
    } catch(e) {
      console.warn("PiP Resize 被 GPU 限制保護攔截:", e);
    }
  }
  
  const isMobile = window.innerWidth < window.innerHeight;
  const baseSize = isMobile ? Math.min(window.innerWidth * 0.45, 250) : Math.min(window.innerWidth * 0.3, 420);
  const size = baseSize * 1.35; const padding = 25;
  
  pipContainer.x = window.innerWidth - size - padding;
  pipContainer.y = window.innerHeight * 0.3; 
  
  pipMask.clear().beginFill(0xffffff).drawRoundedRect(0, 0, size, size, 20).endFill();
  pipBorder.clear().lineStyle(6, 0xffb3c6, 0.9).drawRoundedRect(0, 0, size, size, 20);
  
  if (pipLabelText) {
      pipLabelText.x = 10; pipLabelText.y = -pipLabelText.height / 2; 
  }
  
  const fixedAbsoluteZoom = 0.45; 
  const currentModelScale = model.scale.y || 1; 
  const effectiveZoom = fixedAbsoluteZoom / currentModelScale; 
  
  const baseZoomLevel = 2.0; const finalZoomLevel = baseZoomLevel * effectiveZoom;
  pipSprite.scale.set(finalZoomLevel);
  
  const focusYOffset = 580; const yOffset = focusYOffset * currentModelScale; 
  const focusX = model.x; const focusY = model.y + yOffset;
  
  pipSprite.x = size / 2 - focusX * finalZoomLevel;
  pipSprite.y = size / 2 - focusY * finalZoomLevel;
}

function updateParams() {
  const currentDate = getTaiwanDateString();
  if (currentDate !== lastSyncedDate) {
    globalDailyCount = 0;
    displayedDailyCount = 0;
    globalViewsDaily = 0;
    displayedViewsDaily = 0;
    lastSyncedDate = currentDate;
    triggerPageView(); 
  }

  if (zoomDirection !== 0) {
    userScaleOffset += zoomDirection * 0.015;
    userScaleOffset = Math.max(0.1, Math.min(userScaleOffset, 5.0));
    resize(); 
  }

  // 🛡️ 效能優化：防止 Hitbox 狂刷 style 更新
  const hitbox = getDOM('param8-invisible-hitbox');
  if (hitbox) {
    const targetDisplay = (isParam7Locked && targetParam9 === 1) ? 'block' : 'none';
    if (lastHitboxDisplay !== targetDisplay) {
      hitbox.style.display = targetDisplay;
      lastHitboxDisplay = targetDisplay;
    }
  }

  if (isCounterInitialized) {
    const lerpCounter = (disp, target) => {
      if (disp < target) return disp + Math.max(1, Math.floor((target - disp) * 0.08));
      if (disp > target) return disp - Math.max(1, Math.floor((disp - target) * 0.08));
      return target;
    };

    displayedTotalCount = lerpCounter(displayedTotalCount, globalTotalCount);
    displayedDailyCount = lerpCounter(displayedDailyCount, globalDailyCount);
    displayedViewsTotal = lerpCounter(displayedViewsTotal, globalViewsTotal);
    displayedViewsDaily = lerpCounter(displayedViewsDaily, globalViewsDaily);

    let currentFloorTotal = Math.floor(displayedTotalCount);
    let currentFloorDaily = Math.floor(displayedDailyCount);
    let currentFloorViewsTotal = Math.floor(displayedViewsTotal);
    let currentFloorViewsDaily = Math.floor(displayedViewsDaily);

    // 🛡️ 效能優化：搭配 getDOM 快取避免每一幀 querySelector
    if (currentFloorDaily !== lastRenderedDaily) {
      const dailyEl = getDOM('count-daily');
      if (dailyEl) dailyEl.innerText = currentFloorDaily;
      lastRenderedDaily = currentFloorDaily;
    }
    if (currentFloorTotal !== lastRenderedTotal) {
      const totalEl = getDOM('count-total');
      if (totalEl) totalEl.innerText = currentFloorTotal;
      lastRenderedTotal = currentFloorTotal;
    }
    if (currentFloorViewsDaily !== lastRenderedViewsDaily) {
      const viewsDailyEl = getDOM('views-daily');
      if (viewsDailyEl) viewsDailyEl.innerText = currentFloorViewsDaily;
      lastRenderedViewsDaily = currentFloorViewsDaily;
    }
    if (currentFloorViewsTotal !== lastRenderedViewsTotal) {
      const viewsTotalEl = getDOM('views-total');
      if (viewsTotalEl) viewsTotalEl.innerText = currentFloorViewsTotal;
      lastRenderedViewsTotal = currentFloorViewsTotal;
    }
  }

  if (targetParam5 > 0 && !hasCountedThisSwipe) {
    hasCountedThisSwipe = true; 
    localSwipeCount++;

    // 新增：Param5 掰穴動作達 30 次時觸發福利照機制的邏輯
    if (localSwipeCount === 30 && !sessionRewardShown) {
      sessionRewardShown = true; 
      if (!hasUnlockedReward) {
        hasUnlockedReward = true;
        const btn18 = getDOM('btn-reward-gallery');
        if (btn18) btn18.style.display = 'flex'; 
      }
      showRewardModal(); 
    }

    if (targetParam10 === 1) {
      param8PressCount++;
      triggerClimaxEvents(window.innerWidth / 2, window.innerHeight * 0.58);
    }

    if (targetParam14 === 0) {
      swipeCounterForSwelling++;
      if (swipeCounterForSwelling >= 15) {
        targetParam14 = 0.5; 
        targetParam5 = -1; 
        targetParam7 = -1; 
        isParam7Locked = false;
        isHoldingForParam8 = false;
        spawnFloatingText(window.innerWidth / 2, window.innerHeight * 0.5, "小穴被你掰到外翻腫起來了！", "#ff3366", 5000, "32px");
      }
    }

    try {
      incrementGlobalCount(); 
    } catch (netErr) {
      console.warn("雲端同步被拒絕，已切換至獨立本機運作。");
    }
  }

  const treatUI = getDOM('treatment-ui');
  if (treatUI) {
    const currentTargetDisplay = (targetParam14 >= 0.5) ? 'flex' : 'none';
    if (currentTargetDisplay !== lastTreatUIDisplay) {
      if (currentTargetDisplay === 'flex') {
        treatUI.style.display = 'flex';
        treatUI.offsetHeight; 
        treatUI.style.opacity = '1';
        treatUI.style.transform = 'translateX(-50%) scale(1)';
      } else {
        treatUI.style.opacity = '0';
        treatUI.style.transform = 'translateX(-50%) scale(0.9)';
        setTimeout(() => {
          if (targetParam14 === 0) treatUI.style.display = 'none';
        }, 400); 
      }
      lastTreatUIDisplay = currentTargetDisplay;
    }

    if (targetParam14 >= 0.5) {
      const btnMedicine = getDOM('btn-treat-medicine');
      if (btnMedicine) {
        const targetBtnStyle = (targetParam14 >= 1.0) ? "active" : "disabled";
        if (targetBtnStyle !== lastBtnMedicineStyle) {
          if (targetBtnStyle === "active") {
            btnMedicine.style.background = 'linear-gradient(135deg, #4facfe, #00f2fe)';
            btnMedicine.style.opacity = '1';
            btnMedicine.style.cursor = 'pointer';
          } else {
            btnMedicine.style.background = '#555555';
            btnMedicine.style.opacity = '0.5';
            btnMedicine.style.cursor = 'not-allowed';
          }
          lastBtnMedicineStyle = targetBtnStyle;
        }
      }
    }
  }

  if (pipContainer) {
    let pipTargetAlpha = isPipActive ? 1.0 : 0.0;
    const alphaLerpSpeed = (pipTargetAlpha > currentPipAlpha) ? 0.15 : 0.05;
    currentPipAlpha = lerp(currentPipAlpha, pipTargetAlpha, alphaLerpSpeed); 
    pipContainer.alpha = currentPipAlpha;
    
    if (currentPipAlpha > 0.01) {
      pipContainer.visible = false; 
      try { app.renderer.render(app.stage, { renderTexture: pipRenderTexture, clear: true }); } 
      catch (e) { app.renderer.render(app.stage, pipRenderTexture, true); }
      pipContainer.visible = true; 
    }
  }

  if (!model?.internalModel?.coreModel) return;
  const core = model.internalModel.coreModel;
  
  currentParam9 = lerp(currentParam9, targetParam9, 0.15);
  core.setParameterValueById("Param9", currentParam9);

  currentParam10 = lerp(currentParam10, targetParam10, 0.15);
  core.setParameterValueById("Param10", currentParam10);

  if (targetParam9 === 1) {
    targetParam11 = 0;
  }

  let p11Speed = (targetParam9 === 1) ? 0.45 : 0.15;
  currentParam11 = lerp(currentParam11, targetParam11, p11Speed);
  core.setParameterValueById("Param11", currentParam11);

  // 🛡️ 效能終極優化：防止 DOM Trashing
  if (targetParam10 === 0) {
    targetParam12 = 0;
    // 只有在剛剛觸發內褲穿上時，才重設以下屬性 (防止每秒 60 次洗 DOM)
    if (!isUnderwearReset) {
        localSwipeCount = 0;
        param8PressCount = 0; 
        hasTriggeredParam13Liquid = false; 
        sessionRewardShown = false; 
        isPipActive = false;
        
        const btnPip = getDOM('btn-pip-toggle');
        if (btnPip) {
          btnPip.style.background = 'rgba(0, 0, 0, 0.7)';
          btnPip.style.border = '2px solid rgba(255, 255, 255, 0.8)';
        }
        isUnderwearReset = true; // 上鎖
    }
  } else {
    isUnderwearReset = false; // 內褲脫掉時解鎖
  }

  let p12Speed = (targetParam12 === 0) ? 0.2 : 0.02;
  currentParam12 = lerp(currentParam12, targetParam12, p12Speed);
  core.setParameterValueById("Param12", currentParam12);

  // 💦 漏液機制修正：徹底移除與脫內衣 (Param7) 的關聯，僅依賴刺激條件達標
  let finalParam13Target = 0;
  if (hasTriggeredParam13Liquid || param8PressCount >= 25) {
    finalParam13Target = 1.0;
  } else {
    finalParam13Target = 0.0;
  }

  currentParam13 = lerp(currentParam13, finalParam13Target, 0.15);
  core.setParameterValueById("Param13", currentParam13);

  currentParam14 = lerp(currentParam14, targetParam14, 0.15);
  core.setParameterValueById("Param14", currentParam14);

  if (targetParam5 === 1 && !isParam6Triggered) {
    if (param5HoldStartTime === 0) param5HoldStartTime = Date.now(); 
    else if (Date.now() - param5HoldStartTime >= 3000) {
      isParam6Triggered = true; 
      targetParam6 = 2; 
      const centerX = window.innerWidth / 2; const centerY = window.innerHeight * 0.65; 
      spawnFloatingText(centerX, centerY, "處女膜破了...💔", "#ff4d4d", 3000, "48px");
    }
  } else if (targetParam5 !== 1) { 
    param5HoldStartTime = 0; 
  }

  let p8Target = 0.0;
  if ((isHoldingForParam8 && isParam7Locked) || targetParam5 > 0) {
    if (isHoldingForParam8 && isParam7Locked) p8Target = 3.0; 
    targetEyeX = 0.0;     
    targetEyeY = 0.0;     
    targetMouthForm = -1.0; 
  } else {
    p8Target = 0.0; targetMouthForm = 0.0;  
  }

  currentParam8 = lerp(currentParam8, p8Target, 0.4);
  core.setParameterValueById("Param8", currentParam8);

  currentEyeX = lerp(currentEyeX, targetEyeX, 0.14); 
  core.setParameterValueById("ParamAngleX", currentEyeX); 

  currentEyeY = lerp(currentEyeY, targetEyeY, 0.14);
  core.setParameterValueById("ParamAngleY", currentEyeY); 

  let coordinatedBallX = Math.max(-1.0, Math.min(1.0, currentEyeX / 20.0));
  let coordinatedBallY = Math.max(-1.0, Math.min(1.0, currentEyeY / 20.0));
  core.setParameterValueById("ParamEyeBallX", coordinatedBallX);
  core.setParameterValueById("ParamEyeBallY", coordinatedBallY);

  currentMouthForm = lerp(currentMouthForm, targetMouthForm, 0.3);
  core.setParameterValueById("ParamMouthForm", currentMouthForm);

  // 🛡️ 效能優化：使用 PIXI Ticker 的內部時間來控制呼吸，避免 Date.now() 與幀數衝突引起的抽搐
  globalElapsedTime += (app.ticker.deltaMS || 16.66);
  const breathValue = (Math.sin(globalElapsedTime / 400.0) * 0.5) + 0.5;
  core.setParameterValueById("ParamBreath", breathValue);

  if (targetParam3 === 1) targetParam = -1;
  if (targetParam === 1) targetParam3 = -1;

  if (targetParam10 === 1) {
    targetClothes = 1;
  }

  currentClothes = lerp(currentClothes, targetClothes, 0.15);
  core.setParameterValueById("Param2", currentClothes);

  currentParam5 = lerp(currentParam5, targetParam5, 0.45);
  core.setParameterValueById("Param5", currentParam5);
  
  currentParam7 = lerp(currentParam7, targetParam7, 0.45);
  core.setParameterValueById("Param7", currentParam7);

  currentParam3 = lerp(currentParam3, targetParam3, 0.45);
  core.setParameterValueById("Param3", currentParam3);

  currentParam = lerp(currentParam, targetParam, 0.45);
  core.setParameterValueById("Param", currentParam);
  
  currentParam6 = lerp(currentParam6, targetParam6, 0.05);
  core.setParameterValueById("Param6", currentParam6);

  blinkCurrent = lerp(blinkCurrent, blinkTarget, 0.25);
  core.setParameterValueById("ParamEyeLOpen", blinkCurrent);
  core.setParameterValueById("ParamEyeROpen", blinkCurrent);
}

function startBlinkLoop() {
  const loop = () => {
    setTimeout(() => {
      blinkTarget = 0; setTimeout(() => { blinkTarget = 1; }, 120); loop();
    }, 2000 + Math.random() * 4000);
  };
  loop();
}

function startEyeLookLoop() {
  const loop = () => {
    setTimeout(() => {
      if (isOnModel || isHoldingForParam8 || targetParam5 > 0) {
        loop();
        return;
      }

      const rand = Math.random();
      if (rand < 0.3) {
        targetEyeX = 0;
        targetEyeY = 0; 
      } else {
        targetEyeX = (Math.random() * 2 - 1) * 24.0; 
        targetEyeY = 0; 
      }
      loop();
    }, 1200 + Math.random() * 2300);
  };
  loop();
}

function setupInteraction() {
  app.view.style.touchAction = "none";

  window.addEventListener('pointerdown', (e) => {
    if (isRewardModalOpen || isBioModalOpen) return; 

    if (e.target && e.target.closest('#zoom-container')) return;
    if (e.target && e.target.closest('#character-tag-ui')) return; 
    if (e.target && e.target.closest('#treatment-ui')) return; 
    handleGlobalDoubleTap(e.clientX, e.clientY);

    startX = e.clientX;
    startY = e.clientY;
  });

  model.interactive = true; 
  model.buttonMode = true; 

  model.on('pointerdown', (e) => {
    if (isRewardModalOpen || isBioModalOpen) return; 

    isOnModel = true;
    startX = e.data.originalEvent.clientX || e.data.global.x; 
    startY = e.data.originalEvent.clientY || e.data.global.y; 
    swipeAxis = null; 
    swipeActionTriggered = false; 
    legsWereOpenAtStart = (targetParam9 === 1); 
  });
  
  window.addEventListener('pointermove', (e) => {
    if (isRewardModalOpen || isBioModalOpen) return; 

    if (!isOnModel) return;
    const diffX = e.clientX - startX; 
    const diffY = startY - e.clientY; 
    
    if (Math.abs(diffX) < 35 && Math.abs(diffY) < 35) {
        swipeAxis = null;
    } else if (!swipeAxis && (Math.abs(diffX) > 35 || Math.abs(diffY) > 35)) {
      swipeAxis = Math.abs(diffX) > Math.abs(diffY) ? 'x' : 'y';
      isHoldingForParam8 = false; 
    }
    
    if (!legsWereOpenAtStart) {
      if (startY > window.innerHeight * 0.42) {
        if (swipeAxis === 'x' && Math.abs(diffX) > 40 && !swipeActionTriggered) {
          targetParam9 = 1;
          targetParam11 = 0; 
          targetParam3 = -1;
          targetParam = -1;
          swipeActionTriggered = true;
          spawnFloatingText(e.clientX, e.clientY, "把腿掰開了... ", "#ffb3c6", 1800, "28px");
        } 
        else if (swipeAxis === 'y' && !swipeActionTriggered) {
          if (diffY > 40) {
            if (targetParam10 === 0) {
              targetParam10 = 1;
              targetClothes = 1; 
              swipeActionTriggered = true; 
              spawnFloatingText(e.clientX, e.clientY, "內褲被脫掉了...", "#ff69b4", 1800, "28px");
            } else if (targetParam10 === 1 && targetParam11 === 0) {
              targetParam11 = 1;
              swipeActionTriggered = true;
              spawnFloatingText(e.clientX, e.clientY, "不要看...", "#ffb3c6", 1800, "28px");
            }
          } 
          else if (diffY < -40) {
            if (targetParam11 === 1) {
              targetParam11 = 0;
              swipeActionTriggered = true;
              spawnFloatingText(e.clientX, e.clientY, "討厭啦...", "#ffb3c6", 1800, "28px");
            } else if (targetParam11 === 0 && targetParam10 === 1) {
              targetParam10 = 0;
              targetClothes = -1; 
              isParam2Locked = false;
              swipeActionTriggered = true;
              spawnFloatingText(e.clientX, e.clientY, "穿回內褲...", "#ffb3c6", 1500, "28px");
            }
          }
        }
      }
      return; 
    }

    if (swipeAxis === 'x') {
      if (targetParam10 === 1 && !swipeActionTriggered) {
        if (Math.abs(diffX) > 40) {
          targetParam9 = 0;
          swipeActionTriggered = true;
          spawnFloatingText(e.clientX, e.clientY, "大腿合上了...", "#ffb3c6", 1500, "28px");
        }
      } 
      else if (targetParam10 === 0 && targetClothes === -1 && !isParam2Locked) { 
        if (diffX > 0) {
          targetParam3 = diffX < 40 ? -1 : (diffX < 100 ? 0 : 1); targetParam = -1; 
        } else {
          const moveLeft = Math.abs(diffX);
          targetParam = moveLeft < 40 ? -1 : (moveLeft < 100 ? 0 : 1); targetParam3 = -1;
        }
        if (targetParam3 === -1) isParam3Locked = false;
        if (targetParam === -1) isParamLocked = false;
      }
    } else if (swipeAxis === 'y') {
      if (!isParam3Locked && !isParamLocked && targetParam3 === -1 && targetParam === -1) {
        if (diffY > 0) { 
          if (isParam2Locked) {
            if (targetParam14 >= 0.5) {
              if (!swipeActionTriggered) {
                spawnFloatingText(e.clientX, e.clientY, "⚠️ 腫脹嚴重，請先點擊控制台治療！", "#ffcc00", 1500, "24px");
                swipeActionTriggered = true;
              }
              targetParam5 = -1;
            } else {
              targetParam5 = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
            }
          } else {
            if (targetParam10 === 1) {
              targetClothes = 1;
            } else {
              let nextClothes = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
              targetClothes = nextClothes;
              if (nextClothes === 1 && !swipeActionTriggered) {
                  targetParam10 = 1;
                  swipeActionTriggered = true;
                  spawnFloatingText(e.clientX, e.clientY, "內褲被脫掉了...", "#ff69b4", 1800, "28px");
              }
            }
          }
        } else {
          if (!isParam7Locked) {
            if (targetParam14 >= 0.5) {
              if (!swipeActionTriggered) {
                spawnFloatingText(e.clientX, e.clientY, "⚠️ 腫脹嚴重，請先點擊控制台治療！", "#ffcc00", 1500, "24px");
                swipeActionTriggered = true;
              }
              targetParam7 = -1;
            } else {
              const down = Math.abs(diffY);
              if (down < 30) targetParam7 = -1;
              else if (down < 80) targetParam7 = 0.8;
              else if (down < 140) targetParam7 = 1.6;
              else if (down < 200) targetParam7 = 2.4;
              else targetParam7 = 2.8;
            }
          }
        }
      }
    }
  });
  
  window.addEventListener('pointerup', () => { 
    if (isRewardModalOpen || isBioModalOpen) return; 

    if (!isOnModel) return;
    isOnModel = false; 
    swipeAxis = null;
    isHoldingForParam8 = false;
    swipeActionTriggered = false; 

    if (targetParam9 === 1) {
      if (targetClothes === 1 && !isParam2Locked) { isParam2Locked = true; lockHistory.push('Param2'); }
      if (targetParam7 === 2.8 && !isParam7Locked) { isParam7Locked = true; lockHistory.push('Param7'); }
      if (targetParam3 === 1 && !isParam3Locked) { isParam3Locked = true; lockHistory.push('Param3'); }
      if (targetParam === 1 && !isParamLocked) { isParamLocked = true; lockHistory.push('Param'); }
    }

    targetParam5 = -1;
    hasCountedThisSwipe = false; 

    if (!isParam3Locked) targetParam3 = -1;
    if (!isParamLocked) targetParam = -1; 
  });
}

/**
 * 🚀 主啟動函數
 */
async function start() {
  try {
    document.title = "口袋穴天使試玩版";

    createLoadingUI();
    await updateLoadingText("初始化 WebGL 繪圖引擎...");

    document.documentElement.style.width = '100%'; document.documentElement.style.height = '100%';
    document.body.style.width = '100%'; document.body.style.height = '100%';
    document.body.style.margin = '0'; document.body.style.overflow = 'hidden'; document.body.style.backgroundColor = 'transparent';

    const Live2DModel = PIXI.live2d.Live2DModel;
    Live2DModel.registerTicker(PIXI.Ticker);

    app = new PIXI.Application({
      resizeTo: window, backgroundAlpha: 0, antialias: true, 
      resolution: Math.max(window.devicePixelRatio, 2), autoDensity: true, powerPreference: 'high-performance',
    });

    app.view.style.position = "absolute"; app.view.style.top = "0"; app.view.style.left = "0";
    app.view.style.width = "100vw"; app.view.style.height = "100vh"; app.view.style.zIndex = "1";
    document.body.appendChild(app.view);

    await updateLoadingText("下載與解析 Live2D 模型檔案...");
    const modelPath = "public/model/model.model3.json";
    model = await Live2DModel.from(modelPath, { autoUpdate: true });

    await updateLoadingText("優化高畫質材質貼圖...");
    const textures = model.textures || model.internalModel?.textures || [];
    textures.forEach((tex) => {
      if (tex && tex.baseTexture) {
        tex.baseTexture.mipmap = (PIXI.MIPMAP_MODES && PIXI.MIPMAP_MODES.ON !== undefined) ? PIXI.MIPMAP_MODES.ON : 1; 
        tex.baseTexture.anisotropicLevel = 16;
        tex.baseTexture.scaleMode = (PIXI.SCALE_MODES && PIXI.SCALE_MODES.LINEAR !== undefined) ? PIXI.SCALE_MODES.LINEAR : 1; 
      }
    });
    
    await updateLoadingText("配置互動與 UI 介面...");
    userScaleOffset = 0.5;
    createZoomButtons(); 
    createEffectContainer(); 
    createInvisibleHitbox(); 

    setupCounter();
    createCharacterTagUI(); 
    createTreatmentUI(); 

    window.model = model;
    app.stage.addChild(model);
    model.internalModel.eyeBlink = null;
    
    // 🛡️ 效能優化：關閉官方自帶的內建呼吸器，防止與我們的自訂呼吸發生衝突導致抖動
    if (model.internalModel.breath) model.internalModel.breath = null; 

    setupPiP(); 
    setupInteraction(); 
    startBlinkLoop();
    startEyeLookLoop(); 
    app.ticker.add(updateParams);
    
    await updateLoadingText("準備完成！");
    resize();

    requestAnimationFrame(() => {
        resize(); app.render(); 
        requestAnimationFrame(() => {
            resize(); 
            setTimeout(hideLoadingUI, 300); // 載入結束，準備彈出年齡驗證
            setTimeout(() => { resize(); if (app.render) app.render(); }, 100);
            setTimeout(() => { resize(); if (app.render) app.render(); }, 300);
        });
    });
    
    window.addEventListener("resize", () => {
        resize(); createZoomButtons();
    });
  } catch (err) { 
    console.error("啟動失敗:", err); 
    await updateLoadingText("載入失敗，請重新整理網頁！");
  }
}

window.addEventListener('DOMContentLoaded', start);
