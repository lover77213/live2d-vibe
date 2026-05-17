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

// 📊 全網實時計數器狀態 (徹底拔除本機暫存，100% 信任雲端)
let globalOpenCount = 0;
let hasCountedThisSwipe = false; 
const COUNTER_NAMESPACE = 'waifu_live2d_project_2026'; // 乾淨無敏感字眼的空間名
const COUNTER_KEY = 'interactive_clicks'; // 避開 count 等會被擋廣告攔截的字
const ABACUS_URL = 'https://abacus.jasoncameron.dev';

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
 * 📊 建立與初始化全網計數器 UI (100% 雲端同步無阻擋版)
 */
function setupCounter() {
  const counterDiv = document.createElement('div');
  counterDiv.id = 'global-counter-ui';
  counterDiv.style.cssText = `
    position: fixed; 
    bottom: 140px; 
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

  counterDiv.innerHTML = `累計被掰穴次數: <span style="color: #ffb3c6; font-size: 24px;">...</span>`;

  syncWithCloud();
  // 每 4 秒自動向全網同步一次
  setInterval(syncWithCloud, 4000);
}

// 🌟 純淨無痕的 Fetch 邏輯，徹底捨棄舊本地資料，以伺服器為唯一真理
function syncWithCloud() {
  const ts = Date.now();
  fetch(`${ABACUS_URL}/get/${COUNTER_NAMESPACE}/${COUNTER_KEY}?_=${ts}`)
    .then(res => res.json())
    .then(data => {
      if (data && typeof data.value === 'number') {
        updateCounterUI(data.value);
      }
    })
    .catch(() => {});
}

function incrementGlobalCount() {
  // 1. 本地直接先加 1，讓 UI 瞬間反應
  globalOpenCount++;
  updateCounterUI(globalOpenCount);
  
  // 2. 背景發送給伺服器真正 +1
  const ts = Date.now();
  fetch(`${ABACUS_URL}/hit/${COUNTER_NAMESPACE}/${COUNTER_KEY}?_=${ts}`)
    .then(res => res.json())
    .then(data => {
      if (data && typeof data.value === 'number') {
        updateCounterUI(data.value);
      }
    })
    .catch(() => {});
}

// 統一的 UI 更新與數值校正邏輯
function updateCounterUI(serverValue) {
  if (serverValue > globalOpenCount) {
    globalOpenCount = serverValue;
  }
  
  const counterDiv = document.getElementById('global-counter-ui');
  if (!counterDiv) return;
  
  counterDiv.innerHTML = `累計被掰穴次數: <span style="color: #ff4d88; font-size: 24px;">${globalOpenCount}</span>`;
  
  counterDiv.style.transform = 'translateX(-50%) scale(1.15)';
  setTimeout(() => {
    if (counterDiv) counterDiv.style.transform = 'translateX(-50%) scale(1)';
  }, 150);
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
    display: flex; flex-direction: column; gap: 20px; z-index: 6000;
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
    font-size: ${fontSize};
    font-weight: bold;
    font-family: sans-serif;
    text-shadow: 2px 2px 6px rgba(0,0,0,0.8);
    transform: translate(-50%, -50%); 
    opacity: 0;
    white-space: nowrap; 
  `;

  container.appendChild(textEl);

  const animation = textEl.animate([
    { transform: 'translate(-50%, -50%)', opacity: 0 },
    { transform: 'translate(-50%, -70%)', opacity: 1, offset: 0.1 },  
    { transform: 'translate(-50%, -100%)', opacity: 1, offset: 0.8 }, 
    { transform: 'translate(-50%, -120%)', opacity: 0 }               
  ], {
    duration: duration, 
    easing: 'ease-out',
    fill: 'forwards'
  });

  animation.onfinish = () => {
    textEl.remove();
  };
}

/**
 * 🎯 建立 Param8 專用的隱形物理判定圖層
 */
function createInvisibleHitbox() {
  if (document.getElementById('param8-invisible-hitbox')) return;
  
  const hitbox = document.createElement('div');
  hitbox.id = 'param8-invisible-hitbox';
  
  hitbox.style.cssText = `
    position: fixed;
    left: 50%;
    top: 38%; 
    width: 60vw;
    height: 35vh;
    max-width: 400px;
    max-height: 400px;
    transform: translate(-50%, -50%);
    z-index: 5000; 
    display: none; 
    touch-action: none;
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
      }
    }
    lastTapTime = currentTime;

    if (isParam7Locked) {
      isOnModel = true;
      pointerDownStartTime = Date.now(); 
      startX = e.clientX;
      startY = e.clientY;
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
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: superRes,
    scaleMode: PIXI.SCALE_MODES.LINEAR 
  });
  
  pipSprite = new PIXI.Sprite(pipRenderTexture);
  
  pipContainer = new PIXI.Container();
  pipContainer.alpha = 0; 
  
  pipMask = new PIXI.Graphics();
  pipBorder = new PIXI.Graphics();
  
  const textStyle = new PIXI.TextStyle({
      fontFamily: 'sans-serif',
      fontSize: isMobile ? 18 : 24,
      fontWeight: 'bold',
      fill: ['#ffffff'], 
      stroke: '#ffb3c6', 
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowAngle: Math.PI / 4,
      dropShadowDistance: 2,
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

/**
 * 🔍 🌟 動態更新局部特寫的大小與對焦位置
 */
function updatePiPLayout() {
  if (!pipContainer || !pipRenderTexture || !model) return;
  
  if (window.innerWidth > 0 && window.innerHeight > 0) {
    pipRenderTexture.resize(window.innerWidth, window.innerHeight);
  }
  
  const isMobile = window.innerWidth < window.innerHeight;
  const baseSize = isMobile ? Math.min(window.innerWidth * 0.45, 250) : Math.min(window.innerWidth * 0.3, 420);
  
  const size = baseSize * 1.35; 
  const padding = 25;
  
  pipContainer.x = window.innerWidth - size - padding;
  pipContainer.y = window.innerHeight * 0.3; 
  
  pipMask.clear();
  pipMask.beginFill(0xffffff);
  pipMask.drawRoundedRect(0, 0, size, size, 20);
  pipMask.endFill();
  
  pipBorder.clear();
  pipBorder.lineStyle(6, 0xffb3c6, 0.9);
  pipBorder.drawRoundedRect(0, 0, size, size, 20);
  
  if (pipLabelText) {
      pipLabelText.x = 10;
      pipLabelText.y = -pipLabelText.height / 2; 
  }
  
  const fixedAbsoluteZoom = 0.45; 
  const currentModelScale = model.scale.y || 1; 
  const effectiveZoom = fixedAbsoluteZoom / currentModelScale; 
  
  const baseZoomLevel = 2.0;
  const finalZoomLevel = baseZoomLevel * effectiveZoom;
  pipSprite.scale.set(finalZoomLevel);
  
  const focusYOffset = 580; 
  const yOffset = focusYOffset * currentModelScale; 
  
  const focusX = model.x;
  const focusY = model.y + yOffset;
  
  pipSprite.x = size / 2 - focusX * finalZoomLevel;
  pipSprite.y = size / 2 - focusY * finalZoomLevel;
}

/**
 * ⚙️ 更新所有 Live2D 參數
 */
function updateParams() {
  if (zoomDirection !== 0) {
    userScaleOffset += zoomDirection * 0.015;
    userScaleOffset = Math.max(0.1, Math.min(userScaleOffset, 5.0));
    resize(); 
  }

  const hitbox = document.getElementById('param8-invisible-hitbox');
  if (hitbox) {
    hitbox.style.display = isParam7Locked ? 'block' : 'none';
  }

  // 🌟 全網計數器觸發判定
  if (targetParam5 > 0 && !hasCountedThisSwipe) {
    hasCountedThisSwipe = true; 
    incrementGlobalCount(); 
  }

  // 🔍 更新局部特寫畫中畫
  if (pipContainer) {
    let pipTargetAlpha = 0.0;
    
    // 🌟 保留你的長按邏輯：長按 1000 毫秒（1秒）觸發特寫
    if (isOnModel && pointerDownStartTime > 0 && (Date.now() - pointerDownStartTime >= 1000)) {
      pipTargetAlpha = 1.0;
    } 

    const alphaLerpSpeed = (pipTargetAlpha > currentPipAlpha) ? 0.15 : 0.05;
    currentPipAlpha = lerp(currentPipAlpha, pipTargetAlpha, alphaLerpSpeed); 
    
    pipContainer.alpha = currentPipAlpha;
    
    if (currentPipAlpha > 0.01) {
      pipContainer.visible = false; 
      try {
        app.renderer.render(app.stage, { renderTexture: pipRenderTexture, clear: true });
      } catch (e) {
        app.renderer.render(app.stage, pipRenderTexture, true);
      }
      pipContainer.visible = true; 
    }
  }

  if (!model?.internalModel?.coreModel) return;
  const core = model.internalModel.coreModel;
  
  // 彩蛋邏輯
  if (targetParam5 === 1 && !isParam6Triggered) {
    if (param5HoldStartTime === 0) param5HoldStartTime = Date.now(); 
    else if (Date.now() - param5HoldStartTime >= 3000) {
      isParam6Triggered = true;
      targetParam6 = 2; 
      
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight * 0.65; 
      spawnFloatingText(centerX, centerY, "處女膜破了...💔", "#ff4d4d", 3000, "48px");
    }
  } else if (targetParam5 !== 1) {
    param5HoldStartTime = 0; 
  }

  let p8Target = 0.0;
  
  if ((isHoldingForParam8 && isParam7Locked) || targetParam5 > 0) {
    if (isHoldingForParam8 && isParam7Locked) p8Target = 3.0; 
    targetEyeY = -1.0;      
    targetMouthForm = -1.0; 
  } else {
    p8Target = 0.0;
    targetEyeY = 0.0;       
    targetMouthForm = 0.0;  
  }

  currentParam8 = lerp(currentParam8, p8Target, 0.4);
  core.setParameterValueById("Param8", currentParam8);

  currentEyeY = lerp(currentEyeY, targetEyeY, 0.3);
  core.setParameterValueById("ParamEyeBallY", currentEyeY);

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
      blinkTarget = 0;
      setTimeout(() => { blinkTarget = 1; }, 120);
      loop();
    }, 2000 + Math.random() * 4000);
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
    
    if (swipeAxis === 'x') {
      if (targetClothes === -1 && !isParam2Locked) { 
        if (diffX > 0) {
          targetParam3 = diffX < 40 ? -1 : (diffX < 100 ? 0 : 1);
          targetParam = -1; 
        } else {
          const moveLeft = Math.abs(diffX);
          targetParam = moveLeft < 40 ? -1 : (moveLeft < 100 ? 0 : 1);
          targetParam3 = -1;
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

    if (targetClothes === 1 && !isParam2Locked) { isParam2Locked = true; lockHistory.push('Param2'); }
    if (targetParam7 === 2.8 && !isParam7Locked) { isParam7Locked = true; lockHistory.push('Param7'); }
    if (targetParam3 === 1 && !isParam3Locked) { isParam3Locked = true; lockHistory.push('Param3'); }
    if (targetParam === 1 && !isParamLocked) { isParamLocked = true; lockHistory.push('Param'); }

    targetParam5 = -1;
    
    // 鬆開時重置計數鎖定，必須重新滑動才會再次 +1
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
    document.documentElement.style.width = '100%';
    document.documentElement.style.height = '100%';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden'; 
    document.body.style.backgroundColor = 'transparent';

    const Live2DModel = PIXI.live2d.Live2DModel;
    Live2DModel.registerTicker(PIXI.Ticker);

    app = new PIXI.Application({
      resizeTo: window, 
      backgroundAlpha: 0,
      antialias: true, 
      resolution: Math.max(window.devicePixelRatio, 2), 
      autoDensity: true,
      powerPreference: 'high-performance',
    });

    app.view.style.position = "absolute";
    app.view.style.top = "0";
    app.view.style.left = "0";
    app.view.style.width = "100vw";
    app.view.style.height = "100vh";
    app.view.style.zIndex = "1";
    document.body.appendChild(app.view);

    const modelPath = "public/model/model.model3.json";
    model = await Live2DModel.from(modelPath, { autoUpdate: true });

    const textures = model.textures || model.internalModel?.textures || [];
    textures.forEach((tex) => {
      if (tex && tex.baseTexture) {
        tex.baseTexture.mipmap = (PIXI.MIPMAP_MODES && PIXI.MIPMAP_MODES.ON !== undefined) 
          ? PIXI.MIPMAP_MODES.ON 
          : 1; 
          
        tex.baseTexture.anisotropicLevel = 16;
        
        tex.baseTexture.scaleMode = (PIXI.SCALE_MODES && PIXI.SCALE_MODES.LINEAR !== undefined) 
          ? PIXI.SCALE_MODES.LINEAR 
          : 1; 
      }
    });
    
    userScaleOffset = 0.5;
    createZoomButtons(); 
    createEffectContainer(); 
    createInvisibleHitbox(); 

    // 🌟 啟動時建立 UI 並執行首次同步
    setupCounter();

    window.model = model;
    app.stage.addChild(model);
    model.internalModel.eyeBlink = null;

    setupPiP(); 
    setupInteraction(); 
    startBlinkLoop();
    app.ticker.add(updateParams);
    
    requestAnimationFrame(() => {
        resize();
        app.render(); 
        requestAnimationFrame(() => {
            resize();
        });
    });
    
    window.addEventListener("resize", () => {
        resize();
        createZoomButtons();
    });
  } catch (err) { 
    console.error("啟動失敗:", err); 
  }
}

window.addEventListener('DOMContentLoaded', start);
