/**
 * 🚀 PIXI 應用程式初始化 (強化畫質設定)
 */
const app = new PIXI.Application({
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
app.view.style.zIndex = "1";
document.body.appendChild(app.view);

const Live2DModel = PIXI.live2d.Live2DModel;
Live2DModel.registerTicker(PIXI.Ticker);

let model;
let startX = 0; 
let startY = 0; 
let currentDiffX = 0; 
let currentDiffY = 0; 
let isOnModel = false;
let swipeAxis = null; 

// 🌟 參數狀態管理
let targetClothes = -1, currentClothes = -1;  // Param2
let targetParam7 = -1, currentParam7 = -1;    // Param7
let targetParam5 = -1, currentParam5 = -1;    // Param5
let targetParam3 = -1, currentParam3 = -1;    // Param3 (右滑)
let targetParam = -1, currentParam = -1;      // Param (左滑)
let targetParam6 = 0, currentParam6 = 0;      // Param6
let targetParam8 = 0, currentParam8 = 0;      // Param8
let blinkTarget = 1, blinkCurrent = 1;        

// 🔒 狀態管理
let isParam2Locked = false;
let isParam7Locked = false;
let isParam3Locked = false; 
let isParamLocked = false;  
let isParam6Triggered = false; 
let param5HoldStartTime = 0;   
let isHoldingForParam8 = false; 
let param8HoldStartTime = 0;    
let lockHistory = [];       
let lastTapTime = 0;

let userScaleOffset = 0.5; 
let zoomLock = false; 

const lerp = (a, b, t) => a + (b - a) * t;

function resize() {
  if (!model) return;
  try {
    const baseScale = window.innerHeight * 0.0004;
    let finalScale = baseScale * userScaleOffset;
    model.scale.set(finalScale);
    model.anchor.set(0.5, 0.5);
    model.x = window.innerWidth / 2;
    model.y = window.innerHeight / 2;
  } catch (err) { console.error(err); }
}

function createZoomButtons() {
  const container = document.createElement('div');
  container.id = 'zoom-container';
  container.style.cssText = `position: fixed; bottom: 80px; right: 25px; display: flex; flex-direction: column; gap: 20px; z-index: 10000;`;
  const btnStyle = `width: 65px; height: 65px; border-radius: 50%; border: 2px solid white; background: rgba(0, 0, 0, 0.7); color: white; font-size: 35px; cursor: pointer;`;
  
  const bP = document.createElement('button'); bP.innerText = '＋'; bP.style.cssText = btnStyle;
  const bM = document.createElement('button'); bM.innerText = '－'; bM.style.cssText = btnStyle;

  bP.onpointerdown = (e) => { e.preventDefault(); userScaleOffset = Math.min(userScaleOffset + 0.05, 5.0); resize(); };
  bM.onpointerdown = (e) => { e.preventDefault(); userScaleOffset = Math.max(userScaleOffset - 0.05, 0.1); resize(); };

  container.appendChild(bP); container.appendChild(bM);
  document.body.appendChild(container);
}

function updateParams() {
  if (!model?.internalModel?.coreModel) return;
  const core = model.internalModel.coreModel;
  
  // Param5/6 彩蛋邏輯
  if (targetParam5 === 1 && !isParam6Triggered) {
    if (param5HoldStartTime === 0) param5HoldStartTime = Date.now(); 
    else if (Date.now() - param5HoldStartTime >= 3000) { isParam6Triggered = true; targetParam6 = 2; }
  } else { param5HoldStartTime = 0; }

  // 🌟 Param8 蓄力邏輯 (增加穩定性)
  if (isHoldingForParam8 && isParam7Locked) {
    if (param8HoldStartTime === 0) param8HoldStartTime = Date.now();
    const holdTime = Date.now() - param8HoldStartTime;
    if (holdTime < 300) targetParam8 = 0;
    else if (holdTime < 600) targetParam8 = 1;
    else if (holdTime < 900) targetParam8 = 2;
    else targetParam8 = 3;
  } else {
    param8HoldStartTime = 0;
    targetParam8 = 0;
  }

  // 平滑過渡
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
  currentParam8 = lerp(currentParam8, targetParam8, 0.2);
  core.setParameterValueById("Param8", currentParam8);

  blinkCurrent = lerp(blinkCurrent, blinkTarget, 0.25);
  core.setParameterValueById("ParamEyeLOpen", blinkCurrent);
  core.setParameterValueById("ParamEyeROpen", blinkCurrent);
}

function setupInteraction() {
  app.view.style.touchAction = "none";

  // 雙擊復原
  app.view.addEventListener('pointerdown', (e) => {
    const now = Date.now();
    if (now - lastTapTime < 300 && lockHistory.length > 0) {
      const last = lockHistory.pop();
      if (last === 'Param2') { isParam2Locked = false; targetClothes = -1; targetParam5 = -1; }
      else if (last === 'Param7') { isParam7Locked = false; targetParam7 = -1; }
      else if (last === 'Param3') { isParam3Locked = false; targetParam3 = -1; }
      else if (last === 'Param') { isParamLocked = false; targetParam = -1; }
    }
    lastTapTime = now;
  });

  model.interactive = true;
  model.on('pointerdown', (e) => {
    isOnModel = true;
    startX = e.data.originalEvent.clientX || e.data.global.x;
    startY = e.data.originalEvent.clientY || e.data.global.y;
    swipeAxis = null;

    // 🌟 Param8 部位偵測 (寬鬆匹配)
    if (isParam7Locked) {
      const hitAreas = model.hitTest(e.data.global.x, e.data.global.y) || [];
      if (hitAreas.some(area => area.includes('58') || area.includes('59'))) {
        isHoldingForParam8 = true;
        param8HoldStartTime = Date.now();
      }
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!isOnModel) return;
    currentDiffX = e.clientX - startX;
    currentDiffY = startY - e.clientY;

    // 🌟 方向判定閾值提高到 25px，防止微小晃動中斷蓄力
    if (!swipeAxis && (Math.abs(currentDiffX) > 25 || Math.abs(currentDiffY) > 25)) {
      swipeAxis = Math.abs(currentDiffX) > Math.abs(currentDiffY) ? 'x' : 'y';
      isHoldingForParam8 = false; // 明確滑動時取消蓄力
    }

    if (swipeAxis === 'x') {
      // 🌟 左右滑動：僅受 Param2 限制，不再受 Param7 限制
      if (targetClothes === -1 && !isParam2Locked) {
        if (currentDiffX > 0) {
          if (!isParam3Locked) targetParam3 = currentDiffX < 40 ? -1 : (currentDiffX < 100 ? 0 : 1);
          if (!isParamLocked) targetParam = -1; // 左右互斥
        } else {
          const moveL = Math.abs(currentDiffX);
          if (!isParamLocked) targetParam = moveL < 40 ? -1 : (moveL < 100 ? 0 : 1);
          if (!isParam3Locked) targetParam3 = -1; // 左右互斥
        }
      }
    } else if (swipeAxis === 'y') {
      // 縱向滑動 (維持原有的上下互斥)
      if (targetParam3 === -1 && !isParam3Locked && targetParam === -1 && !isParamLocked) {
        if (currentDiffY > 0) {
          if (isParam2Locked) targetParam5 = currentDiffY < 30 ? -1 : (currentDiffY < 120 ? 0 : 1);
          else targetClothes = currentDiffY < 30 ? -1 : (currentDiffY < 120 ? 0 : 1);
        } else if (!isParam7Locked) {
          const down = Math.abs(currentDiffY);
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
    isHoldingForParam8 = false;

    // 鎖定判斷
    if (targetClothes === 1 && !isParam2Locked) { isParam2Locked = true; lockHistory.push('Param2'); }
    if (targetParam7 === 2.8 && !isParam7Locked) { isParam7Locked = true; lockHistory.push('Param7'); }
    if (targetParam3 === 1 && !isParam3Locked) { isParam3Locked = true; lockHistory.push('Param3'); }
    if (targetParam === 1 && !isParamLocked) { isParamLocked = true; lockHistory.push('Param'); }

    targetParam5 = -1;
    if (!isParam3Locked) targetParam3 = -1;
    if (!isParamLocked) targetParam = -1;
  });
}

async function start() {
  model = await Live2DModel.from("public/model/model.model3.json", { autoUpdate: true });
  app.stage.addChild(model);
  model.internalModel.eyeBlink = null;
  setupInteraction();
  app.ticker.add(updateParams);
  setInterval(() => { blinkTarget = 0; setTimeout(() => blinkTarget = 1, 120); }, 3500);
  resize();
  createZoomButtons();
}

window.addEventListener("resize", resize);
window.addEventListener('DOMContentLoaded', start);
