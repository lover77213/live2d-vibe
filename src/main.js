// 透過 jsdelivr +esm 完美解決 404 與 CORS 問題
import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@7.2.4/+esm';
import { Live2DModel } from 'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.5.0-beta.7/+esm';

// 將 PIXI 暴露給全域，以防萬一底層需要
window.PIXI = PIXI;

async function init() {
    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundAlpha: 0,
        resizeTo: window
    });

    // 直接呼叫 Live2DModel，徹底避開 PIXI.live2d undefined 的問題
    const model = await Live2DModel.from("public/model/model.model3.json");
    app.stage.addChild(model);
    
    model.x = 0;
    model.y = 0;
}

init();
