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

// 從全域變數抓取 Live2D 模組
const Live2DModel = PIXI.live2d.Live2DModel;
Live2DModel.registerTicker(PIXI.Ticker);

let model;
let startX = 0; // 🌟 X 軸起始位置 (用於左右滑動)
let startY = 0; // Y 軸起始位置 (用於上下滑動)
let isOnModel = false;
let swipeAxis = null; // 🌟 滑動軸向鎖定 (防止斜滑同時觸發)

// 🌟 參數狀態管理
let targetClothes = -1, currentClothes = -1;  // Param2 (上下)
let targetParam7 = -1, currentParam7 = -1;    // Param7 (向下)
let targetParam5 = -1, currentParam5 = -1;    // Param5 (向上接管)
let targetParam3 = -1, currentParam3 = -1;    // Param3 (右滑)
let targetParam = -1, currentParam = -1;      // Param (左滑)
let targetParam6 = 0, currentParam6 = 0;      // Param6 (長按3秒觸發彩蛋，目標為2)
let currentParam8 = 0;                        // 🌟 Param8 當前值
let param8Progress = 0;                       // 🌟 Param8 擠壓進度 (0.0 ~ 1.0)
let blinkTarget = 1, blinkCurrent = 1;        

// 🔒 鎖定、記憶體與計時狀態
let isParam2Locked = false;
let isParam7Locked = false;
let isParam3Locked = false; 
let isParamLocked = false;  
let isParam6Triggered = false; // 標記 Param6 是否已觸發 (不可逆)
let param5HoldStartTime = 0;   // 記錄 Param5 維持在 1 的時間
let isHoldingForParam8 = false; // 🌟 標記是否正在為 Param8 長按
let lockHistory = [];          // 記憶體堆疊
let lastTapTime = 0;

let userScaleOffset = 0.5; 
let zoomLock = false; 

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * 📏 自動縮放與畫質維持 (包含手機端縮小機制)
 */
function resize() {
  if (!model) return;

  try {
    let baseScale = window.innerHeight * 0.0004;

    // 🌟 手機端網頁角色縮小 40% (螢幕寬度小於等於 768px 時生效)
    if (window.innerWidth <= 768) {
      baseScale = baseScale * 0.6;
    }

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

/**
 * 🎨 建立縮放按鈕
 */
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

/**
 * ⚙️ 更新所有 Live2D 參數
 */
function updateParams() {
  if (!model?.internalModel?.coreModel) return;
  const core = model.internalModel.coreModel;
  
  // 🌟 隱藏彩蛋：Param5 長按 3 秒計時邏輯
  if (targetParam5 === 1 && !isParam6Triggered) {
    if (param5HoldStartTime === 0) {
      param5HoldStartTime = Date.now(); // 開始計時
    } else if (Date.now() - param5HoldStartTime >= 3000) {
      isParam6Triggered = true;
      targetParam6 = 2; // 目標值設定為 2
      console.log("💥 彩蛋觸發！Param5 停留超過3秒，Param6 已永久改變為 2！");
    }
  } else if (targetParam5 !== 1) {
    param5HoldStartTime = 0; 
  }

  // 🌟 Param8 水球擠壓動畫 (使用 SmoothStep 曲線)
  if (isHoldingForParam8 && isParam7Locked) {
    param8Progress += 0.04 * app.ticker.deltaTime; // 擠壓速度 (可調整)
    if (param8Progress > 1.0) param8Progress = 1.0;
  } else {
    param8Progress -= 0.05 * app.ticker.deltaTime; // 回彈速度稍微快一點 (可調整)
    if (param8Progress < 0.0) param8Progress = 0.0;
  }
  
  // 核心 S 曲線公式：起步柔順、中段快、結尾平滑 (3t^2 - 2t^3)
  const sCurve = param8Progress * param8Progress * (3.0 - 2.0 * param8Progress);
  currentParam8 = sCurve * 3.0; // 將進度映射到 0~3 的數值區間
  core.setParameterValueById("Param8", currentParam8);

  // 🌟 絕對平滑的完美呼吸：使用原生系統時間，徹底消除機械斷層感
  const timeSec = performance.now() / 1000.0;
  // 控制呼吸節奏 (1.8 約為平穩柔順的起伏頻率)
  const breathValue = (Math.sin(timeSec * 1.8) + 1.0) / 2.0; 
  core.setParameterValueById("ParamBreath", breathValue);

  // 其他參數平滑更新
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
 * 👆 設定互動邏輯 (十字滑動、互斥鎖定)
 */
function setupInteraction() {
  app.view.style.touchAction = "none";

  // 1. 雙擊螢幕：只恢復「上一個」鎖定的物件
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
      } else {
        console.log("ℹ️ 已經全部復原");
      }
    }
    lastTapTime = currentTime;
  });

  // 2. 精準觸控：綁定在模型上
  model.interactive = true; 
  model.buttonMode = true; 

  model.on('pointerdown', (e) => {
    isOnModel = true;
    startX = e.data.originalEvent.clientX || e.data.global.x; 
    startY = e.data.originalEvent.clientY || e.data.global.y; 
    swipeAxis = null; 

    // 🌟 極度放寬的蓄力判定：只要 Param7 處於鎖定狀態，按住螢幕就開始計算
    if (isParam7Locked) {
      isHoldingForParam8 = true;
    }
  });
  
  window.addEventListener('pointermove', (e) => {
    if (!isOnModel) return;
    const diffX = e.clientX - startX; 
    const diffY = startY - e.clientY; 
    
    // 🌟 判定大幅放寬：容錯提高到 35，徹底解決因為微小手抖中斷蓄力的問題
    if (!swipeAxis && (Math.abs(diffX) > 35 || Math.abs(diffY) > 35)) {
      swipeAxis = Math.abs(diffX) > Math.abs(diffY) ? 'x' : 'y';
      
      // 只有明確產生大滑動時，才取消 Param8 蓄力
      isHoldingForParam8 = false;
    }
    
    if (swipeAxis === 'x') {
      // ➡️ 橫向滑動
      if (targetClothes === -1 && !isParam2Locked) { 
        if (diffX > 0) {
          // 【右滑】觸發 Param3，並強制壓制 Param
          if (!isParam3Locked) targetParam3 = diffX < 40 ? -1 : (diffX < 100 ? 0 : 1);
          if (!isParamLocked) targetParam = -1; 
        } else {
          // 【左滑】觸發 Param，並強制壓制 Param3
          const moveLeft = Math.abs(diffX);
          if (!isParamLocked) targetParam = moveLeft < 40 ? -1 : (moveLeft < 100 ? 0 : 1);
          if (!isParam3Locked) targetParam3 = -1;
        }
      }
    } else if (swipeAxis === 'y') {
      // ⬆️⬇️ 縱向滑動
      if (diffY > 0) {
        // 互斥機制：如果左右 (Param3 或 Param) 處於鎖定狀態，則完全禁止向上滑動
        if (!isParam3Locked && !isParamLocked) {
          if (isParam2Locked) {
            targetParam5 = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
          } else {
            targetClothes = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
          }
        } else {
          console.log("⛔ 左右狀態尚未解除，禁止向上滑動！");
        }
      } else {
        // 向下拖曳
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

    // 🌟 手指放開，立刻取消長按標記，進入 S 曲線回彈階段
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
    console.log("✅ 畫質強化版已啟動，S曲線蓄力與真平滑呼吸系統完美上線！");
  } catch (err) {
    console.error("啟動失敗:", err);
  }
}

window.addEventListener("resize", resize);
window.addEventListener('DOMContentLoaded', start);
