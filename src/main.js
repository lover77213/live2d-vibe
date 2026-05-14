import * as PIXI from 'https://esm.sh/pixi.js@7.2.4';
import { Live2DModel } from 'https://esm.sh/pixi-live2d-display@0.5.0-beta.7';

window.PIXI = PIXI;

async function init() {
    console.log("🚀 [1/3] PIXI 畫布初始化中...");
    
    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundColor: 0xcccccc, // 改成淺灰色背景，讓你確認畫布有出來
        resizeTo: window
    });

    console.log("⏳ [2/3] 正在讀取 Live2D 模型...");
    
    try {
        const model = await Live2DModel.from("public/model/model.model3.json");
        console.log("✅ [3/3] 模型讀取成功！準備顯示...", model);
        
        app.stage.addChild(model);
        
        // 【關鍵調整】強制把模型縮小並置中
        model.scale.set(0.15); // 縮小到 15% (如果不夠大之後可以改 0.3 或 0.5)
        model.x = window.innerWidth / 2 - (model.width / 2);
        model.y = window.innerHeight / 2 - (model.height / 2);
        
    } catch (err) {
        console.error("❌ 模型顯示失敗：", err);
    }
}

init();
