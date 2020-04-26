import { mat4 } from 'gl-matrix';
import Buffers from '../buffers/buffers';
import OrbitCamera from '../camera/orbit-camera';
import CanvasTimer from '../canvas/canvas-timer';
import { ContextMode } from '../context/context';
import Subscriber from '../core/subscriber';
import BoxGeometry from '../geometry/box-geometry';
import FlatGeometry from '../geometry/flat-geometry';
import SphereGeometry from '../geometry/sphere-geometry';
import TorusGeometry from '../geometry/torus-geometry';
import ObjLoader from '../loaders/obj-loader';
import Logger from '../logger/logger';
import Vector2 from '../math/vector2';
import Textures from '../textures/textures';
import Uniforms, { UniformMethod, UniformType } from '../uniforms/uniforms';
export default class Renderer extends Subscriber {
    constructor() {
        super();
        this.uniforms = new Uniforms();
        this.buffers = new Buffers();
        this.textures = new Textures();
        this.textureList = [];
        this.W = 0;
        this.H = 0;
        this.mouse = new Vector2();
        this.radians = 0;
        this.dirty = true;
        this.animated = false;
        this.camera = new OrbitCamera();
        this.cache = {};
        this.drawFunc_ = this.drawArrays_;
    }
    render() {
        const gl = this.gl;
        if (!gl) {
            return;
        }
        const BW = gl.drawingBufferWidth;
        const BH = gl.drawingBufferHeight;
        this.update_();
        gl.viewport(0, 0, BW, BH);
        for (const key in this.buffers.values) {
            const buffer = this.buffers.values[key];
            buffer.geometry.attachAttributes_(gl, buffer.program);
            // this.uniforms.get('u_resolution').values = [1024, 1024];
            this.uniforms.apply(gl, buffer.program);
            /*
            console.log('uniforms');
            for (const key in this.uniforms.values) {
                if (key.indexOf('u_buff') === 0) {
                    console.log(key);
                }
            }
            */
            buffer.render(gl, BW, BH);
        }
        // this.uniforms.get('u_resolution').values = [BW, BH];
        this.geometry.attachAttributes_(gl, this.program);
        this.uniforms.apply(gl, this.program);
        // gl.viewport(0, 0, BW, BH);
        this.drawFunc_(this.timer.delta);
        this.uniforms.clean();
        this.textures.clean();
        this.dirty = false;
        this.trigger('render', this);
    }
    drawArrays_(deltaTime) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // Clear
        gl.viewport(0, 0, this.W, this.H);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        // Clear the canvas before we start drawing on it.
        // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE);
        if (this.doubleSided && this.mode !== ContextMode.Flat) {
            // back
            // gl.frontFace(gl.CW);
            gl.cullFace(gl.FRONT);
            gl.drawArrays(gl.TRIANGLES, 0, this.geometry.size);
            // front
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        // gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);
        gl.drawArrays(gl.TRIANGLES, 0, this.geometry.size);
        // gl.drawElements(gl.TRIANGLES, this.geometry.size, gl.UNSIGNED_SHORT, 0);
    }
    create_() {
        this.createGeometry_();
        this.createUniforms_();
    }
    createGeometry_() {
        // console.log('Geometry', Geometry);
        // console.log('FlatGeometry', FlatGeometry);
        // console.log('BoxGeometry', BoxGeometry);
        this.parseGeometry_();
        this.setMode(this.mode);
    }
    parseGeometry_() {
        const regexp = /^attribute\s+vec4\s+a_position\s*;\s*\/\/\s*([\w|\:\/\/|\.|\-|\_|\?|\&|\=]+)/gm;
        const match = regexp.exec(this.vertexString);
        if (match && match.length > 1) {
            this.mesh = match[1];
        }
        else {
            this.mesh = this.defaultMesh;
        }
    }
    createUniforms_() {
        const gl = this.gl;
        const fragmentString = this.fragmentString;
        const BW = gl.drawingBufferWidth;
        const BH = gl.drawingBufferHeight;
        const timer = this.timer = new CanvasTimer();
        const hasDelta = (fragmentString.match(/u_delta/g) || []).length > 1;
        const hasTime = (fragmentString.match(/u_time/g) || []).length > 1;
        const hasDate = (fragmentString.match(/u_date/g) || []).length > 1;
        const hasMouse = (fragmentString.match(/u_mouse/g) || []).length > 1;
        this.animated = hasTime || hasDate || hasMouse;
        this.uniforms.create(UniformMethod.Uniform2f, UniformType.Float, 'u_resolution', [BW, BH]);
        if (hasDelta) {
            this.uniforms.create(UniformMethod.Uniform1f, UniformType.Float, 'u_delta', [timer.delta / 1000.0]);
        }
        if (hasTime) {
            this.uniforms.create(UniformMethod.Uniform1f, UniformType.Float, 'u_time', [timer.current / 1000.0]);
        }
        if (hasDate) {
            const date = new Date();
            this.uniforms.create(UniformMethod.Uniform4f, UniformType.Float, 'u_date', [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() * 0.001]);
        }
        if (hasMouse) {
            this.uniforms.create(UniformMethod.Uniform2f, UniformType.Float, 'u_mouse', [0, 0]);
        }
        // if (this.mode !== ContextMode.Flat) {
        this.projectionMatrix = mat4.create();
        this.uniforms.create(UniformMethod.UniformMatrix4fv, UniformType.Float, 'u_projectionMatrix', this.projectionMatrix);
        this.modelViewMatrix = mat4.create();
        this.uniforms.create(UniformMethod.UniformMatrix4fv, UniformType.Float, 'u_modelViewMatrix', this.modelViewMatrix);
        this.normalMatrix = mat4.create();
        this.uniforms.create(UniformMethod.UniformMatrix4fv, UniformType.Float, 'u_normalMatrix', this.normalMatrix);
        // }
    }
    update_() {
        this.updateUniforms_();
    }
    updateUniforms_() {
        const gl = this.gl;
        const BW = gl.drawingBufferWidth;
        const BH = gl.drawingBufferHeight;
        if (!this.timer) {
            return;
        }
        const timer = this.timer.next();
        this.uniforms.update(UniformMethod.Uniform2f, UniformType.Float, 'u_resolution', [BW, BH]);
        if (this.uniforms.has('u_delta')) {
            this.uniforms.update(UniformMethod.Uniform1f, UniformType.Float, 'u_delta', [timer.delta / 1000.0]);
        }
        if (this.uniforms.has('u_time')) {
            this.uniforms.update(UniformMethod.Uniform1f, UniformType.Float, 'u_time', [timer.current / 1000.0]);
        }
        if (this.uniforms.has('u_date')) {
            const date = new Date();
            this.uniforms.update(UniformMethod.Uniform4f, UniformType.Float, 'u_date', [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() * 0.001]);
        }
        if (this.uniforms.has('u_mouse')) {
            const mouse = this.mouse;
            this.uniforms.update(UniformMethod.Uniform2f, UniformType.Float, 'u_mouse', [mouse.x, mouse.y]);
            /*
            const rect = this.rect;
            if (mouse.x >= rect.left && mouse.x <= rect.right &&
                mouse.y >= rect.top && mouse.y <= rect.bottom) {
                const MX = (mouse.x - rect.left) * this.devicePixelRatio;
                const MY = (this.canvas.height - (mouse.y - rect.top) * this.devicePixelRatio);
                this.uniforms.update(UniformMethod.Uniform2f, UniformType.Float, 'u_mouse', [MX, MY]);
            }
            */
        }
        if (this.mode !== ContextMode.Flat) {
            this.uniforms.update(UniformMethod.UniformMatrix4fv, UniformType.Float, 'u_projectionMatrix', this.updateProjectionMatrix_());
            this.uniforms.update(UniformMethod.UniformMatrix4fv, UniformType.Float, 'u_modelViewMatrix', this.updateModelViewMatrix_(this.timer.delta));
            this.uniforms.update(UniformMethod.UniformMatrix4fv, UniformType.Float, 'u_normalMatrix', this.updateNormalMatrix_(this.modelViewMatrix));
        }
    }
    updateProjectionMatrix_() {
        const gl = this.gl;
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        mat4.perspective(this.projectionMatrix, fieldOfView, aspect, zNear, zFar);
        return this.projectionMatrix;
    }
    updateModelViewMatrix_(deltaTime) {
        this.modelViewMatrix = mat4.identity(this.modelViewMatrix);
        mat4.translate(this.modelViewMatrix, this.modelViewMatrix, [0.0, 0.0, -this.camera.radius]); // amount to translate
        mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, this.camera.theta + this.radians, [0, 1, 0]); // axis to rotate around (Y)
        mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, this.camera.phi, [1, 0, 0]); // axis to rotate around (X)
        if (!this.camera.mouse) {
            this.camera.theta += (0 - this.camera.theta) / 20;
            this.camera.phi += (0 - this.camera.phi) / 20;
            this.radians += deltaTime * 0.0005;
        }
        return this.modelViewMatrix;
    }
    updateNormalMatrix_(modelViewMatrix) {
        // this.normalMatrix = mat4.create();
        this.normalMatrix = mat4.identity(this.normalMatrix);
        mat4.invert(this.normalMatrix, modelViewMatrix);
        mat4.transpose(this.normalMatrix, this.normalMatrix);
        return this.normalMatrix;
    }
    setMode(mode) {
        let geometry;
        if (mode === ContextMode.Mesh) {
            geometry = this.cache[this.mesh];
            if (geometry) {
                this.geometry = geometry;
                this.mode = ContextMode.Mesh;
                this.dirty = true;
                return;
            }
        }
        let loader;
        switch (mode) {
            case ContextMode.Flat:
                geometry = new FlatGeometry();
                this.uniforms.update(UniformMethod.UniformMatrix4fv, UniformType.Float, 'u_projectionMatrix', mat4.create());
                this.uniforms.update(UniformMethod.UniformMatrix4fv, UniformType.Float, 'u_modelViewMatrix', mat4.create());
                this.uniforms.update(UniformMethod.UniformMatrix4fv, UniformType.Float, 'u_normalMatrix', mat4.create());
                break;
            case ContextMode.Box:
                geometry = new BoxGeometry();
                break;
            case ContextMode.Sphere:
                geometry = new SphereGeometry();
                break;
            case ContextMode.Torus:
                geometry = new TorusGeometry();
                break;
            case ContextMode.Mesh:
                geometry = new FlatGeometry();
                if (this.mesh) {
                    loader = new ObjLoader();
                    loader.load(this.getResource(this.mesh)).then(geometry => {
                        geometry.createAttributes_(this.gl, this.program);
                        const cache = {};
                        cache[this.mesh] = geometry;
                        this.cache = cache;
                        this.geometry = geometry;
                        this.dirty = true;
                    }, error => {
                        Logger.warn('GlslCanvas', error);
                        this.mode = ContextMode.Flat;
                    });
                }
                else {
                    mode = ContextMode.Flat;
                }
                break;
        }
        geometry.create(this.gl, this.program);
        this.geometry = geometry;
        this.mode = mode;
        this.dirty = true;
    }
    setMesh(mesh) {
        this.mesh = mesh;
    }
    getResource(url) {
        return String((url.indexOf(':/') === -1 && this.workpath !== undefined) ? `${this.workpath}/${url}` : url);
    }
}
