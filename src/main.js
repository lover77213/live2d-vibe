/**
 * 🚀 PIXI 應用程式初始化與 Live2D 互動核心 (終極優化版)
 */

let app; 
let model;
let startX = 0; 
let startY = 0; 
let isOnModel = false;
let swipeAxis = null; 

// 🌟 參數狀態管理
let targetParam9 = 0, currentParam9 = 0; // 大腿狀態 (0=關閉, 1=打開)
let targetClothes = -1, currentClothes = -1;  
let targetParam7 = -1, currentParam7 = -1;    
let targetParam5 = -1, currentParam5 = -1;    
let targetParam3 = -1, currentParam3 = -1;    
let targetParam = -1, currentParam = -1;      
let targetParam6 = 0, currentParam6 = 0;      
let currentParam8 = 0;             
let blinkTarget = 1, blinkCurrent = 1;        

// 💖 表情連動與大振幅隨機眼神狀態 (精準聯動頭部 Angle 與眼珠 EyeBall)
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
let pointerDownStartTime = 0; 

// 📊 全網實時計數器狀態 (徹底拔除本機暫存，100% 信任雲端與台灣時間結算)
let globalTotalCount = 0;
let globalDailyCount = 0;
let hasCountedThisSwipe = false; 
const COUNTER_NAMESPACE = 'waifu_live2d_project_2026'; 
const KEY_TOTAL = 'interactive_clicks'; 
const KEY_DAILY = 'interactive_clicks_daily'; 
const KEY_LAST_DATE = 'interactive_last_date'; 
const ABACUS_URL = 'https://abacus.jasoncameron.dev';

// 📈 實時滾動數字特效狀態變數
let displayedTotalCount = 0;
let displayedDailyCount = 0;
let isCounterInitialized = false; 
let lastRenderedTotal = -1;
let lastRenderedDaily = -1;

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
    @keyframes loader-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes loader-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.05); }
    }
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
  const el = document.getElementById('app-loader-text');
  if (el) el.innerText = msg;
  await new Promise(resolve => requestAnimationFrame(resolve));
}

function hideLoadingUI() {
  const el = document.getElementById('app-loader');
  if (el) {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 500);
  }
}

/**
 * 獲取當前台灣時間（UTC+8）的日期字串 (YYYY-MM-DD)
 */
function getTaiwanDateString() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const twTime = new Date(utc + (3600000 * 8));
  const yyyy = twTime.getFullYear();
  const mm = String(twTime.getMonth() + 1).padStart(2, '0');
  const dd = String(twTime.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 📊 建立與初始化雙層計數器 UI
 */
function setupCounter() {
  const counterDiv = document.createElement('div');
  counterDiv.id = 'global-counter-ui';
  counterDiv.style.cssText = `
    position: fixed; bottom: 140px; left: 50%; transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7); border: 2px solid #ffb3c6; border-radius: 20px;
    padding: 12px 30px; color: #ffffff; font-family: sans-serif; font-weight: bold;
    text-align: center; box-shadow: 0 6px 20px rgba(255, 179, 198, 0.35); z-index: 10000;
    pointer-events: none; user-select: none; white-space: nowrap;
    transition: transform 0.1s ease-out; display: flex; flex-direction: column; gap: 4px;
  `;
  document.body.appendChild(counterDiv);

  counterDiv.innerHTML = `
    <div style="font-size: 16px; color: #ffb3c6;">今日被掰穴次數: <span id="count-daily" style="font-size: 18px; color: #ffb3c6;">...</span></div>
    <div style="font-size: 18px; color: #ffffff; border-top: 1px solid rgba(255, 179, 198, 0.3); padding-top: 4px; margin-top: 2px;">
      所有玩家總掰穴次數: <span id="count-total" style="font-size: 22px; color: #ff4d88;">...</span>
    </div>
  `;

  syncWithCloud();
  setInterval(syncWithCloud, 4000);
}

function syncWithCloud() {
  const ts = Date.now();
  const currentDate = getTaiwanDateString();

  fetch(`${ABACUS_URL}/get/${COUNTER_NAMESPACE}/${KEY_LAST_DATE}?_=${ts}`)
    .then(res => res.json())
    .then(dateData => {
      const serverSavedDate = dateData && dateData.value ? String(dateData.text || dateData.value) : currentDate;

      if (serverSavedDate !== currentDate) {
        fetch(`${ABACUS_URL}/get/${COUNTER_NAMESPACE}/${KEY_DAILY}?_=${ts}`)
          .then(res => res.json())
          .then(dailyData => {
            const expiredDailyValue = (dailyData && dailyData.value) ? dailyData.value : 0;
            if (expiredDailyValue > 0) {
              fetch(`${ABACUS_URL}/hit/${COUNTER_NAMESPACE}/${KEY_TOTAL}?step=${expiredDailyValue}&_=${Date.now()}`);
            }
            fetch(`${ABACUS_URL}/update/${COUNTER_NAMESPACE}/${KEY_DAILY}?value=0&_=${Date.now()}`);
            fetch(`${ABACUS_URL}/update/${COUNTER_NAMESPACE}/${KEY_LAST_DATE}?value=0&text=${currentDate}&_=${Date.now()}`);
            
            globalDailyCount = 0;
            updateCounterUI(globalTotalCount + expiredDailyValue, 0);
          }).catch(() => {});
      } else {
        Promise.all([
          fetch(`${ABACUS_URL}/get/${COUNTER_NAMESPACE}/${KEY_TOTAL}?_=${ts}`).then(r => r.json()),
          fetch(`${ABACUS_URL}/get/${COUNTER_NAMESPACE}/${KEY_DAILY}?_=${ts}`).then(r => r.json())
        ]).then(([totalData, dailyData]) => {
          const tVal = totalData && typeof totalData.value === 'number' ? totalData.value : globalTotalCount;
          const dVal = dailyData && typeof dailyData.value === 'number' ? dailyData.value : globalDailyCount;
          updateCounterUI(tVal, dVal);
        }).catch(() => {});
      }
    })
    .catch(() => {
      fetch(`${ABACUS_URL}/get/${COUNTER_NAMESPACE}/${KEY_TOTAL}?_=${ts}`)
        .then(res => res.json()).then(d => d && updateCounterUI(d.value, globalDailyCount)).catch(() => {});
    });
}

function incrementGlobalCount() {
  globalTotalCount++;
  globalDailyCount++;
  updateCounterUI(globalTotalCount, globalDailyCount);
  
  const ts = Date.now();
  const currentDate = getTaiwanDateString();

  fetch(`${ABACUS_URL}/hit/${COUNTER_NAMESPACE}/${KEY_TOTAL}?_=${ts}`);
  fetch(`${ABACUS_URL}/hit/${COUNTER_NAMESPACE}/${KEY_DAILY}?_=${ts}`);
  fetch(`${ABACUS_URL}/update/${COUNTER_NAMESPACE}/${KEY_LAST_DATE}?value=0&text=${currentDate}&_=${ts}`);
}

function updateCounterUI(serverTotal, serverDaily) {
  if (!isCounterInitialized && serverTotal > 0) {
    displayedTotalCount = serverTotal;
    displayedDailyCount = serverDaily;
    isCounterInitialized = true;
  }

  if (serverTotal > globalTotalCount) globalTotalCount = serverTotal;
  if (serverDaily > globalDailyCount) globalDailyCount = serverDaily;
  
  const counterDiv = document.getElementById('global-counter-ui');
  if (counterDiv) {
    counterDiv.style.transform = 'translateX(-50%) scale(1.08)';
    setTimeout(() => {
      if (counterDiv) counterDiv.style.transform = 'translateX(-50%) scale(1)';
    }, 120);
  }
}

/**
 * 📏 自動縮放與畫質維持
 */
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

    const btnX2 = document.getElementById('btn-zoom-x2');
    const btnPlus = document.getElementById('btn-zoom-plus');
    const btnMinus = document.getElementById('btn-zoom-minus');
    
    if (btnPlus && btnMinus && btnX2) {
      const btnSize = isMobile ? '97.5px' : '65px'; 
      const fontSize = isMobile ? '52.5px' : '35px'; 
      const x2FontSize = isMobile ? '42px' : '28px';
      
      btnX2.style.width = btnSize; btnX2.style.height = btnSize; btnX2.style.fontSize = x2FontSize;
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
 * 🎨 建立小寫 x2 兩倍放大按鈕
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
  `;

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

  container.appendChild(btnX2);
  container.appendChild(btnPlus);
  container.appendChild(btnMinus);
  document.body.appendChild(container);
}

/**
 * 💖 建立漂浮文字特效容器
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

/**
 * 🎯 建立 Param8 專用的隱形物理判定圖層
 */
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
    const currentTime = Date.now();
    if (currentTime - lastTapTime < 300) {
      if (lockHistory.length > 0) {
        const lastLocked = lockHistory.pop(); 
        if (lastLocked === 'Param2') { isParam2Locked = false; targetClothes = -1; targetParam5 = -1; }
        else if (lastLocked === 'Param7') { isParam7Locked = false; targetParam7 = -1; }
        else if (lastLocked === 'Param3') { isParam3Locked = false; targetParam3 = -1; }
        else if (lastLocked === 'Param') { isParamLocked = false; targetParam = -1; }
      } else {
        targetParam9 = 0;
        spawnFloatingText(e.clientX, e.clientY, "大腿合上了...🔒", "#ffb3c6", 1500, "28px");
      }
    }
    lastTapTime = currentTime;

    if (isParam7Locked && targetParam9 === 1) {
      isOnModel = true;
      pointerDownStartTime = Date.now(); 
      startX = e.clientX; startY = e.clientY;
      swipeAxis = null;
      isHoldingForParam8 = true;
      spawnFloatingText(e.clientX + 30, e.clientY - 60, "嗯...❤️", "#ffb3c6", 1500, "28px");
    }
  });

  document.body.appendChild(hitbox);
}

/**
 * 🔍 建立 200% 局部特寫畫中畫 (PiP)
 */
function setupPiP() {
  const isMobile = window.innerWidth < window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const superRes = isMobile ? Math.min(dpr * 1.5, 3) : Math.min(dpr * 2, 4);

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
    pipRenderTexture.resize(window.innerWidth, window.innerHeight);
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

/**
 * ⚙️ 更新所有 Live2D 參數與 UI 數字滾動動畫
 */
function updateParams() {
  if (zoomDirection !== 0) {
    userScaleOffset += zoomDirection * 0.015;
    userScaleOffset = Math.max(0.1, Math.min(userScaleOffset, 5.0));
    resize(); 
  }

  const hitbox = document.getElementById('param8-invisible-hitbox');
  if (hitbox) {
    hitbox.style.display = (isParam7Locked && targetParam9 === 1) ? 'block' : 'none';
  }

  // 全網實時「數字平滑滾動動畫」核心
  if (isCounterInitialized) {
    if (displayedTotalCount < globalTotalCount) {
      let diff = globalTotalCount - displayedTotalCount;
      if (diff < 1) displayedTotalCount = globalTotalCount;
      else displayedTotalCount += Math.max(1, Math.floor(diff * 0.08)); 
    } else { displayedTotalCount = globalTotalCount; }

    if (displayedDailyCount < globalDailyCount) {
      let diff = globalDailyCount - displayedDailyCount;
      if (diff < 1) displayedDailyCount = globalDailyCount;
      else displayedDailyCount += Math.max(1, Math.floor(diff * 0.08));
    } else { displayedDailyCount = globalDailyCount; }

    let currentFloorTotal = Math.floor(displayedTotalCount);
    let currentFloorDaily = Math.floor(displayedDailyCount);

    if (currentFloorDaily !== lastRenderedDaily) {
      const dailyEl = document.getElementById('count-daily');
      if (dailyEl) dailyEl.innerText = currentFloorDaily;
      lastRenderedDaily = currentFloorDaily;
    }
    if (currentFloorTotal !== lastRenderedTotal) {
      const totalEl = document.getElementById('count-total');
      if (totalEl) totalEl.innerText = currentFloorTotal;
      lastRenderedTotal = currentFloorTotal;
    }
  }

  // 全網計數器觸發判定
  if (targetParam5 > 0 && !hasCountedThisSwipe) {
    hasCountedThisSwipe = true; 
    incrementGlobalCount(); 
  }

  // 🔍 更新局部特寫畫中畫
  if (pipContainer) {
    let pipTargetAlpha = 0.0;
    if (isOnModel && targetParam9 === 1 && pointerDownStartTime > 0 && (Date.now() - pointerDownStartTime >= 1000)) {
      pipTargetAlpha = 1.0;
    } 

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
  
  // 大腿解鎖動態插值
  currentParam9 = lerp(currentParam9, targetParam9, 0.15);
  core.setParameterValueById("Param9", currentParam9);

  if (targetParam5 === 1 && !isParam6Triggered) {
    if (param5HoldStartTime === 0) param5HoldStartTime = Date.now(); 
    else if (Date.now() - param5HoldStartTime >= 3000) {
      isParam6Triggered = true; targetParam6 = 2; 
      const centerX = window.innerWidth / 2; const centerY = window.innerHeight * 0.65; 
      spawnFloatingText(centerX, centerY, "處女膜破了...💔", "#ff4d4d", 3000, "48px");
    }
  } else if (targetParam5 !== 1) { param5HoldStartTime = 0; }

  let p8Target = 0.0;
  if ((isHoldingForParam8 && isParam7Locked) || targetParam5 > 0) {
    if (isHoldingForParam8 && isParam7Locked) p8Target = 3.0; 
    targetEyeX = 0.0;     // 互動時臉部水平維持正對玩家
    targetEyeY = -24.0;   // 🌟 幅度加大：羞恥感拉滿，更大幅度的羞澀低頭看下面！
    targetMouthForm = -1.0; 
  } else {
    p8Target = 0.0; targetMouthForm = 0.0;  
  }

  currentParam8 = lerp(currentParam8, p8Target, 0.4);
  core.setParameterValueById("Param8", currentParam8);

  // 🌟 核心驅動：頭部轉向 (ParamAngleX/Y) 平滑 Lerp 插值
  currentEyeX = lerp(currentEyeX, targetEyeX, 0.14); // 略微調緩插值速度，讓轉頭晃動更具物理沉浸感
  core.setParameterValueById("ParamAngleX", currentEyeX); 

  currentEyeY = lerp(currentEyeY, targetEyeY, 0.14);
  core.setParameterValueById("ParamAngleY", currentEyeY); 

  // 🌟 終極連動優化「頭跟著眼睛轉」：眼珠子 (ParamEyeBallX/Y) 以高比例精準協調跟隨
  // 將 -30~+30 的頭部角度，完美映射對齊至眼珠專用的 -1.0 ~ +1.0 標準物理區間中
  let coordinatedBallX = Math.max(-1.0, Math.min(1.0, currentEyeX / 20.0));
  let coordinatedBallY = Math.max(-1.0, Math.min(1.0, currentEyeY / 20.0));
  core.setParameterValueById("ParamEyeBallX", coordinatedBallX);
  core.setParameterValueById("ParamEyeBallY", coordinatedBallY);

  currentMouthForm = lerp(currentMouthForm, targetMouthForm, 0.3);
  core.setParameterValueById("ParamMouthForm", currentMouthForm);

  const breathValue = (Math.sin(Date.now() / 400.0) * 0.5) + 0.5;
  core.setParameterValueById("ParamBreath", breathValue);

  if (targetParam3 === 1) targetParam = -1;
  if (targetParam === 1) targetParam3 = -1;

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

/**
 * 🌟 深度優化：配合大角度制轉向，大幅調升隨機左右看與上下看的轉動幅度極限！
 * 讓眼睛在大範圍轉向的同時，頭部（AngleX/Y）也跟著進行等比大角度運動
 */
function startEyeLookLoop() {
  const loop = () => {
    setTimeout(() => {
      // 正在進行長按掰穴或強烈互動時，交由 updateParams 覆寫，跳過隨機飄移
      if (isOnModel || isHoldingForParam8 || targetParam5 > 0) {
        loop();
        return;
      }

      const rand = Math.random();
      if (rand < 0.3) {
        // 30% 機率回正看著螢幕前的主人
        targetEyeX = 0;
        targetEyeY = 0;
      } else {
        // 70% 機率觸發大角度視線飄移！
        // 水平偏轉極限加大至 ±24.0 度，垂直偏轉加大至 ±10.0 度，極致仿生！
        targetEyeX = (Math.random() * 2 - 1) * 24.0; 
        targetEyeY = (Math.random() * 2 - 1) * 10.0; 
      }
      loop();
    }, 1200 + Math.random() * 2300); // 隨機變換頻率維持在 1.2 至 3.5 秒之間
  };
  loop();
}

/**
 * 👆 設定互動邏輯
 */
function setupInteraction() {
  app.view.style.touchAction = "none";

  app.view.addEventListener('pointerdown', (e) => {
    const currentTime = Date.now();
    if (currentTime - lastTapTime < 300) {
      if (lockHistory.length > 0) {
        const lastLocked = lockHistory.pop(); 
        if (lastLocked === 'Param2') { isParam2Locked = false; targetClothes = -1; targetParam5 = -1; }
        else if (lastLocked === 'Param7') { isParam7Locked = false; targetParam7 = -1; }
        else if (lastLocked === 'Param3') { isParam3Locked = false; targetParam3 = -1; }
        else if (lastLocked === 'Param') { isParamLocked = false; targetParam = -1; }
      } else {
        targetParam9 = 0;
        spawnFloatingText(e.clientX, e.clientY, "大腿合上了...🔒", "#ffb3c6", 1500, "28px");
      }
    }
    lastTapTime = currentTime;
  });

  model.interactive = true; 
  model.buttonMode = true; 

  model.on('pointerdown', (e) => {
    isOnModel = true;
    pointerDownStartTime = Date.now(); 
    startX = e.data.originalEvent.clientX || e.data.global.x; 
    startY = e.data.originalEvent.clientY || e.data.global.y; 
    swipeAxis = null; 
  });
  
  window.addEventListener('pointermove', (e) => {
    if (!isOnModel) return;
    const diffX = e.clientX - startX; 
    const diffY = startY - e.clientY; 
    
    if (Math.abs(diffX) < 35 && Math.abs(diffY) < 35) {
        swipeAxis = null;
    } else if (!swipeAxis && (Math.abs(diffX) > 35 || Math.abs(diffY) > 35)) {
      swipeAxis = Math.abs(diffX) > Math.abs(diffY) ? 'x' : 'y';
      isHoldingForParam8 = false; 
    }
    
    // 🔒 核心關卡：大腿未打開狀態
    if (targetParam9 === 0) {
      if (startY > window.innerHeight * 0.42) {
        if (swipeAxis === 'x' && Math.abs(diffX) > 40) {
          targetParam9 = 1;
          spawnFloatingText(e.clientX, e.clientY, "把腿掰開了...❤️ (解鎖玩法)", "#ffb3c6", 1800, "28px");
        }
      }
      return; 
    }

    // 🔓 大腿打開後 (Param9 = 1)，全面解鎖原本的所有互動邏輯
    if (swipeAxis === 'x') {
      if (targetClothes === -1 && !isParam2Locked) { 
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
          if (isParam2Locked) targetParam5 = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
          else targetClothes = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
        } else {
          if (!isParam7Locked) {
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
  });
  
  window.addEventListener('pointerup', () => { 
    if (!isOnModel) return;
    isOnModel = false; 
    pointerDownStartTime = 0; 
    swipeAxis = null;
    isHoldingForParam8 = false;

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
    document.title = "掰穴模擬器";

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

    window.model = model;
    app.stage.addChild(model);
    model.internalModel.eyeBlink = null;

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
            resize(); setTimeout(hideLoadingUI, 300);
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
