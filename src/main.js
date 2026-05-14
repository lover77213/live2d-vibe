import * as PIXI from "https://esm.sh/pixi.js@7";
import { Live2DModel } from "https://esm.sh/pixi-live2d-display@0.5.0-beta.7";

async function init() {
    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundAlpha: 0,
        resizeTo: window
    });
    const model = await Live2DModel.from("精細模型.model3.json");
    app.stage.addChild(model);
    model.x = 0;
    model.y = 0;
}
init();