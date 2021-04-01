import 'promise-polyfill';
import { ContextMode } from '../context/context';
import Renderer from '../renderer/renderer';
import { ITextureData, ITextureOptions } from '../textures/textures';
import { IUniformOption } from '../uniforms/uniforms';
export interface ICanvasOptions extends WebGLContextAttributes {
    vertexString?: string;
    fragmentString?: string;
    backgroundColor?: string;
    workpath?: string;
    onError?: Function;
    extensions?: string[];
    mode?: ContextMode;
    mesh?: string;
    doubleSided?: boolean;
}
export default class Canvas extends Renderer {
    options: ICanvasOptions;
    canvas: HTMLCanvasElement;
    rect: ClientRect | DOMRect;
    width: number;
    height: number;
    devicePixelRatio: number;
    valid: boolean;
    visible: boolean;
    controls: boolean;
    rafId: number;
    vertexPath: string;
    fragmentPath: string;
    static items: Canvas[];
    constructor(canvas: HTMLCanvasElement, options?: ICanvasOptions);
    private getShaders_;
    private addListeners_;
    private addCanvasListeners_;
    private removeCanvasListeners_;
    private removeListeners_;
    private onScroll;
    private onWheel;
    private onClick;
    private onDown;
    private onMove;
    private onUp;
    private onMouseDown;
    private onMouseMove;
    private onMouseUp;
    private onMouseOver;
    private onMouseOut;
    private onTouchStart;
    private onTouchMove;
    private onTouchEnd;
    private onLoop;
    private setUniform_;
    private isVisible_;
    private isAnimated_;
    private isDirty_;
    private sizeDidChanged_;
    private parseTextures_;
    load(fragmentString?: string, vertexString?: string): Promise<boolean>;
    private getContext_;
    private createContext_;
    protected create_(): void;
    protected parseMode_(): void;
    protected parseMesh_(): void;
    protected createBuffers_(): void;
    protected createTextures_(): void;
    protected update_(): void;
    protected updateBuffers_(): void;
    protected updateTextures_(): void;
    private destroyContext_;
    private swapCanvas_;
    destroy(): void;
    loadTexture(key: string, urlElementOrData: string | HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | Element | ITextureData, options?: ITextureOptions): void;
    setTexture(key: string, urlElementOrData: string | HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | Element | ITextureData, options?: ITextureOptions): void;
    setUniform(key: string, ...values: any[]): void;
    setUniformOfInt(key: string, values: any[]): void;
    setUniforms(values: IUniformOption): void;
    pause(): void;
    play(): void;
    toggle(): void;
    checkRender(): void;
}
