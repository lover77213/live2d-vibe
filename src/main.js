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
let targetParam5 = -1, currentParam5 = -1;    // 🌟 新增：對應 Param5
let blinkTarget = 1, blinkCurrent = 1;        // 對應 眨眼

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
  
  // 衣服 1 (Param2)：維持原本的速度
  currentClothes = lerp(currentClothes, targetClothes, 0.15);
  core.setParameterValueById("Param2", currentClothes);

  // 🌟 衣服 3 (Param5)：新增條件式觸發，速度設為 0.45 保持絲滑無殘影
  currentParam5 = lerp(currentParam5, targetParam5, 0.45);
  core.setParameterValueById("Param5", currentParam5);
  
  // 衣服 2 (Param7)：速度提升到 0.45，解決半透明過渡幀
  currentParam7 = lerp(currentParam7, targetParam7, 0.45);
  core.setParameterValueById("Param7", currentParam7);
  
  // 眨眼：維持原本的速度
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
  app.view.onpointerdown = (e) => {
    const { innerWidth: w, innerHeight: h } = window;
    // 判斷點擊區域是否在模型身上
    if (e.clientX < w * 0.7 && e.clientY > h * 0.1 && e.clientY < h * 0.9) {
      isOnModel = true;
      startY = e.clientY;
    }
  };
  
  app.view.onpointermove = (e) => {
    if (!isOnModel) return;
    const diffY = startY - e.clientY;
    
    if (diffY > 0) {
      // 🌟 向上拖曳邏輯：條件式觸發 🌟
      if (targetClothes === -1) {
        // 當 Param2 處於 -1 (消失) 狀態時，往上滑改為控制 Param5
        targetParam5 = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
      } else {
        // 否則維持控制 Param2
        targetClothes = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
      }
    } else {
      // 向下拖曳：Param7 吸附邏輯
      const down = Math.abs(diffY);
      
      // 根據拖曳距離(像素)，指定要「吸附」的目標數值
      if (down < 30) {
        targetParam7 = -1;    // 預設狀態 (未達觸發距離)
      } else if (down < 80) {
        targetParam7 = 0.8;   // 第一階段停靠點
      } else if (down < 140) {
        targetParam7 = 1.6;   // 第二階段停靠點
      } else if (down < 200) {
        targetParam7 = 2.4;   // 第三階段停靠點
      } else {
        targetParam7 = 2.8;   // 第四階段停靠點 (拉到底)
      }
    }
  };
  
  app.view.onpointerup = () => { 
    isOnModel = false; 
  };
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
    console.log("✅ 畫質強化版已啟動，包含互動與按鈕！");
  } catch (err) {
    console.error("啟動失敗:", err);
  }
}

window.addEventListener("resize", resize);

// 確保網頁準備好再啟動
window.addEventListener('DOMContentLoaded', start);
