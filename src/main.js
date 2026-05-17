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

let userScaleOffset = 0.5; 
let zoomDirection = 0; // 縮放方向狀態：1 (放大), -1 (縮小), 0 (停止)

const lerp = (a, b, t) => a + (b - a) * t;

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

    // 動態更新按鈕大小
    const btnPlus = document.getElementById('btn-zoom-plus');
    const btnMinus = document.getElementById('btn-zoom-minus');
    
    if (btnPlus && btnMinus) {
      const btnSize = isMobile ? '97.5px' : '65px'; 
      const fontSize = isMobile ? '52.5px' : '35px'; 
      
      btnPlus.style.width = btnSize; btnPlus.style.height = btnSize; btnPlus.style.fontSize = fontSize;
      btnMinus.style.width = btnSize; btnMinus.style.height = btnSize; btnMinus.style.fontSize = fontSize;
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

  // 長按邏輯
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
 * ⚙️ 更新所有 Live2D 參數
 */
function updateParams() {
  // 長按縮放連續判定
  if (zoomDirection !== 0) {
    userScaleOffset += zoomDirection * 0.015;
    userScaleOffset = Math.max(0.1, Math.min(userScaleOffset, 5.0));
    resize();
  }

  if (!model?.internalModel?.coreModel) return;
  const core = model.internalModel.coreModel;
  
  // 彩蛋邏輯
  if (targetParam5 === 1 && !isParam6Triggered) {
    if (param5HoldStartTime === 0) param5HoldStartTime = Date.now(); 
    else if (Date.now() - param5HoldStartTime >= 3000) {
      isParam6Triggered = true;
      targetParam6 = 2; 
    }
  } else if (targetParam5 !== 1) {
    param5HoldStartTime = 0; 
  }

  // 🌟 Param8 快速插值
  const p8Target = (isHoldingForParam8 && isParam7Locked) ? 3.0 : 0.0;
  currentParam8 = lerp(currentParam8, p8Target, 0.4);
  core.setParameterValueById("Param8", currentParam8);

  // 真・完美獨立呼吸
  const breathValue = (Math.sin(Date.now() / 400.0) * 0.5) + 0.5;
  core.setParameterValueById("ParamBreath", breathValue);

  // 強制左右互斥
  if (targetParam3 === 1) targetParam = -1;
  if (targetParam === 1) targetParam3 = -1;

  // 參數平滑更新
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
    startX = e.data.originalEvent.clientX || e.data.global.x; 
    startY = e.data.originalEvent.clientY || e.data.global.y; 
    swipeAxis = null; 

    // 全域點擊觸發
    if (isParam7Locked) {
      isHoldingForParam8 = true;
    }
  });
  
  window.addEventListener('pointermove', (e) => {
    if (!isOnModel) return;
    const diffX = e.clientX - startX; 
    const diffY = startY - e.clientY; 
    
    if (!swipeAxis && (Math.abs(diffX) > 35 || Math.abs(diffY) > 35)) {
      swipeAxis = Math.abs(diffX) > Math.abs(diffY) ? 'x' : 'y';
      isHoldingForParam8 = false; 
    }
    
    if (swipeAxis === 'x') {
      if (targetClothes === -1 && !isParam2Locked) { 
        if (diffX > 0) {
          if (!isParam3Locked) targetParam3 = diffX < 40 ? -1 : (diffX < 100 ? 0 : 1);
          targetParam = -1; 
        } else {
          const moveLeft = Math.abs(diffX);
          if (!isParamLocked) targetParam = moveLeft < 40 ? -1 : (moveLeft < 100 ? 0 : 1);
          targetParam3 = -1;
        }
      }
    } else if (swipeAxis === 'y') {
      if (diffY > 0) {
        if (!isParam3Locked && !isParamLocked) {
          if (isParam2Locked) targetParam5 = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
          else targetClothes = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
        }
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
  });
  
  window.addEventListener('pointerup', () => { 
    if (!isOnModel) return;
    isOnModel = false; 
    swipeAxis = null;
    isHoldingForParam8 = false;

    if (targetClothes === 1 && !isParam2Locked) { isParam2Locked = true; lockHistory.push('Param2'); }
    if (targetParam7 === 2.8 && !isParam7Locked) { isParam7Locked = true; lockHistory.push('Param7'); }
    if (targetParam3 === 1 && !isParam3Locked) { isParam3Locked = true; lockHistory.push('Param3'); }
    if (targetParam === 1 && !isParamLocked) { isParamLocked = true; lockHistory.push('Param'); }

    targetParam5 = -1;
    if (!isParam3Locked) targetParam3 = -1;
    if (!isParamLocked) targetParam = -1; 
  });
}

/**
 * 🚀 主啟動函數
 */
async function start() {
  try {
    // 🌟 核心防白畫面：強制重置頁面 CSS，保證 Canvas 容器具有 100% 絕對尺寸
    document.documentElement.style.width = '100%';
    document.documentElement.style.height = '100%';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden'; // 修復隱藏捲動軸的語法錯誤
    document.body.style.backgroundColor = 'transparent';

    const Live2DModel = PIXI.live2d.Live2DModel;
    Live2DModel.registerTicker(PIXI.Ticker);

    app = new PIXI.Application({
      resizeTo: window, // 綁定 window 大小
      backgroundAlpha: 0,
      antialias: true, 
      resolution: Math.max(window.devicePixelRatio, 2), 
      autoDensity: true,
      powerPreference: 'high-performance',
    });

    // 確保 Canvas 填滿可用空間
    app.view.style.position = "absolute";
    app.view.style.top = "0";
    app.view.style.left = "0";
    app.view.style.width = "100vw";
    app.view.style.height = "100vh";
    app.view.style.zIndex = "1";
    document.body.appendChild(app.view);

    // 載入模型 (await 會停在這裡直到載入完成)
    const modelPath = "public/model/model.model3.json";
    model = await Live2DModel.from(modelPath, { autoUpdate: true });

    // 🌟 拔除無效的 modelLoaded 監聽，直接在這裡執行載入後的邏輯
    model.internalModel.textures.forEach((tex) => {
      if (tex.baseTexture) {
        tex.baseTexture.mipmap = PIXI.TYPES.MIPMAP_MODES.ON;
        tex.baseTexture.anisotropicLevel = 16;
        tex.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      }
    });
    
    userScaleOffset = 0.5;
    createZoomButtons(); // 確保按鈕立刻被建立！

    window.model = model;
    app.stage.addChild(model);
    model.internalModel.eyeBlink = null;

    setupInteraction(); 
    startBlinkLoop();
    app.ticker.add(updateParams);
    
    // 雙重強制重繪 (Double RAF)
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

// 確保網頁結構完全載入後才啟動
window.addEventListener('DOMContentLoaded', start);
