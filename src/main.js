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

// 從全域變數抓取 Live2D 模組
const Live2DModel = PIXI.live2d.Live2DModel;
Live2DModel.registerTicker(PIXI.Ticker);

let model;
let startX = 0; 
let startY = 0; 
let currentDiffX = 0; // 實時 X 軸滑動距離
let currentDiffY = 0; // 實時 Y 軸滑動距離
let isOnModel = false;
let swipeAxis = null; 

// 🌟 參數狀態管理
let targetClothes = -1, currentClothes = -1;  // Param2 (上下)
let targetParam7 = -1, currentParam7 = -1;    // Param7 (向下)
let targetParam5 = -1, currentParam5 = -1;    // Param5 (向上接管)
let targetParam3 = -1, currentParam3 = -1;    // Param3 (右滑)
let targetParam = -1, currentParam = -1;      // Param (左滑)
let targetParam6 = 0, currentParam6 = 0;      // Param6 (長按3秒觸發彩蛋)
let targetParam8 = 0, currentParam8 = 0;      // 🌟 Param8 (指定部位長按蓄力)
let blinkTarget = 1, blinkCurrent = 1;        

// 🔒 鎖定、記憶體與計時狀態
let isParam2Locked = false;
let isParam7Locked = false;
let isParam3Locked = false; 
let isParamLocked = false;  
let isParam6Triggered = false; 
let param5HoldStartTime = 0;   
let isHoldingForParam8 = false; // 🌟 標記是否成功按在指定部位上
let param8HoldStartTime = 0;    // 🌟 記錄 Param8 的長按起始時間
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

    if (finalScale > 2.0 || finalScale < 0.001 || isNaN(finalScale)) {
      finalScale = 0.15; 
    }

    model.scale.set(finalScale);
    model.anchor.set(0.5, 0.5);
    model.x = window.innerWidth / 2;
    model.y = window.innerHeight / 2;

    model.internalModel.textures.forEach(tex => {
        tex.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        tex.baseTexture.anisotropicLevel = 16;
    });
  } catch (err) {
    console.error("Resize 計算失敗:", err);
  }
}

function createZoomButtons() {
  const existing = document.getElementById('zoom-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'zoom-container';
  container.style.cssText = `
    position: fixed; bottom: 80px; right: 25px;
    display: flex; flex-direction: column; gap: 20px; z-index: 10000;
  `;

  const btnStyle = `
    width: 65px; height: 65px; border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.8);
    background: rgba(0, 0, 0, 0.7); color: white;
    font-size: 35px; font-weight: bold; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    user-select: none; touch-action: none; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  `;

  const btnPlus = document.createElement('button');
  btnPlus.innerText = '＋'; btnPlus.style.cssText = btnStyle;

  const btnMinus = document.createElement('button');
  btnMinus.innerText = '－'; btnMinus.style.cssText = btnStyle;

  const handleZoom = (amount) => {
    if (zoomLock) return;
    zoomLock = true;
    userScaleOffset = parseFloat((userScaleOffset + amount).toFixed(2));
    userScaleOffset = Math.max(0.1, Math.min(userScaleOffset, 5.0));
    resize();
    setTimeout(() => { zoomLock = false; }, 400);
  };

  btnPlus.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); handleZoom(0.05); };
  btnMinus.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); handleZoom(-0.05); };

  container.appendChild(btnPlus);
  container.appendChild(btnMinus);
  document.body.appendChild(container);
}

function updateParams() {
  if (!model?.internalModel?.coreModel) return;
  const core = model.internalModel.coreModel;
  
  // Param5 長按 3 秒計時邏輯
  if (targetParam5 === 1 && !isParam6Triggered) {
    if (param5HoldStartTime === 0) param5HoldStartTime = Date.now(); 
    else if (Date.now() - param5HoldStartTime >= 3000) {
      isParam6Triggered = true;
      targetParam6 = 2; 
    }
  } else if (targetParam5 !== 1) {
    param5HoldStartTime = 0; 
  }

  // 🌟 Param8 指定部位長按蓄力邏輯
  let isChargingParam8 = false;
  
  // 條件：必須 Param7 達到 2.8、手指按在畫面上，且「成功點擊到 Part58 或 Part59」
  if (targetParam7 === 2.8 && isOnModel && isHoldingForParam8) {
    if (swipeAxis === null) {
      isChargingParam8 = true; // 沒滑動，純按住
    } else if (swipeAxis === 'y' && currentDiffY <= 0) {
      isChargingParam8 = true; // 滑到底部後繼續按住
    }
  }

  if (isChargingParam8) {
    if (param8HoldStartTime === 0) param8HoldStartTime = Date.now();
    const holdTime = Date.now() - param8HoldStartTime;
    // 每 0.3 秒升一級
    if (holdTime < 300) targetParam8 = 0;
    else if (holdTime < 600) targetParam8 = 1;
    else if (holdTime < 900) targetParam8 = 2;
    else targetParam8 = 3;
  } else {
    param8HoldStartTime = 0;
    targetParam8 = 0; // 未達條件或手放開時，目標瞬間回歸 0
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

  currentParam8 = lerp(currentParam8, targetParam8, 0.2);
  core.setParameterValueById("Param8", currentParam8);

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

function setupInteraction() {
  app.view.style.touchAction = "none";

  // 1. 雙擊螢幕
  app.view.addEventListener('pointerdown', (e) => {
    const currentTime = Date.now();
    if (currentTime - lastTapTime < 300) {
      if (lockHistory.length > 0) {
        const lastLocked = lockHistory.pop(); 
        
        if (lastLocked === 'Param2') {
          isParam2Locked = false;
          targetClothes = -1;
          targetParam5 = -1; 
          console.log("🔄 復原：Param2");
        } else if (lastLocked === 'Param7') {
          isParam7Locked = false;
          targetParam7 = -1;
          console.log("🔄 復原：Param7");
        } else if (lastLocked === 'Param3') { 
          isParam3Locked = false;
          targetParam3 = -1;
          console.log("🔄 復原：Param3 (右滑)");
        } else if (lastLocked === 'Param') { 
          isParamLocked = false;
          targetParam = -1;
          console.log("🔄 復原：Param (左滑)");
        }
      }
    }
    lastTapTime = currentTime;
  });

  // 2. 精準觸控
  model.interactive = true; 
  model.buttonMode = true; 

  model.on('pointerdown', (e) => {
    isOnModel = true;
    startX = e.data.originalEvent.clientX || e.data.global.x; 
    startY = e.data.originalEvent.clientY || e.data.global.y; 
    currentDiffX = 0; 
    currentDiffY = 0; 
    swipeAxis = null; 

    // 🌟 部位點擊判定：只有在 Param7 鎖定時，且點中特定部位才允許蓄力
    if (isParam7Locked) {
      const hitAreas = model.hitTest(e.data.global.x, e.data.global.y) || [];
      if (hitAreas.includes('Part58') || hitAreas.includes('Part59')) {
        isHoldingForParam8 = true;
        console.log("🎯 成功點擊目標物件 (Part58/Part59)，準備蓄力 Param8！");
      } else {
        console.log("❌ 未點擊在 Part58 或 Part59 上，當前點擊部位為：", hitAreas);
      }
    }
  });
  
  window.addEventListener('pointermove', (e) => {
    if (!isOnModel) return;
    
    currentDiffX = e.clientX - startX; 
    currentDiffY = startY - e.clientY; 
    
    // 判斷並鎖死滑動方向
    if (!swipeAxis && (Math.abs(currentDiffX) > 10 || Math.abs(currentDiffY) > 10)) {
      swipeAxis = Math.abs(currentDiffX) > Math.abs(currentDiffY) ? 'x' : 'y';
      
      // 🌟 如果使用者開始明顯滑動，立刻取消部位的長按判定
      isHoldingForParam8 = false;
    }
    
    if (swipeAxis === 'x') {
      // ➡️ 橫向滑動 (左右防打架)
      // 🌟【終極互斥防衝突】：只有在 Param2 和 Param7 都「沒有動作」且「沒鎖定」時，才能左右滑動
      if (targetClothes === -1 && !isParam2Locked && targetParam7 === -1 && !isParam7Locked) { 
        if (currentDiffX > 0) {
          if (!isParam3Locked) targetParam3 = currentDiffX < 40 ? -1 : (currentDiffX < 100 ? 0 : 1);
          if (!isParamLocked) targetParam = -1; 
        } else {
          const moveLeft = Math.abs(currentDiffX);
          if (!isParamLocked) targetParam = moveLeft < 40 ? -1 : (moveLeft < 100 ? 0 : 1);
          if (!isParam3Locked) targetParam3 = -1;
        }
      }
    } else if (swipeAxis === 'y') {
      // ⬆️⬇️ 縱向滑動 (上下防打架)
      // 🌟【終極互斥防衝突】：只有在 Param3 和 Param 都「沒有動作」且「沒鎖定」時，才能上下滑動
      if (targetParam3 === -1 && !isParam3Locked && targetParam === -1 && !isParamLocked) {
        if (currentDiffY > 0) {
          if (isParam2Locked) {
            targetParam5 = currentDiffY < 30 ? -1 : (currentDiffY < 120 ? 0 : 1);
          } else {
            targetClothes = currentDiffY < 30 ? -1 : (currentDiffY < 120 ? 0 : 1);
          }
        } else {
          if (!isParam7Locked) {
            const down = Math.abs(currentDiffY);
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
    swipeAxis = null;

    // 🌟 手指放開，立即取消部位的長按標記
    isHoldingForParam8 = false;

    // 判斷鎖定條件
    if (targetClothes === 1 && !isParam2Locked) {
      isParam2Locked = true;
      lockHistory.push('Param2');
    }
    
    if (targetParam7 === 2.8 && !isParam7Locked) {
      isParam7Locked = true;
      lockHistory.push('Param7');
    }

    if (targetParam3 === 1 && !isParam3Locked) {
      isParam3Locked = true;
      lockHistory.push('Param3');
    }

    if (targetParam === 1 && !isParamLocked) {
      isParamLocked = true;
      lockHistory.push('Param');
    }

    // 未達鎖定條件的參數，手指放開即彈回
    targetParam5 = -1;
    if (!isParam3Locked) targetParam3 = -1;
    if (!isParamLocked) targetParam = -1; 
  });
}

async function start() {
  try {
    console.log("⏳ 正在讀取模型...");
    const modelPath = "public/model/model.model3.json";

    model = await Live2DModel.from(modelPath, { autoUpdate: true });

    model.on('modelLoaded', () => {
      model.internalModel.textures.forEach((tex) => {
        if (tex.baseTexture) {
          tex.baseTexture.mipmap = PIXI.TYPES.MIPMAP_MODES.ON;
          tex.baseTexture.anisotropicLevel = 16;
          tex.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        }
      });
      userScaleOffset = 0.5;
      setTimeout(resize, 300);
    });

    window.model = model;
    app.stage.addChild(model);
    model.internalModel.eyeBlink = null;

    setupInteraction(); 
    startBlinkLoop();
    createZoomButtons(); 
    app.ticker.add(updateParams);
    
    resize();
    console.log("✅ 畫質強化版已啟動，精準部位點擊蓄力系統與全向防衝突已正式上線！");
  } catch (err) {
    console.error("啟動失敗:", err);
  }
}

window.addEventListener("resize", resize);
window.addEventListener('DOMContentLoaded', start);
