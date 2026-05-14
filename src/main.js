import * as PIXI from "https://esm.sh/pixi.js@7";
import { Live2DModel } from "https://esm.sh/pixi-live2d-display@0.5.0-beta.7";

async function init() {
    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundAlpha: 0,
        resizeTo: window
    });

    // 指向你貼圖與模型所在的正確資料夾
    const model = await Live2DModel.from("public/model/精細模型.model3.json");
    app.stage.addChild(model);
    
    model.x = 0;
    model.y = 0;
}

init();
