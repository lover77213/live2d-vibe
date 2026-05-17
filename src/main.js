/**
 * 🚀 PIXI 應用程式初始化與 Live2D 互動核心
 */

let app; 
let model;
let startX = 0; 
let startY = 0; 
let isOnModel = false;
let swipeAxis = null; 

// 🌟 參數狀態管理
let targetClothes = -1, currentClothes = -1;  
let targetParam7 = -1, currentParam7 = -1;    
let targetParam5 = -1, currentParam5 = -1;    
let targetParam3 = -1, currentParam3 = -1;    
let targetParam = -1, currentParam = -1;      
let targetParam6 = 0, currentParam6 = 0;      
let currentParam8 = 0;             
let blinkTarget = 1, blinkCurrent = 1;        

// 💖 表情連動狀態
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
let pointerDownStartTime = 0; 

// 📊 全網實時計數器狀態
let globalOpenCount = 0;
let hasCountedThisSwipe = false; // 確保每次撥開只算1次
const COUNTER_NAMESPACE = 'live2d_waifu_project_8899'; // API 專屬空間名
const COUNTER_KEY = 'pussy_open_count'; // API 專屬鍵值

let userScaleOffset = 0.5; 
let zoomDirection = 0; 

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
 * 📊 建立與初始化全網計數器 UI
 */
function setupCounter() {
  // 1. 建立 UI 元素
  const counterDiv = document.createElement('div');
  counterDiv.id = 'global-counter-ui';
  counterDiv.style.cssText = `
    position: fixed; 
    bottom: 30px; 
    left: 50%; 
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.65);
    border: 2px solid #ffb3c6;
    border-radius: 30px;
    padding: 10px 25px;
    color: #ffffff;
    font-family: sans-serif;
    font-size: 20px;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 4px 15px rgba(255, 179, 198, 0.4);
    z-index: 10000;
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
    transition: transform 0.1s ease-out;
  `;
  document.body.appendChild(counterDiv);

  // 2. 優先讀取本地緩存防呆
  const localCount = localStorage.getItem('localPussyCount');
  if (localCount) globalOpenCount = parseInt(localCount);
  updateCounterUI();

  // 3. 向公共 API 獲取全網最新真實數據
  fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (data && data.count) {
        globalOpenCount = Math.max(globalOpenCount, data.count);
        localStorage.setItem('localPussyCount', globalOpenCount);
        updateCounterUI();
      }
    }).catch(err => console.log("計數器API讀取失敗，使用本地數據", err));

  // 4. 設定每 1 分鐘 (60000ms) 背景同步一次最新總量
  setInterval(() => {
    fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.count > globalOpenCount) {
          globalOpenCount = data.count;
          localStorage.setItem('localPussyCount', globalOpenCount);
          updateCounterUI();
        }
      }).catch(() => {});
  }, 60000);
}

// 更新計數器文字與跳動特效
function updateCounterUI() {
  const counterDiv = document.getElementById('global-counter-ui');
  if (!counterDiv) return;
  
  counterDiv.innerHTML = `累計被掰穴次數: <span style="color: #ff4d88; font-size: 24px;">${globalOpenCount}</span>`;
  
  // 觸發放大彈跳特效
  counterDiv.style.transform = 'translateX(-50%) scale(1.15)';
  setTimeout(() => {
    counterDiv.style.transform = 'translateX(-50%) scale(1)';
  }, 150);
}

// 觸發增加計數
function incrementGlobalCount() {
  globalOpenCount++;
  localStorage.setItem('localPussyCount', globalOpenCount);
  updateCounterUI(); // 本地立刻更新，無延遲感

  // 背景發送至雲端
  fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}/up`)
    .then(res => res.json())
    .then(data => {
      if (data && data.count > globalOpenCount) {
        globalOpenCount = data.count; // 校正雲端最新數據
        localStorage.setItem('localPussyCount', globalOpenCount);
        updateCounterUI();
      }
    }).catch(() => {});
}

/**
 * 📏 自動縮放與畫質維持
 */
function resize() {
  if (!model || !app) return;

  try {
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

    const btnPlus = document.getElementById('btn-zoom-plus');
    const btnMinus = document.getElementById('btn-zoom-minus');
    
    if (btnPlus && btnMinus) {
      const btnSize = isMobile ? '97.5px' : '65px'; 
      const fontSize = isMobile ? '52.5px' : '35px'; 
      
      btnPlus.style.width = btnSize; btnPlus.style.height = btnSize; btnPlus.style.fontSize = fontSize;
      btnMinus.style.width = btnSize; btnMinus.style.height = btnSize; btnMinus.style.fontSize = fontSize;
    }

    if (typeof updatePiPLayout === 'function') {
      updatePiPLayout();
    }
  } catch (err) {
    console.error("Resize 計算失敗:", err);
  }
}

/**
 * 🎨 建立長按縮放按鈕
 */
function createZoomButtons() {
  if (document.getElementById('zoom-container')) return; 

  const container = document.createElement('div');
  container.id = 'zoom-container';
  container.style.cssText = `
    position: fixed; bottom: 80px; right: 25px;
    display: flex; flex-direction: column; gap: 20px; z-index: 10000;
  `;

  const btnStyle = `
    border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.8);
    background: rgba(0, 0, 0, 0.7); color: white; font-weight: bold; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    user-select: none; touch-action: none; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  `;

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

  container.appendChild(btnPlus);
  container.appendChild(btnMinus);
  document.body.appendChild(container);
}

/**
 * 💖 建立漂浮文字特效容器與觸發函數
 */
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
  const container = document.getElementById('effect-container');
  if (!container) return;

  const textEl = document.createElement('div');
  textEl.innerText = text;
  
  textEl.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    color: ${color};
