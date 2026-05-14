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
let startX = 0, startY = 0; 
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
let targetMouthForm = 0, currentMouthForm = 0; // 🌟 嘴型參數
let blinkTarget = 1, blinkCurrent = 1;        

// 🔒 狀態管理
let isParam2Locked = false, isParam7Locked = false;
let isParam3Locked = false, isParamLocked = false;  
let isParam6Triggered = false; 
let param5HoldStartTime = 0;   
let isHoldingForParam8 = false; 
let param8HoldStartTime = 0;    
let lockHistory = [];       
let lastTapTime = 0;
let mouthTimer = null; // 嘴型計時器

let userScaleOffset = 0.5; 
const lerp = (a, b, t) => a + (b - a) * t;

function resize() {
  if (!model) return;
  const baseScale = window.innerHeight * 0.0004;
  model.scale.set(baseScale * userScaleOffset);
  model.anchor.set(0.5, 0.5);
  model.x = window.innerWidth / 2;
  model.y = window.innerHeight / 2;
}

function updateParams() {
  if (!model?.internalModel?.coreModel) return;
  const core = model.internalModel.coreModel;
  
  // 🌟 Param5/6 觸發及嘴型連動邏輯
  if (targetParam5 === 1 && !isParam6Triggered) {
    if (param5HoldStartTime === 0) param5HoldStartTime = Date.now(); 
    else if (Date.now() - param5HoldStartTime >= 3000) { 
      isParam6Triggered = true; 
      targetParam6 = 2; 

      // 💥 嘴型變為 -1.0
      targetMouthForm = -1.0;
      if (mouthTimer) clearTimeout(mouthTimer);
      mouthTimer = setTimeout(() => {
        targetMouthForm = 0; // 3 秒後回歸 0
      }, 3000);
      console.log("💥 Param6 觸發：嘴型 ParamMouthForm 變為 -1.0，持續 3 秒");
    }
  } else { param5HoldStartTime = 0; }

  // 🌟 Param8 蓄力邏輯
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

  // 渲染與平滑處理
  currentClothes = lerp(currentClothes, targetClothes, 0.15);
  core.setParameterValueById("Param2", currentClothes);
  currentParam5 = lerp(currentParam5, targetParam5, 0.45);
  core.setParameterValueById("Param5", currentParam5);
  currentParam7 = lerp(currentParam7, targetParam7, 0.45);
  core.setParameterValueById("Param7", currentParam7);
  
  // 🌟 強制左右互斥：確保兩者不同時為 1
  if (targetParam3 === 1) targetParam = -1;
  if (targetParam === 1) targetParam3 = -1;

  currentParam3 = lerp(currentParam3, targetParam3, 0.45);
  core.setParameterValueById("Param3", currentParam3);
  currentParam = lerp(currentParam, targetParam, 0.45);
  core.setParameterValueById("Param", currentParam);
  
  currentParam6 = lerp(currentParam6, targetParam6, 0.05);
  core.setParameterValueById("Param6", currentParam6);
  currentParam8 = lerp(currentParam8, targetParam8, 0.2);
  core.setParameterValueById("Param8", currentParam8);

  // 嘴型渲染
  currentMouthForm = lerp(currentMouthForm, targetMouthForm, 0.2);
  core.setParameterValueById("ParamMouthForm", currentMouthForm);

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
    startX = e.data.global.x;
    startY = e.data.global.y;
    swipeAxis = null;

    // 🌟 指定部位長按判定 (Part58 / Part59)
    if (isParam7Locked) {
      const hitParts = model.hitTest(e.data.global.x, e.data.global.y);
      if (hitParts && hitParts.some(id => id.includes('58') || id.includes('59'))) {
        isHoldingForParam8 = true;
        param8HoldStartTime = Date.now();
        console.log("🎯 點擊到 Part58/59，開始蓄力...");
      }
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!isOnModel) return;
    const diffX = e.clientX - startX;
    const diffY = startY - e.clientY;

    // 🌟 容錯值設為 25px，防止微小晃動中斷長按
    if (!swipeAxis && (Math.abs(diffX) > 25 || Math.abs(diffY) > 25)) {
      swipeAxis = Math.abs(diffX) > Math.abs(diffY) ? 'x' : 'y';
      isHoldingForParam8 = false; 
    }

    if (swipeAxis === 'x') {
      // 左右滑動邏輯 (已加入互斥)
      if (!isParam2Locked) {
        if (diffX > 0) {
          if (!isParam3Locked) targetParam3 = diffX < 40 ? -1 : (diffX < 100 ? 0 : 1);
          targetParam = -1; 
        } else {
          const moveL = Math.abs(diffX);
          if (!isParamLocked) targetParam = moveL < 40 ? -1 : (moveL < 100 ? 0 : 1);
          targetParam3 = -1;
        }
      }
    } else if (swipeAxis === 'y') {
      // 🌟 縱向滑動：移除對左右動作的阻擋，讓 Param7 可以隨時觸發
      if (diffY > 0) { // 向上
        if (isParam2Locked) targetParam5 = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
        else targetClothes = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
      } else if (!isParam7Locked) { // 向下
        const down = Math.abs(diffY);
        if (down < 30) targetParam7 = -1;
        else if (down < 80) targetParam7 = 0.8;
        else if (down < 140) targetParam7 = 1.6;
        else if (down < 200) targetParam7 = 2.4;
        else targetParam7 = 2.8;
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
  try {
    model = await Live2DModel.from("public/model/model.model3.json", { autoUpdate: true });
    app.stage.addChild(model);
    model.internalModel.eyeBlink = null;
    setupInteraction();
    app.ticker.add(updateParams);
    setInterval(() => { blinkTarget = 0; setTimeout(() => blinkTarget = 1, 120); }, 4000);
    resize();
    window.addEventListener("resize", resize);
    console.log("✅ 系統已啟動：已修復互斥 Bug、解除向下阻擋、強化長按判定。");
  } catch (err) { console.error("啟動失敗:", err); }
}

window.addEventListener('DOMContentLoaded', start);
