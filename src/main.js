/**
 * 🚀 PIXI 應用程式初始化 (強化畫質設定)
 */
const app = new PIXI.Application({
  resizeTo: window,
  backgroundAlpha: 0,
  antialias: true, // 開啟抗鋸齒
  resolution: Math.max(window.devicePixelRatio, 2), // 強制至少 2 倍解析度，解決放大模糊
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

// 🌟 參數狀態管理
let targetClothes = -1, currentClothes = -1;  // 對應 Param2 (上下)
let targetParam7 = -1, currentParam7 = -1;    // 對應 Param7 (向下)
let targetParam5 = -1, currentParam5 = -1;    // 對應 Param5 (Param2 消失後向上接管)
let targetParam3 = -1, currentParam3 = -1;    // 🌟 對應 Param3 (右滑)
let targetParam4 = -1, currentParam4 = -1;    // 🌟 對應 Param4 (左滑)
let blinkTarget = 1, blinkCurrent = 1;        // 對應 眨眼

// 🔒 鎖定與雙擊判定狀態
let isParam2Locked = false;
let isParam7Locked = false;
let isParam3Locked = false; // 🌟 鎖定 Param3
let isParam4Locked = false; // 🌟 鎖定 Param4
let lockHistory = [];       // 記憶體：用來記錄鎖定物件的先後順序
let lastTapTime = 0;

// ⭐ 初始縮放係數
let userScaleOffset = 0.5; 
let zoomLock = false; 

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * 📏 自動縮放與畫質維持
 */
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

/**
 * 🎨 建立縮放按鈕
 */
function createZoomButtons() {
  const existing = document.getElementById('zoom-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'zoom-container';
  container.style.cssText = `
    position: fixed;
    bottom: 80px; 
    right: 25px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    z-index: 10000;
  `;

  const btnStyle = `
    width: 65px;
    height: 65px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.8);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 35px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    touch-action: none;
    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  `;

  const btnPlus = document.createElement('button');
  btnPlus.innerText = '＋';
  btnPlus.style.cssText = btnStyle;

  const btnMinus = document.createElement('button');
  btnMinus.innerText = '－';
  btnMinus.style.cssText = btnStyle;

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
  
  // Param2 (速度 0.15)
  currentClothes = lerp(currentClothes, targetClothes, 0.15);
  core.setParameterValueById("Param2", currentClothes);

  // Param5
  currentParam5 = lerp(currentParam5, targetParam5, 0.45);
  core.setParameterValueById("Param5", currentParam5);
  
  // Param7
  currentParam7 = lerp(currentParam7, targetParam7, 0.45);
  core.setParameterValueById("Param7", currentParam7);

  // 🌟 Param3 (右滑)
  currentParam3 = lerp(currentParam3, targetParam3, 0.45);
  core.setParameterValueById("Param3", currentParam3);

  // 🌟 Param4 (左滑)
  currentParam4 = lerp(currentParam4, targetParam4, 0.45);
  core.setParameterValueById("Param4", currentParam4);
  
  // 眨眼
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
 * 👆 設定互動邏輯 (精準觸控與十字鎖定)
 */
function setupInteraction() {
  app.view.style.touchAction = "none";

  // 1. 🌟 雙擊螢幕：只恢復「上一個」鎖定的物件
  app.view.addEventListener('pointerdown', (e) => {
    const currentTime = Date.now();
    if (currentTime - lastTapTime < 300) {
      if (lockHistory.length > 0) {
        // 取出記憶體中最後一個鎖定的名稱
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
        } else if (lastLocked === 'Param3') { // 🌟 解鎖 Param3
          isParam3Locked = false;
          targetParam3 = -1;
          console.log("🔄 復原：Param3");
        } else if (lastLocked === 'Param4') { // 🌟 解鎖 Param4
          isParam4Locked = false;
          targetParam4 = -1;
          console.log("🔄 復原：Param4");
        }
      } else {
        console.log("ℹ️ 已經全部復原，沒有可以恢復的物件了");
      }
    }
    lastTapTime = currentTime;
  });

  // 2. 精準觸控：將點擊判定綁定在模型上
  model.interactive = true; 
  model.buttonMode = true; 

  model.on('pointerdown', (e) => {
    isOnModel = true;
    startX = e.data.global.x; // 記錄模型上的 X 座標 (用於左右滑)
    startY = e.data.global.y; // 記錄模型上的 Y 座標 (用於上下滑)
  });
  
  // 拖曳判定綁定在 window 確保滑動不中斷
  window.addEventListener('pointermove', (e) => {
    if (!isOnModel) return;
    const diffX = e.clientX - startX; // X軸差異 (正=右, 負=左)
    const diffY = startY - e.clientY; // Y軸差異 (正=上, 負=下)
    
    // 🌟 十字向判定：根據滑動幅度決定是「橫向」還是「縱向」
    if (Math.abs(diffX) > Math.abs(diffY)) {
      // ➡️ 橫向滑動
      if (targetClothes === -1 && !isParam2Locked) { 
        // 限制：只有在 Param2 是 -1 的狀態下，才允許左右滑動
        if (diffX > 0) {
          // 右滑：觸發 Param3
          if (!isParam3Locked) {
            targetParam3 = diffX < 30 ? -1 : (diffX < 120 ? 0 : 1);
          }
        } else {
          // 左滑：觸發 Param4
          if (!isParam4Locked) {
            const moveLeft = Math.abs(diffX);
            targetParam4 = moveLeft < 30 ? -1 : (moveLeft < 120 ? 0 : 1);
          }
        }
      }
    } else {
      // ⬆️⬇️ 縱向滑動 (原本的邏輯)
      if (diffY > 0) {
        // 向上拖曳
        if (isParam2Locked) {
          targetParam5 = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
        } else {
          targetClothes = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
        }
      } else {
        // 向下拖曳
        if (!isParam7Locked) {
          const down = Math.abs(diffY);
          if (down < 30) {
            targetParam7 = -1;
          } else if (down < 80) {
            targetParam7 = 0.8;
          } else if (down < 140) {
            targetParam7 = 1.6;
          } else if (down < 200) {
            targetParam7 = 2.4;
          } else {
            targetParam7 = 2.8;
          }
        }
      }
    }
  });
  
  window.addEventListener('pointerup', () => { 
    if (!isOnModel) return;
    isOnModel = false; 

    // 3. 🌟 判斷所有鎖定條件，並把鎖定的東西加入記憶體 (lockHistory)
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

    if (targetParam4 === 1 && !isParam4Locked) {
      isParam4Locked = true;
      lockHistory.push('Param4');
    }

    // 4. 未達鎖定條件的，手指放開即彈回
    targetParam5 = -1;
    if (!isParam3Locked) targetParam3 = -1;
    if (!isParam4Locked) targetParam4 = -1;
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

    // 必須在模型 addChild 後呼叫 setupInteraction，否則 model.interactive 會報錯
    setupInteraction(); 
    
    startBlinkLoop();
    createZoomButtons(); 
    app.ticker.add(updateParams);
    
    resize();
    console.log("✅ 畫質強化版已啟動，包含十字滑動與多重鎖定邏輯！");
  } catch (err) {
    console.error("啟動失敗:", err);
  }
}

window.addEventListener("resize", resize);

// 確保網頁準備好再啟動
window.addEventListener('DOMContentLoaded', start);
