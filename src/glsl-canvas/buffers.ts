import Context from './context';
import IterableStringMap from './iterable';

export enum BufferFloatType {
    FLOAT = 0,
    HALF_FLOAT,
}

export class Buffer {

    static floatType: BufferFloatType = BufferFloatType.FLOAT;
    texture: WebGLTexture;
    buffer: WebGLFramebuffer;
    BW: number;
    BH: number;
    index: number;

    constructor(gl: WebGLRenderingContext, BW: number, BH: number, index: number) {
        const texture = this.getTexture(gl, BW, BH, index);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const buffer = gl.createFramebuffer();
        this.texture = texture;
        this.buffer = buffer;
        this.BW = BW;
        this.BH = BH;
        this.index = index;
    }

    getFloatType(gl: WebGLRenderingContext): number {
        let floatType: number;
        if (Buffer.floatType === BufferFloatType.FLOAT) {
            gl.getExtension('OES_texture_float');
            floatType = gl.FLOAT;
        } else {
            const extension = gl.getExtension('OES_texture_half_float');
            floatType = extension.HALF_FLOAT_OES;
        }
        return floatType;
    }

    getTexture(gl: WebGLRenderingContext, BW: number, BH: number, index: number): WebGLTexture {
        const floatType = this.getFloatType(gl);
        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, BW, BH, 0, gl.RGBA, floatType, null);
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            if (Buffer.floatType === BufferFloatType.FLOAT) {
                Buffer.floatType = BufferFloatType.HALF_FLOAT;
            } else {
                Buffer.floatType = BufferFloatType.FLOAT;
            }
            return this.getTexture(gl, BW, BH, index);
        }
        return texture;
    }

    resize(gl: WebGLRenderingContext, BW: number, BH: number) {
        if (BW !== this.BW || BH !== this.BH) {
            const buffer = this.buffer;
            const texture = this.texture;
            const index = this.index;
            gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            const minW = Math.min(BW, this.BW);
            const minH = Math.min(BH, this.BH);
            let pixels: Float32Array;
            let floatType = this.getFloatType(gl);
            if (status === gl.FRAMEBUFFER_COMPLETE) {
                pixels = new Float32Array(minW * minH * 4);
                gl.readPixels(0, 0, minW, minH, gl.RGBA, floatType, pixels);
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            const newIndex = index + 1; // temporary index
            const newTexture = this.getTexture(gl, BW, BH, newIndex);
            floatType = this.getFloatType(gl);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            if (pixels) {
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, minW, minH, gl.RGBA, floatType, pixels);
            }
            const newBuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.deleteTexture(texture);
            gl.activeTexture(gl.TEXTURE0 + index);
            gl.bindTexture(gl.TEXTURE_2D, newTexture);
            this.index = index;
            this.texture = newTexture;
            this.buffer = newBuffer;
            this.BW = BW;
            this.BH = BH;
        }
    }

}

export class IOBuffer {

    program: WebGLProgram;
    input: Buffer;
    output: Buffer;

    index: number;
    key: string;
    vertexString: string;
    fragmentString: string;
    BW: number;
    BH: number;
    isValid: boolean = false;

    constructor(index: number, key: string, vertexString: string, fragmentString: string) {
        this.index = index;
        this.key = key;
        this.vertexString = vertexString;
        this.fragmentString = fragmentString;
    }

    create(gl: WebGLRenderingContext, BW: number, BH: number) {
        const vertexShader = Context.createShader(gl, this.vertexString, gl.VERTEX_SHADER);
        let fragmentShader = Context.createShader(gl, this.fragmentString, gl.FRAGMENT_SHADER, 1);
        if (!fragmentShader) {
            fragmentShader = Context.createShader(gl, 'void main(){\n\tgl_FragColor = vec4(1.0);\n}', gl.FRAGMENT_SHADER);
            this.isValid = false;
        } else {
            this.isValid = true;
        }
        const program = Context.createProgram(gl, [vertexShader, fragmentShader]);
        // gl.useProgram(program);
        const input = new Buffer(gl, BW, BH, this.index + 0);
        const output = new Buffer(gl, BW, BH, this.index + 2);
        this.program = program;
        this.input = input;
        this.output = output;
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
    }

    render(gl: WebGLRenderingContext, BW: number, BH: number) {
        gl.useProgram(this.program);
        gl.viewport(0, 0, BW, BH);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.output.buffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.output.texture, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        // swap
        const temp = this.input;
        const input = this.output;
        const output = temp;
        this.input = input;
        this.output = output;
    }

    resize(gl: WebGLRenderingContext, BW: number, BH: number) {
        gl.useProgram(this.program);
        gl.viewport(0, 0, BW, BH);
        this.input.resize(gl, BW, BH);
        this.output.resize(gl, BW, BH);
    }

    destroy(gl: WebGLRenderingContext) {
        gl.deleteProgram(this.program);
        this.program = null;
        this.input = null;
        this.output = null;
    }

}

export default class Buffers extends IterableStringMap<IOBuffer> {

    get count(): number {
        return Object.keys(this.values).length * 4;
    }

    static getBuffers(gl: WebGLRenderingContext, fragmentString: string, vertexString: string): Buffers {
        const buffers: Buffers = new Buffers();
        let count = 0;
        if (fragmentString) {
            const regexp = /(?:^\s*)((?:#if|#elif)(?:\s*)(defined\s*\(\s*BUFFER_)(\d+)(?:\s*\))|(?:#ifdef)(?:\s*BUFFER_)(\d+)(?:\s*))/gm;
            let matches;
            while ((matches = regexp.exec(fragmentString)) !== null) {
                const i = matches[3] || matches[4];
                const key = 'u_buffer' + i;
                const buffer = new IOBuffer(count, key, vertexString, '#define BUFFER_' + i + '\n' + fragmentString);
                buffer.create(gl, gl.drawingBufferWidth, gl.drawingBufferHeight);
                buffers.set(key, buffer);
                count += 4;
            }
        }
        return buffers;
    }

}