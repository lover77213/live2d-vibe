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
let startY = 0;
let isOnModel = false;

// 🌟 參數狀態管理
let targetClothes = -1, currentClothes = -1;  // 對應 Param2
let targetParam7 = -1, currentParam7 = -1;    // 對應 Param7
let targetParam5 = -1, currentParam5 = -1;    // 對應 Param5
let blinkTarget = 1, blinkCurrent = 1;        // 對應 眨眼

// 🔒 鎖定與雙擊判定狀態
let isParam2Locked = false;
let isParam7Locked = false;
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

  // Param5 (速度 0.45 保持順暢)
  currentParam5 = lerp(currentParam5, targetParam5, 0.45);
  core.setParameterValueById("Param5", currentParam5);
  
  // Param7 (速度 0.45 解決過渡幀)
  currentParam7 = lerp(currentParam7, targetParam7, 0.45);
  core.setParameterValueById("Param7", currentParam7);
  
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
 * 👆 設定互動邏輯 (精準觸控與鎖定)
 */
function setupInteraction() {
  app.view.style.touchAction = "none";

  // 1. 雙擊螢幕恢復原狀
  app.view.addEventListener('pointerdown', (e) => {
    const currentTime = Date.now();
    if (currentTime - lastTapTime < 300) {
      // 觸發雙擊！重置所有鎖定與參數
      isParam2Locked = false;
      targetClothes = -1;
      
      isParam7Locked = false;
      targetParam7 = -1;
      
      targetParam5 = -1;
    }
    lastTapTime = currentTime;
  });

  // 2. 精準觸控：將點擊判定綁定在模型上
  model.interactive = true; 
  model.buttonMode = true; 

  model.on('pointerdown', (e) => {
    isOnModel = true;
    startY = e.data.global.y; // 取得模型上的 Y 座標
  });
  
  // 拖曳判定綁定在 window 確保滑動不中斷
  window.addEventListener('pointermove', (e) => {
    if (!isOnModel) return;
    const diffY = startY - e.clientY;
    
    if (diffY > 0) {
      // 向上拖曳
      if (isParam2Locked) {
        // Param2 已鎖定，改為控制 Param5
        targetParam5 = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
      } else {
        // Param2 尚未鎖定，控制 Param2
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
  });
  
  window.addEventListener('pointerup', () => { 
    if (!isOnModel) return;
    isOnModel = false; 

    // 3. 判斷鎖定條件
    // 假設 Param2 拉到 1 代表完全消失/脫掉
    if (targetClothes === 1) {
      isParam2Locked = true;
    }
    
    // Param7 拉到 2.8 代表完全消失
    if (targetParam7 === 2.8) {
      isParam7Locked = true;
    }

    // 4. Param5 放開即彈回
    targetParam5 = -1;
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
    console.log("✅ 畫質強化版已啟動，包含完美互動邏輯！");
  } catch (err) {
    console.error("啟動失敗:", err);
  }
}

window.addEventListener("resize", resize);

// 確保網頁準備好再啟動
window.addEventListener('DOMContentLoaded', start);
