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

let userScaleOffset = 0.5; 
let zoomDirection = 0; // 縮放方向狀態：1 (放大), -1 (縮小), 0 (停止)

// 🔍 畫中畫 (PiP) 特寫系統狀態
let pipContainer;
let pipSprite;
let pipRenderTexture;
let pipMask;
let pipBorder;
let currentPipAlpha = 0;

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

    // 🌟 同步更新局部特寫的畫面配置 (確保縮放時特寫位置不跑掉)
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

// 支援傳入自訂文字、顏色、停留時間與大小
function spawnFloatingText(x, y, text = "嗯...❤️", color = "#ffb3c6", duration = 1500, fontSize = "28px") {
  const container = document.getElementById('effect-container');
  if (!container) return;

  const textEl = document.createElement('div');
  textEl.innerText = text;
  
  // 基礎樣式
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

  // 漂浮動畫
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

  // 綁定點擊事件
  hitbox.addEventListener('pointerdown', (e) => {
    // 檢查雙擊復原邏輯
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

    // 觸發 Param8 邏輯
    if (isParam7Locked) {
      isOnModel = true;
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
  // 建立渲染紋理，解析度與主畫面一致
  pipRenderTexture = PIXI.RenderTexture.create({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: app.renderer.resolution || window.devicePixelRatio || 1
  });
  pipSprite = new PIXI.Sprite(pipRenderTexture);
  
  pipContainer = new PIXI.Container();
  pipContainer.alpha = 0; // 初始完全隱藏
  
  pipMask = new PIXI.Graphics();
  pipBorder = new PIXI.Graphics();
  
  pipContainer.addChild(pipSprite);
  pipContainer.addChild(pipMask);
  pipContainer.addChild(pipBorder);
  pipContainer.mask = pipMask;
  
  // 加入主舞台，但層級要在最高
  app.stage.addChild(pipContainer);
  updatePiPLayout();
}

/**
 * 🔍 🌟 動態更新局部特寫的大小與對焦位置
 */
function updatePiPLayout() {
  if (!pipContainer || !pipRenderTexture || !model) return;
  
  pipRenderTexture.resize(window.innerWidth, window.innerHeight);
  
  // 設定正方形尺寸 (自適應螢幕，最大 320px)
  const isMobile = window.innerWidth < window.innerHeight;
  const size = isMobile ? Math.min(window.innerWidth * 0.45, 250) : Math.min(window.innerWidth * 0.3, 320);
  const padding = 25;
  
  // 🌟 將畫中畫框框往上移一點 (避免擋住手部)
  pipContainer.x = window.innerWidth - size - padding;
  pipContainer.y = window.innerHeight * 0.3; // 從 50% 移到 30% 高度
  
  // 圓角遮罩
  pipMask.clear();
  pipMask.beginFill(0xffffff);
  pipMask.drawRoundedRect(0, 0, size, size, 20);
  pipMask.endFill();
  
  // 繪製粉色發光感邊框
  pipBorder.clear();
  pipBorder.lineStyle(6, 0xffb3c6, 0.9);
  pipBorder.drawRoundedRect(0, 0, size, size, 20);
  
  // 200% 放大特寫
  const zoomLevel = 2.0;
  pipSprite.scale.set(zoomLevel);
  
  // 🌟 動態對焦核心邏輯：根據模型目前的縮放與 Y 座標，動態計算 Param5 (胸部) 的相對位置
  // yOffset 是調整對焦點的關鍵值，數值越負，對焦點越高。
  const yOffset = -150 * model.scale.y; 
  
  const focusX = model.x;
  const focusY = model.y + yOffset;
  
  pipSprite.x = size / 2 - focusX * zoomLevel;
  pipSprite.y = size / 2 - focusY * zoomLevel;
}

/**
 * ⚙️ 更新所有 Live2D 參數
 */
function updateParams() {
  // 長按縮放連續判定
  if (zoomDirection !== 0) {
    userScaleOffset += zoomDirection * 0.015;
    userScaleOffset = Math.max(0.1, Math.min(userScaleOffset, 5.0));
    resize(); // 這裡呼叫 resize 也會自動觸發 updatePiPLayout 重新對焦
  }

  // 🎯 控制隱形圖層的顯示與隱藏
  const hitbox = document.getElementById('param8-invisible-hitbox');
  if (hitbox) {
    hitbox.style.display = isParam7Locked ? 'block' : 'none';
  }

  // 🔍 更新 200% 特寫畫中畫的漸顯漸隱與渲染
  if (pipContainer) {
    const pipTargetAlpha = (targetParam5 > 0) ? 1.0 : 0.0;
    currentPipAlpha = lerp(currentPipAlpha, pipTargetAlpha, 0.15); 
    
    pipContainer.alpha = currentPipAlpha;
    
    // 只有在肉眼可見時才消耗效能去擷取畫面
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
  
  // 🌟 彩蛋邏輯 (Param6 觸發文字)
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

  // 🌟 Param8 與 Param5 的表情連動
  let p8Target = 0.0;
  
  if ((isHoldingForParam8 && isParam7Locked) || targetParam5 > 0) {
    if (isHoldingForParam8 && isParam7Locked) p8Target = 3.0; // 只有 Param8 觸發水球
    targetEyeY = -1.0;      // 眼睛向下看
    targetMouthForm = -1.0; // 嘴巴表情變換
  } else {
    p8Target = 0.0;
    targetEyeY = 0.0;       // 恢復正常眼位
    targetMouthForm = 0.0;  // 恢復正常嘴型
  }

  // 平滑更新 Param8
  currentParam8 = lerp(currentParam8, p8Target, 0.4);
  core.setParameterValueById("Param8", currentParam8);

  // 平滑更新 眼位與嘴型
  currentEyeY = lerp(currentEyeY, targetEyeY, 0.3);
  core.setParameterValueById("ParamEyeBallY", currentEyeY);

  currentMouthForm = lerp(currentMouthForm, targetMouthForm, 0.3);
  core.setParameterValueById("ParamMouthForm", currentMouthForm);

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

  // 背景的雙擊復原邏輯
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
  });
  
  window.addEventListener('pointermove', (e) => {
    if (!isOnModel) return;
    const diffX = e.clientX - startX; 
    const diffY = startY - e.clientY; 
    
    // 🌟 滑動軸向動態解鎖
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
          if (targetParam3 === -1) {
              isParam3Locked = false;
          }
        } else {
          const moveLeft = Math.abs(diffX);
          targetParam = moveLeft < 40 ? -1 : (moveLeft < 100 ? 0 : 1);
          targetParam3 = -1;
          if (targetParam === -1) {
              isParamLocked = false;
          }
        }
      }
    } else if (swipeAxis === 'y') {
      // 🌟 嚴格十字鎖定
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
    // 核心防白畫面
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

    // 安全讀取 PIXI 常數
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
    createInvisibleHitbox(); // 🎯 建立隱形判定圖層

    window.model = model;
    app.stage.addChild(model);
    model.internalModel.eyeBlink = null;

    setupPiP(); // 🔍 建立特寫畫中畫
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
