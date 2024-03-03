function getDefaultExportFromCjs(x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}

function createCommonjsModule(fn, basedir, module) {
    return module = {
        path: basedir,
        exports: {},
        require: function(path, base) {
            return commonjsRequire(path, base === void 0 || base === null ? module.path : base);
        }
    }, fn(module, module.exports), module.exports;
}

function commonjsRequire() {
    throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs");
}
var letter = createCommonjsModule(function(module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LETTER_ERRORS = exports.That3DLetter = void 0;
    var LETTER_ERRORS;
    (function(LETTER_ERRORS2) {
        LETTER_ERRORS2["characterLength"] = "letterString should have a length of 1";
    })(LETTER_ERRORS || (LETTER_ERRORS = {}));
    exports.LETTER_ERRORS = LETTER_ERRORS;
    class That3DLetter {
        constructor(letterString, count, container, index) {
            this.mainElement = null;
            this.elements = [];
            this.container = container;
            this.character = letterString;
            this.index = index;
            if (this.character.length !== 1)
                throw new Error(LETTER_ERRORS.characterLength);
            this.createLayers(count);
        }
        createLayers(count) {
            for (let i = 0; i < count; i++) {
                const layer = i;
                const span = document.createElement("span");
                span.setAttribute("aria-hidden", "true");
                span.classList.add("that-3d-letter");
                span.classList.add(i === 0 ? "front" : "under");
                if (i === count - 1)
                    span.classList.add("back");
                span.innerHTML = this.character === " " ? "&nbsp;" : this.character;
                span.dataset.depth = layer.toString();
                span.dataset.index = this.index.toString();
                span.dataset.character = this.character;
                for (let j = 2; j < 9; j++) {
                    if (i % j === 0)
                        span.dataset[`mod-${j}`] = "true";
                }
                span.style.setProperty("--layer", (count - layer).toString());
                span.style.setProperty("--index", this.index.toString());
                span.style.setProperty("--centerOffset", ((layer - (count - 1) * 0.5) / ((count - 1) * 0.5)).toString());
                this.elements.push(span);
                if (i === 0) {
                    this.mainElement = span;
                }
                this.container.appendChild(span);
            }
        }
        resize() {
            if (this.mainElement) {
                const x = this.mainElement.offsetLeft;
                const y = this.mainElement.offsetTop;
                this.elements.forEach((span) => {
                    span.style.setProperty("--xPos", x.toString());
                    span.style.setProperty("--yPos", y.toString());
                });
            }
        }
    }
    exports.That3DLetter = That3DLetter;
});
var word = createCommonjsModule(function(module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.That3DWord = void 0;
    class That3DWord2 {
        constructor(element, layers) {
            this.wordString = "";
            this.letters = [];
            this.layers = 8;
            this.element = element;
            const style = getComputedStyle(this.element);
            if (layers) {
                this.layers = layers;
            } else if (this.element.dataset.layers) {
                const newLayersValue = Number(this.element.dataset.layers);
                if (!isNaN(newLayersValue))
                    this.layers = newLayersValue;
            } else {
                const customPropLayers = style.getPropertyValue("--layers");
                if (customPropLayers)
                    this.layers = Number(customPropLayers);
            }
            this.element.style.setProperty("--layers", this.layers.toString());
            if (navigator && navigator.vendor.startsWith("Apple"))
                this.element.classList.add("safari");
            this.init();
        }
        init() {
            this.wordString = this.element.innerHTML;
            this.element.innerHTML = "";
            this.element.setAttribute("aria-label", this.wordString);
            this.element.classList.add("that-3d-word");
            const letterStrings = this.wordString.split("");
            this.letters = letterStrings.map((letter$1, i) => new letter.That3DLetter(letter$1, this.layers, this.element, i));
            this.resize();
            setTimeout(() => {
                this.resize();
                this.element.setAttribute("data-text-ready", "true");
            }, 100);
        }
        reset() {
            this.init();
        }
        resize() {
            this.element.style.setProperty("--width", this.element.clientWidth.toString());
            this.element.style.setProperty("--height", this.element.clientHeight.toString());
            this.letters.forEach((letter2) => letter2.resize());
        }
        get word() {
            return this.wordString;
        }
    }
    exports.That3DWord = That3DWord2;
});
var texts = createCommonjsModule(function(module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Those3DTexts = void 0;
    class Those3DTexts2 {
        constructor(selector = "[data-3d-text]") {
            this.words = [];
            const elements = [...document.querySelectorAll(selector)];
            this.words = elements.filter((element) => element ? true : false).map((element) => new word.That3DWord(element));
            if (window) {
                window.addEventListener("resize", () => this.onResize());
            }
        }
        onResize() {
            this.words.forEach((word2) => word2.resize());
        }
    }
    exports.Those3DTexts = Those3DTexts2;
});
var lib = createCommonjsModule(function(module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.That3DWord = exports.Those3DTexts = void 0;
    Object.defineProperty(exports, "That3DWord", {
        enumerable: true,
        get: function() {
            return word.That3DWord;
        }
    });
    Object.defineProperty(exports, "Those3DTexts", {
        enumerable: true,
        get: function() {
            return texts.Those3DTexts;
        }
    });
});
var __pika_web_default_export_for_treeshaking__ = /* @__PURE__ */ getDefaultExportFromCjs(lib);
var That3DWord = lib.That3DWord;
var Those3DTexts = lib.Those3DTexts;
export default __pika_web_default_export_for_treeshaking__;
export { That3DWord, Those3DTexts, lib as __moduleExports };