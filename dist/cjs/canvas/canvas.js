"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
// import '@babel/polyfill';
require("promise-polyfill");
var buffers_1 = tslib_1.__importDefault(require("../buffers/buffers"));
var context_1 = tslib_1.__importStar(require("../context/context"));
var common_1 = tslib_1.__importDefault(require("../core/common"));
var logger_1 = tslib_1.__importDefault(require("../logger/logger"));
var vector2_1 = tslib_1.__importDefault(require("../math/vector2"));
var renderer_1 = tslib_1.__importDefault(require("../renderer/renderer"));
var textures_1 = tslib_1.__importStar(require("../textures/textures"));
var uniforms_1 = tslib_1.__importStar(require("../uniforms/uniforms"));
var Canvas = /** @class */ (function (_super) {
    tslib_1.__extends(Canvas, _super);
    function Canvas(canvas, options) {
        if (options === void 0) { options = {
        // alpha: true,
        // antialias: true,
        // premultipliedAlpha: true
        }; }
        var _this = _super.call(this) || this;
        _this.valid = false;
        _this.visible = false;
        _this.controls = false;
        if (!canvas) {
            return _this;
        }
        _this.options = options;
        _this.canvas = canvas;
        _this.width = 0;
        _this.height = 0;
        _this.rect = canvas.getBoundingClientRect();
        _this.devicePixelRatio = window.devicePixelRatio || 1;
        _this.mode = options.mode || context_1.ContextMode.Flat;
        _this.mesh = options.mesh || undefined;
        _this.doubleSided = options.doubleSided || false;
        _this.defaultMesh = _this.mesh;
        _this.workpath = options.workpath;
        canvas.style.backgroundColor = options.backgroundColor || 'rgba(0,0,0,0)';
        _this.getShaders_().then(function (success) {
            _this.load().then(function (success) {
                if (!_this.program) {
                    return;
                }
                _this.addListeners_();
                _this.onLoop();
            });
        }, function (error) {
            logger_1.default.error('GlslCanvas.getShaders_.error', error);
        });
        Canvas.items.push(_this);
        return _this;
    }
    Canvas.of = function (canvas, options) {
        return Canvas.items.find(function (x) { return x.canvas === canvas; }) || new Canvas(canvas, options);
    };
    Canvas.loadAll = function () {
        var canvases = [].slice.call(document.getElementsByClassName('glsl-canvas')).filter(function (x) { return x instanceof HTMLCanvasElement; });
        return canvases.map(function (x) { return Canvas.of(x); });
    };
    Canvas.prototype.getShaders_ = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.vertexString = _this.options.vertexString || _this.vertexString;
            _this.fragmentString = _this.options.fragmentString || _this.fragmentString;
            var canvas = _this.canvas;
            var urls = {};
            if (canvas.hasAttribute('data-vertex-url')) {
                urls.vertex = canvas.getAttribute('data-vertex-url');
            }
            if (canvas.hasAttribute('data-fragment-url')) {
                urls.fragment = canvas.getAttribute('data-fragment-url');
            }
            if (canvas.hasAttribute('data-vertex')) {
                _this.vertexString = canvas.getAttribute('data-vertex');
            }
            if (canvas.hasAttribute('data-fragment')) {
                _this.fragmentString = canvas.getAttribute('data-fragment');
            }
            if (Object.keys(urls).length) {
                Promise.all(Object.keys(urls).map(function (key, i) {
                    var url = urls[key];
                    return common_1.default.fetch(url)
                        // .then((response) => response.text())
                        .then(function (body) {
                        if (key === 'vertex') {
                            return _this.vertexString = body;
                        }
                        else {
                            return _this.fragmentString = body;
                        }
                    });
                })).then(function (shaders) {
                    resolve([_this.vertexString, _this.fragmentString]);
                });
            }
            else {
                resolve([_this.vertexString, _this.fragmentString]);
            }
        });
    };
    Canvas.prototype.addListeners_ = function () {
        /*
        const resize = (e: Event) => {
            this.rect = this.canvas.getBoundingClientRect();
            this.trigger('resize', e);
        };
        */
        this.onScroll = this.onScroll.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onMove = this.onMove.bind(this);
        this.onMousedown = this.onMousedown.bind(this);
        this.onMousemove = this.onMousemove.bind(this);
        this.onMouseover = this.onMouseover.bind(this);
        this.onMouseout = this.onMouseout.bind(this);
        this.onMouseup = this.onMouseup.bind(this);
        this.onTouchmove = this.onTouchmove.bind(this);
        this.onTouchend = this.onTouchend.bind(this);
        this.onTouchstart = this.onTouchstart.bind(this);
        this.onLoop = this.onLoop.bind(this);
        // window.addEventListener('resize', this.onResize);
        window.addEventListener('scroll', this.onScroll);
        document.addEventListener('mousemove', this.onMousemove, false);
        document.addEventListener('touchmove', this.onTouchmove);
        this.addCanvasListeners_();
    };
    Canvas.prototype.addCanvasListeners_ = function () {
        this.controls = this.canvas.hasAttribute('controls');
        this.canvas.addEventListener('wheel', this.onWheel);
        this.canvas.addEventListener('click', this.onClick);
        this.canvas.addEventListener('mousedown', this.onMousedown);
        this.canvas.addEventListener('touchstart', this.onTouchstart);
        if (this.controls) {
            this.canvas.addEventListener('mouseover', this.onMouseover);
            this.canvas.addEventListener('mouseout', this.onMouseout);
            if (!this.canvas.hasAttribute('data-autoplay')) {
                this.pause();
            }
        }
    };
    Canvas.prototype.removeCanvasListeners_ = function () {
        this.canvas.removeEventListener('wheel', this.onWheel);
        this.canvas.removeEventListener('click', this.onClick);
        this.canvas.removeEventListener('mousedown', this.onMousedown);
        this.canvas.removeEventListener('mouseup', this.onMouseup);
        this.canvas.removeEventListener('touchstart', this.onTouchstart);
        this.canvas.removeEventListener('touchend', this.onTouchend);
        if (this.controls) {
            this.canvas.removeEventListener('mouseover', this.onMouseover);
            this.canvas.removeEventListener('mouseout', this.onMouseout);
        }
    };
    Canvas.prototype.removeListeners_ = function () {
        window.cancelAnimationFrame(this.rafId);
        // window.removeEventListener('resize', this.onResize);
        window.removeEventListener('scroll', this.onScroll);
        document.removeEventListener('mousemove', this.onMousemove);
        document.removeEventListener('touchmove', this.onTouchmove);
        this.removeCanvasListeners_();
    };
    Canvas.prototype.onScroll = function (e) {
        this.rect = this.canvas.getBoundingClientRect();
    };
    Canvas.prototype.onWheel = function (e) {
        this.camera.wheel(e.deltaY);
        this.trigger('wheel', e);
    };
    Canvas.prototype.onClick = function (e) {
        if (this.controls) {
            this.toggle();
        }
        this.trigger('click', e);
    };
    Canvas.prototype.onDown = function (mx, my) {
        mx *= this.devicePixelRatio;
        my *= this.devicePixelRatio;
        this.mouse.x = mx;
        this.mouse.y = my;
        var rect = this.rect;
        var min = Math.min(rect.width, rect.height);
        this.camera.down(mx / min, my / min);
        this.trigger('down', this.mouse);
    };
    Canvas.prototype.onMove = function (mx, my) {
        var rect = this.rect;
        var x = (mx - rect.left) * this.devicePixelRatio;
        var y = (rect.height - (my - rect.top)) * this.devicePixelRatio;
        if (x !== this.mouse.x ||
            y !== this.mouse.y) {
            this.mouse.x = x;
            this.mouse.y = y;
            var min = Math.min(rect.width, rect.height);
            this.camera.move(mx / min, my / min);
            this.trigger('move', this.mouse);
        }
    };
    Canvas.prototype.onUp = function (e) {
        this.camera.up();
        if (this.controls) {
            this.pause();
        }
        this.trigger('out', e);
    };
    Canvas.prototype.onMousedown = function (e) {
        this.onDown(e.clientX || e.pageX, e.clientY || e.pageY);
        document.addEventListener('mouseup', this.onMouseup);
        document.removeEventListener('touchstart', this.onTouchstart);
        document.removeEventListener('touchmove', this.onTouchmove);
    };
    Canvas.prototype.onMousemove = function (e) {
        this.onMove(e.clientX || e.pageX, e.clientY || e.pageY);
    };
    Canvas.prototype.onMouseup = function (e) {
        this.onUp(e);
    };
    Canvas.prototype.onMouseover = function (e) {
        this.play();
        this.trigger('over', e);
    };
    Canvas.prototype.onMouseout = function (e) {
        this.pause();
        this.trigger('out', e);
    };
    Canvas.prototype.onTouchmove = function (e) {
        var touch = [].slice.call(e.touches).reduce(function (p, touch) {
            p = p || new vector2_1.default();
            p.x += touch.clientX;
            p.y += touch.clientY;
            return p;
        }, null);
        if (touch) {
            this.onMove(touch.x / e.touches.length, touch.y / e.touches.length);
        }
    };
    Canvas.prototype.onTouchend = function (e) {
        this.onUp(e);
        document.removeEventListener('touchend', this.onTouchend);
    };
    Canvas.prototype.onTouchstart = function (e) {
        var touch = [].slice.call(e.touches).reduce(function (p, touch) {
            p = p || new vector2_1.default();
            p.x += touch.clientX;
            p.y += touch.clientY;
            return p;
        }, null);
        if (touch) {
            this.onDown(touch.x / e.touches.length, touch.y / e.touches.length);
        }
        if (this.controls) {
            this.play();
        }
        this.trigger('over', e);
        document.addEventListener('touchend', this.onTouchend);
        document.removeEventListener('mousedown', this.onMousedown);
        document.removeEventListener('mousemove', this.onMousemove);
        if (this.controls) {
            this.canvas.removeEventListener('mouseover', this.onMouseover);
            this.canvas.removeEventListener('mouseout', this.onMouseout);
        }
    };
    Canvas.prototype.onLoop = function (time) {
        this.checkRender();
        this.rafId = window.requestAnimationFrame(this.onLoop);
    };
    Canvas.prototype.setUniform_ = function (key, values, options, type) {
        var _this = this;
        if (options === void 0) { options = {}; }
        if (type === void 0) { type = null; }
        var uniform = uniforms_1.default.parseUniform(key, values, type);
        if (Array.isArray(uniform)) {
            if (uniforms_1.default.isArrayOfSampler2D(uniform)) {
                uniform.forEach(function (x) { return _this.loadTexture(x.key, x.values[0], options); });
            }
            else {
                uniform.forEach(function (x) { return _this.uniforms.set(x.key, x.values[0]); });
            }
        }
        else if (uniform) {
            switch (uniform.type) {
                case uniforms_1.UniformType.Sampler2D:
                    this.loadTexture(key, values[0], options);
                    break;
                default:
                    this.uniforms.set(key, uniform);
            }
        }
    };
    Canvas.prototype.isVisible_ = function () {
        var rect = this.rect;
        return (rect.top + rect.height) > 0 && rect.top < (window.innerHeight || document.documentElement.clientHeight);
    };
    Canvas.prototype.isAnimated_ = function () {
        return (this.animated || this.textures.animated) && !this.timer.paused;
    };
    Canvas.prototype.isDirty_ = function () {
        return this.dirty || this.uniforms.dirty || this.textures.dirty;
    };
    // check size change at start of requestFrame
    Canvas.prototype.sizeDidChanged_ = function () {
        var gl = this.gl;
        var CW = Math.ceil(this.canvas.clientWidth), CH = Math.ceil(this.canvas.clientHeight);
        if (this.width !== CW ||
            this.height !== CH) {
            this.width = CW;
            this.height = CH;
            // Lookup the size the browser is displaying the canvas in CSS pixels
            // and compute a size needed to make our drawingbuffer match it in
            // device pixels.
            var W = Math.ceil(CW * this.devicePixelRatio);
            var H = Math.ceil(CH * this.devicePixelRatio);
            this.W = W;
            this.H = H;
            this.canvas.width = W;
            this.canvas.height = H;
            /*
            if (gl.canvas.width !== W ||
                gl.canvas.height !== H) {
                gl.canvas.width = W;
                gl.canvas.height = H;
                // Set the viewport to match
                // gl.viewport(0, 0, W, H);
            }
            */
            for (var key in this.buffers.values) {
                var buffer = this.buffers.values[key];
                buffer.resize(gl, W, H);
            }
            this.rect = this.canvas.getBoundingClientRect();
            this.trigger('resize');
            // gl.useProgram(this.program);
            return true;
        }
        else {
            return false;
        }
    };
    Canvas.prototype.parseTextures_ = function (fragmentString) {
        var _this = this;
        // const regexp = /uniform\s*sampler2D\s*([\w]*);(\s*\/\/\s*([\w|\:\/\/|\.|\-|\_]*)|\s*)/gm;
        var regexp = /uniform\s*sampler2D\s*([\w]*);(\s*\/\/\s*([\w|\:\/\/|\.|\-|\_|\?|\&|\=]*)|\s*)/gm;
        // const regexp = /uniform\s*sampler2D\s*([\w]*);(\s*\/\/\s*([\w|\://|\.|\-|\_]*)|\s*)((\s*\:\s)(\{(\s*\w*\:\s*['|"]{0,1}\w*['|"]{0,1}\s*[,]{0,1})+\}))*/gm;
        var matches;
        while ((matches = regexp.exec(fragmentString)) !== null) {
            var key = matches[1];
            var url = matches[3];
            if (textures_1.Texture.isTextureUrl(url)) {
                this.textureList.push({ key: key, url: url });
                /*
                if (matches[3]) {
                    const ext = matches[3].split('?')[0].split('.').pop().toLowerCase();
                    const url = matches[3];
                    if (url && TextureExtensions.indexOf(ext) !== -1) {
                        // let options;
                        // if (matches[6]) {
                        // 	try {
                        // 		options = new Function(`return ${matches[6]};`)();
                        // 	} catch (e) {
                        // 		// console.log('wrong texture options');
                        // 	}
                        // }
                        // console.log(options, matches[6]);
                        // this.textureList.push({ key, url, options });
                        this.textureList.push({ key, url });
                    }
                */
            }
            else if (!this.buffers.has(key)) {
                // create empty texture
                this.textureList.push({ key: key, url: null });
            }
        }
        if (this.canvas.hasAttribute('data-textures')) {
            var urls = this.canvas.getAttribute('data-textures').split(',');
            urls.forEach(function (url, i) {
                var key = 'u_texture' + i;
                _this.textureList.push({ key: key, url: url });
            });
        }
        return this.textureList.length > 0;
    };
    Canvas.prototype.load = function (fragmentString, vertexString) {
        var _this = this;
        var fragmentVertexString = context_1.default.getFragmentVertex(this.gl, fragmentString || this.fragmentString);
        return Promise.all([
            context_1.default.getIncludes(fragmentString || this.fragmentString),
            context_1.default.getIncludes(fragmentVertexString || vertexString || this.vertexString)
        ]).then(function (array) {
            _this.fragmentString = array[0];
            _this.vertexString = array[1];
            return _this.createContext_();
        });
    };
    Canvas.prototype.getContext_ = function () {
        var vertexString = this.vertexString;
        var fragmentString = this.fragmentString;
        this.vertexString = context_1.default.getVertex(vertexString, fragmentString, this.mode);
        this.fragmentString = context_1.default.getFragment(vertexString, fragmentString, this.mode);
        if (context_1.default.versionDiffers(this.gl, vertexString, fragmentString)) {
            this.destroyContext_();
            this.swapCanvas_();
            this.uniforms = new uniforms_1.default();
            this.buffers = new buffers_1.default();
            this.textures = new textures_1.default();
            this.textureList = [];
        }
        if (!this.gl) {
            var gl = context_1.default.tryInferContext(vertexString, fragmentString, this.canvas, this.options, this.options.extensions, this.options.onError);
            if (!gl) {
                return null;
            }
            this.gl = gl;
        }
        return this.gl;
    };
    Canvas.prototype.createContext_ = function () {
        var gl = this.getContext_();
        if (!gl) {
            return false;
        }
        var vertexShader, fragmentShader;
        try {
            context_1.default.inferPrecision(this.fragmentString);
            vertexShader = context_1.default.createShader(gl, this.vertexString, gl.VERTEX_SHADER);
            fragmentShader = context_1.default.createShader(gl, this.fragmentString, gl.FRAGMENT_SHADER);
            // If Fragment shader fails load a empty one to sign the error
            if (!fragmentShader) {
                var defaultFragment = context_1.default.getFragment(null, null, this.mode);
                fragmentShader = context_1.default.createShader(gl, defaultFragment, gl.FRAGMENT_SHADER);
                this.valid = false;
            }
            else {
                this.valid = true;
            }
        }
        catch (e) {
            // !!!
            // console.error(e);
            this.trigger('error', e);
            return false;
        }
        // Create and use program
        var program = context_1.default.createProgram(gl, [vertexShader, fragmentShader]); //, [0,1],['a_texcoord','a_position']);
        if (!program) {
            this.trigger('error', context_1.default.lastError);
            return false;
        }
        // console.log(this.vertexString, this.fragmentString, program);
        // Delete shaders
        // gl.detachShader(program, vertexShader);
        // gl.detachShader(program, fragmentShader);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        this.program = program;
        if (this.valid) {
            try {
                this.buffers = buffers_1.default.getBuffers(gl, this.fragmentString, context_1.default.getBufferVertex(gl));
            }
            catch (e) {
                // console.error('load', e);
                this.valid = false;
                this.trigger('error', e);
                return false;
            }
            this.create_();
            if (this.animated) {
                this.canvas.classList.add('animated');
            }
            else {
                this.canvas.classList.remove('animated');
            }
        }
        // Trigger event
        this.trigger('load', this);
        return this.valid;
    };
    Canvas.prototype.create_ = function () {
        this.parseMode_();
        this.parseMesh_();
        _super.prototype.create_.call(this);
        this.createBuffers_();
        this.createTextures_();
    };
    Canvas.prototype.parseMode_ = function () {
        if (this.canvas.hasAttribute('data-mode')) {
            var data = this.canvas.getAttribute('data-mode');
            if (['flat', 'box', 'sphere', 'torus', 'mesh'].indexOf(data) !== -1) {
                this.mode = data;
            }
        }
    };
    Canvas.prototype.parseMesh_ = function () {
        if (this.canvas.hasAttribute('data-mesh')) {
            var data = this.canvas.getAttribute('data-mesh');
            if (data.indexOf('.obj') !== -1) {
                this.mesh = this.defaultMesh = data;
            }
        }
    };
    Canvas.prototype.createBuffers_ = function () {
        for (var key in this.buffers.values) {
            var buffer = this.buffers.values[key];
            this.uniforms.create(uniforms_1.UniformMethod.Uniform1i, uniforms_1.UniformType.Sampler2D, buffer.key, [buffer.input.index]);
        }
    };
    Canvas.prototype.createTextures_ = function () {
        var _this = this;
        var hasTextures = this.parseTextures_(this.fragmentString);
        if (hasTextures) {
            this.textureList.filter(function (x) { return x.url; }).forEach(function (x) {
                _this.setTexture(x.key, x.url, x.options);
            });
            this.textureList = [];
        }
    };
    Canvas.prototype.update_ = function () {
        _super.prototype.update_.call(this);
        this.updateBuffers_();
        this.updateTextures_();
    };
    Canvas.prototype.updateBuffers_ = function () {
        for (var key in this.buffers.values) {
            var buffer = this.buffers.values[key];
            this.uniforms.update(uniforms_1.UniformMethod.Uniform1i, uniforms_1.UniformType.Sampler2D, buffer.key, [buffer.input.index]);
        }
    };
    Canvas.prototype.updateTextures_ = function () {
        var gl = this.gl;
        for (var key in this.textures.values) {
            var texture = this.textures.values[key];
            texture.tryUpdate(gl);
            this.uniforms.update(uniforms_1.UniformMethod.Uniform1i, uniforms_1.UniformType.Sampler2D, texture.key, [texture.index]);
        }
    };
    Canvas.prototype.destroyContext_ = function () {
        var gl = this.gl;
        gl.useProgram(null);
        if (this.program) {
            gl.deleteProgram(this.program);
        }
        for (var key in this.buffers.values) {
            var buffer = this.buffers.values[key];
            buffer.destroy(gl);
        }
        for (var key in this.textures.values) {
            var texture = this.textures.values[key];
            texture.destroy(gl);
        }
        this.buffers = null;
        this.textures = null;
        this.uniforms = null;
        this.program = null;
        this.gl = null;
    };
    Canvas.prototype.swapCanvas_ = function () {
        var canvas = this.canvas;
        var canvas_ = canvas.cloneNode();
        canvas.parentNode.replaceChild(canvas_, canvas);
        this.canvas = canvas_;
        this.addCanvasListeners_();
    };
    Canvas.prototype.destroy = function () {
        this.removeListeners_();
        this.destroyContext_();
        this.animated = false;
        this.valid = false;
        Canvas.items.splice(Canvas.items.indexOf(this), 1);
    };
    Canvas.prototype.loadTexture = function (key, urlElementOrData, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        if (this.valid) {
            // Logger.log('GlslCanvas.loadTexture', key, urlElementOrData);
            this.textures.createOrUpdate(this.gl, key, urlElementOrData, this.buffers.count, options, this.options.workpath).then(function (texture) {
                var index = texture.index;
                var uniform = _this.uniforms.createTexture(key, index);
                uniform.texture = texture;
                var keyResolution = key.indexOf('[') !== -1 ? key.replace('[', 'Resolution[') : key + 'Resolution';
                // const uniformResolution = ;
                _this.uniforms.create(uniforms_1.UniformMethod.Uniform2f, uniforms_1.UniformType.Float, keyResolution, [texture.width, texture.height]);
                // Logger.log('loadTexture', key, url, index, texture.width, texture.height);
                return texture;
            }, function (error) {
                var message = Array.isArray(error.path) ? error.path.map(function (x) { return x.error ? x.error.message : ''; }).join(', ') : error.message;
                logger_1.default.error('GlslCanvas.loadTexture.error', key, urlElementOrData, message);
                _this.trigger('textureError', { key: key, urlElementOrData: urlElementOrData, message: message });
            });
        }
        else {
            this.textureList.push({ key: key, url: urlElementOrData, options: options });
        }
    };
    Canvas.prototype.setTexture = function (key, urlElementOrData, options) {
        if (options === void 0) { options = {}; }
        return this.setUniform_(key, [urlElementOrData], options);
    };
    Canvas.prototype.setUniform = function (key) {
        var values = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            values[_i - 1] = arguments[_i];
        }
        return this.setUniform_(key, values);
    };
    Canvas.prototype.setUniformOfInt = function (key, values) {
        return this.setUniform_(key, values, null, uniforms_1.UniformType.Int);
    };
    Canvas.prototype.setUniforms = function (values) {
        for (var key in values) {
            this.setUniform(key, values[key]);
        }
    };
    Canvas.prototype.pause = function () {
        if (this.valid) {
            this.timer.pause();
            this.canvas.classList.add('paused');
            this.trigger('pause');
        }
    };
    Canvas.prototype.play = function () {
        if (this.valid) {
            this.timer.play();
            this.canvas.classList.remove('paused');
            this.trigger('play');
        }
    };
    Canvas.prototype.toggle = function () {
        if (this.valid) {
            if (this.timer.paused) {
                this.play();
            }
            else {
                this.pause();
            }
        }
    };
    Canvas.prototype.checkRender = function () {
        if (this.isVisible_() && (this.sizeDidChanged_() || this.isDirty_() || this.isAnimated_())) {
            this.render();
            this.canvas.classList.add('playing');
        }
        else {
            this.canvas.classList.remove('playing');
        }
    };
    Canvas.logger = logger_1.default;
    Canvas.items = [];
    return Canvas;
}(renderer_1.default));
exports.default = Canvas;
if (document) {
    document.addEventListener("DOMContentLoaded", function () {
        Canvas.loadAll();
    });
}
