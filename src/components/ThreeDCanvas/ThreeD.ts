import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader.js";
import {GLTF, GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";
import {RGBELoader} from "three/examples/jsm/loaders/RGBELoader.js";
import {PMREMGenerator} from "three/src/extras/PMREMGenerator.js";
import {gsap} from "gsap";
import CustomEase from "gsap/dist/CustomEase";
import {evaluateJsepTree, findInteractiveObjectByActionName, getNestedProperty, mapRange, removeExtension, returnViewportDependentCameraPosition} from "../../utilities/utilities";
import ShaderStudioRampVertex from "./Shaders/studioRamp_vertex.glsl?raw";
import ShaderStudioRampFragment from "./Shaders/studioRamp_fragment.glsl?raw";
import {AxesHelper, Box3, BoxGeometry, Clock, Color, GridHelper, Group, HalfFloatType, LoadingManager, Material, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, NoToneMapping, Object3D, PerspectiveCamera, Quaternion, Raycaster, RepeatWrapping, Scene, ShaderMaterial, SRGBColorSpace, Texture, TextureLoader, Vector2, Vector3, WebGLRenderer,} from "three";
import { N8AOPostPass } from "n8ao";
import {EffectComposer, EffectPass, HueSaturationEffect, RenderPass, SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode} from "postprocessing";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {TransformControls} from "three/addons/controls/TransformControls.js";
import {useActionsStore, useGlobalStore, usePerformanceSettings, useThreeDReference} from "../../store/store";
import {EAnimationStates, IAction3D, IActionAutoPlace, IActionConnectDisconnectDuspol, IActionConnectDisconnectMultimeter, IActionEquipmentTest, IActionPlace, IActionUse, ICameraPositionAllViewports, ICollection, IInteractiveObjectRaw, ILoadingStats, ISceneActionColor, ISceneActionConditionSet, ITextureCache, IThreeDConfig, TAction, ThreeDOptions, TPerformanceSettingsState, TSceneAction} from "../../types/types";
import {isIAction3D, isIActionConnectDisconnectDuspol, isIActionEquipmentTest, isIActionPlace, isIActionAutoPlace, isIActionUse, isISceneActionParameterAnimation, isISceneActionSetParent, isISceneActionSetBlenderPosition, isISceneActionSetBlenderQuaternion, isISceneActionColor, isISceneActionTexture, isIActionConnectDisconnectMultimeter, isISceneActionMultimeterDigits} from "../../types/typeguards";
import DATA from "../../data/data.json";
import {setAnimationState} from "../../utilities/reducers.ts";
import SpinControls from "./SpinControls/SpinControls.ts";
import jsep from "jsep";
import {CustomUrlParams} from "../../utilities/CustomUrlParams.ts";




export class ThreeD {
    private static readonly noop = () => {};
    //Layer neither the camera nor the raycaster looks at. Used to hide a single object without hiding its
    //children - `visible = false` would take the whole subtree with it (e.g. the inverter pins that sit
    //below "o-inverter-orange-cables").
    private static readonly HIDDEN_LAYER = 1;
    //Every pin of the model is named "<component>-pin-<pinName>" or "<component>-pin_<pinName>" (Blender).
    //Everything behind the marker is the pin name shown while hovering.
    private static readonly PIN_NAME_PATTERN = /-pin[-_](.+)$/i;

    private config: IThreeDConfig;

    readonly canvas: HTMLCanvasElement;
    private userCamera: any;
    private materialList: Array<Material>;
    private textures: ITextureCache = {};
    private loadingStats: ILoadingStats;
    private resizeTimeout: ReturnType<typeof setTimeout> = setTimeout(() => {
    });
    private firstAnimateWasTriggered = false;
    private animateRequested: boolean;
    private loadingTimeout: ReturnType<typeof setTimeout> | null = null;
    private raf = 0;
    private DRACOLoader = new DRACOLoader();
    private loadingManager = new LoadingManager();
    private textureLoader = new TextureLoader();
    private GLTFLoader = new GLTFLoader(this.loadingManager);
    private RGBELoader = new RGBELoader(this.loadingManager);
    private clock = new Clock();
    private camTargetHelper = new Object3D();
    private Raycaster = new Raycaster();
    private pointerPosition = new Vector2();
    private pointerDownPosition = {
        ndc: new Vector2(),
        screen: {x: 0, y: 0}
    };
    private pointerIsDown = false;
    private userIsDragging = false;
    private intersectionObjectSets: {
        navigation: Array<Object3D>,
        place: Array<Object3D>,
        use: Array<Object3D>,
        connectDuo: Array<Object3D>,
        connectMultimeter: Array<Object3D>,
        //All pins of the model, collected by name pattern while loading. Not tied to an action mode - pins are
        //hoverable (name tooltip) whenever hovering is active at all.
        pins: Array<Object3D>
    } = {
        navigation: [],
        place: [],
        use: [],
        connectDuo: [],
        connectMultimeter: [],
        pins: []
    };
    //Resolved 3D objects per collection name (see DATA.collections), filled once the glTF is loaded
    private collectionObjects: Map<string, Array<Object3D>> = new Map();
    private hoverMaterial = new MeshPhysicalMaterial({color: new Color(0.6,0.6,0.6)});
    private activeInspected3DObject: (Object3D | Group) | null = null;
    private previousCamPosition = {
        target: new Vector3(),
        camera: new Vector3()
    }

    /* Have to be type asserted because can't be initialized in constructor since they're all dependent on values that are only present after mount */
    private envTexture!: Texture;
    private scene!: Scene;
    private controls!: OrbitControls;
    private transformControls!: TransformControls;
    private spinControls!: SpinControls;
    private studioRampMaterial!: ShaderMaterial;
    private renderer!: WebGLRenderer;
    private composer!: EffectComposer;
    private aoPass!: N8AOPostPass;
    private colorGradingEffect!: HueSaturationEffect;
    private lastHoveredInteractiveObjectName = "";
    private hoveredPinObject: Object3D | null = null;


    /******************************************************************
     * Constructor
     *****************************************************************/
    constructor(options: ThreeDOptions) {
        gsap.registerPlugin(CustomEase);

        this.config = {
            frameRate: 60,
            maxResolution: 1920,
            continuousRender: false,
            debug: false,
            containObjectInViewParams: {
                portraitAspectRatio: 0.56,
                portraitZoom: 0.4,
                landscapeAspectRatio: 1.778,
                landscapeZoom: 1.0,
            },
            showGridHelper: false,
            logCamPosition: false,
            showCamTarget: false
        };

        this.canvas = options.canvas;
        this.materialList = [];

        this.loadingStats = {
            gltfLoaded: 0,
            gltfTotal: 10729988,
            rgbeLoaded: 0,
            rgbeTotal: 3489839,
            rgbeWasLoaded: false,
            gltfWasLoaded: false,
        };
        this.animateRequested = false;

        this.animate = this.animate.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleAnyObjectHasLoaded = this.handleAnyObjectHasLoaded.bind(this);
        this.handleGLTFLoaded = this.handleGLTFLoaded.bind(this);
        this.handleRGBELoaded = this.handleRGBELoaded.bind(this);
        this.handleGLTFLoadingProgress = this.handleGLTFLoadingProgress.bind(this);
        this.handleRGBELoadingProgress = this.handleRGBELoadingProgress.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handlePointerOut = this.handlePointerOut.bind(this);
        this.handleHoveredInteractiveObjectChange = this.handleHoveredInteractiveObjectChange.bind(this);
    }

    /******************************************************************
     * Public Methods
     *****************************************************************/
    /**
     * Init function. Sets up all THREE objects and triggers loading of 3D assets.
     */
    public init(): void {
        this.log("Initializing");
        const performanceSettings = usePerformanceSettings.getState();
        this.DRACOLoader.setDecoderPath(import.meta.env.BASE_URL + "prebuiltJavascript/");
        this.textureLoader.setPath(import.meta.env.BASE_URL + "textures/");
        this.RGBELoader.setPath(import.meta.env.BASE_URL + "textures/");
        this.GLTFLoader.setDRACOLoader(this.DRACOLoader);
        this.userCamera = new PerspectiveCamera(45, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 400);
        this.scene = new Scene();

        this.studioRampMaterial = new ShaderMaterial({
            uniforms: {
                hdrTexture: {value: null},
                gradientColor1: {value: new Color(1.0, 1.0, 1.0)},
                gradientColor2: {value: new Color(1.0, 1.0, 1.0)},
                toneMappingExposure2: {value: 1.0},
                minY: {value: -2.2},
                maxY: {value: 2.02},
            },
            vertexShader: ShaderStudioRampVertex,
            fragmentShader: ShaderStudioRampFragment,
            toneMapped: true,
            dithering: true,
        });

        let width = Math.floor(this.canvas.clientWidth * window.devicePixelRatio);
        let height = Math.floor(this.canvas.clientHeight * window.devicePixelRatio);
        const ratio = height / width;
        if(!performanceSettings.maxResolutionToggle) {
            if (width > this.config.maxResolution) {
                width = this.config.maxResolution;
                height = width * ratio;
            }
            if (height > this.config.maxResolution) {
                height = this.config.maxResolution;
                width = height / ratio;
            }
        }

        this.renderer = new WebGLRenderer({
            powerPreference: "high-performance",
            antialias: false,
            stencil: false,
            canvas: this.canvas
        });
        this.renderer.toneMapping = NoToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = false;
        this.renderer.outputColorSpace = SRGBColorSpace;
        this.renderer.info.autoReset = false;

        this.aoPass = new N8AOPostPass(this.scene, this.userCamera, width, height);
        this.aoPass.configuration.gammaCorrection = false;
        this.aoPass.configuration.aoRadius = 0.9;
        this.aoPass.configuration.distanceFalloff = 3.4;
        this.aoPass.configuration.intensity = 1.0;
        this.aoPass.configuration.halfRes = true;
        this.aoPass.configuration.color = new Color(0.1,0.1,0.26);
        this.aoPass.setQualityMode(performanceSettings.occlusionPerformance);

        this.composer = new EffectComposer(this.renderer, {frameBufferType: HalfFloatType, multisampling: 8});
        this.composer.addPass(new RenderPass(this.scene, this.userCamera));
        this.composer.addPass(this.aoPass);
        this.composer.addPass(new EffectPass(this.userCamera, new ToneMappingEffect({mode: ToneMappingMode.ACES_FILMIC})));
        this.composer.addPass(new EffectPass(this.userCamera, new SMAAEffect({preset: SMAAPreset.HIGH})));


        this.composer.setSize(width, height, false);

        //Camera setup
        this.controls = new OrbitControls(this.userCamera, this.canvas);
        this.controls.minDistance = 0.2;
        this.controls.maxDistance = 6;
        this.controls.enablePan = true;
        this.controls.enableZoom = true;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.enabled = true;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.rotateSpeed = 0.5;

        const activeMissionName = useGlobalStore.getState().activeMissionName;
        const urlSearchParams = new CustomUrlParams(window.location.search);
        let predefinedStateId = urlSearchParams.get('predefinedStateId');

        if(activeMissionName && predefinedStateId) {
            const predefinedState = DATA.missions.find(mission => mission.name === activeMissionName)?.predefinedStates?.find(state => state.id === predefinedStateId);

            if(predefinedState) {
                this.controls.target.set(predefinedState.camData.landscape.target.x, predefinedState.camData.landscape.target.y, predefinedState.camData.landscape.target.z);
                this.userCamera.position.set(predefinedState.camData.landscape.camera.x, predefinedState.camData.landscape.camera.y, predefinedState.camData.landscape.camera.z);
            }
            else {
                this.controls.target.set(DATA.general.startCameraPosition.landscape.target.x, DATA.general.startCameraPosition.landscape.target.y, DATA.general.startCameraPosition.landscape.target.z);
                this.userCamera.position.set(DATA.general.startCameraPosition.landscape.camera.x, DATA.general.startCameraPosition.landscape.camera.y, DATA.general.startCameraPosition.landscape.camera.z);
            }
        }
        else {
            this.controls.target.set(DATA.general.startCameraPosition.landscape.target.x, DATA.general.startCameraPosition.landscape.target.y, DATA.general.startCameraPosition.landscape.target.z);
            this.userCamera.position.set(DATA.general.startCameraPosition.landscape.camera.x, DATA.general.startCameraPosition.landscape.camera.y, DATA.general.startCameraPosition.landscape.camera.z);
        }

        this.controls.addEventListener("change", () => {
            this.requestAnimateIfNotRequested();
        });

        this.transformControls = new TransformControls(this.userCamera, this.canvas);
        this.transformControls.setMode('rotate');
        this.transformControls.enabled = false;
        this.transformControls.addEventListener("change", () => {
            this.requestAnimateIfNotRequested();
        });


        if (this.config.logCamPosition || this.config.showCamTarget) {
            this.controls.addEventListener("change", () => {
                if (this.config.logCamPosition) {
                    console.log(
                        `"target":{\n    "x": ${this.controls.target.x},\n    "y": ${this.controls.target.y},\n    "z": ${this.controls.target.z}\n},\n "camera": {\n    "x": ${this.userCamera.position.x},\n    "y": ${this.userCamera.position.y},\n    "z": ${this.userCamera.position.z}\n}`
                    );
                }
                if (this.config.showCamTarget) {
                    this.camTargetHelper.position.set(
                        this.controls.target.x,
                        this.controls.target.y,
                        this.controls.target.z
                    );
                }
            });
        }
        //Grid & Axis Helper
        if (this.config.showGridHelper) {
            this.scene.add(new GridHelper(12, 120));
            this.scene.add(new AxesHelper(12));
        }


        this.loadObjects();

        this.renderer.domElement.addEventListener("pointermove", this.handlePointerMove);
        this.renderer.domElement.addEventListener("pointerdown", this.handlePointerDown);
        this.renderer.domElement.addEventListener("pointerup", this.handlePointerUp);
        this.renderer.domElement.addEventListener("pointerout", this.handlePointerOut);
    }

    public animateCamera(payload: ICameraPositionAllViewports, duration?: number) {
        const viewportDependentCameraData = returnViewportDependentCameraPosition(payload);
        const tempObj = {
            targetX: this.controls.target.x,
            targetY: this.controls.target.y,
            targetZ: this.controls.target.z,
            cameraX: this.userCamera.position.x,
            cameraY: this.userCamera.position.y,
            cameraZ: this.userCamera.position.z,
        };

        gsap.to(tempObj, {
            targetX: viewportDependentCameraData.target.x,
            targetY: viewportDependentCameraData.target.y,
            targetZ: viewportDependentCameraData.target.z,
            cameraX: viewportDependentCameraData.camera.x,
            cameraY: viewportDependentCameraData.camera.y,
            cameraZ: viewportDependentCameraData.camera.z,
            duration: duration ? duration : 1.5,
            ease: CustomEase.create("custom", "M0,0,C0.28,0.02,0.194,1,1,1"),
            onUpdate: () => {
                this.controls.target.set(
                    tempObj.targetX,
                    tempObj.targetY,
                    tempObj.targetZ
                );
                this.userCamera.position.set(
                    tempObj.cameraX,
                    tempObj.cameraY,
                    tempObj.cameraZ
                );
                this.requestAnimateIfNotRequested();
            },
        });

        this.requestAnimateIfNotRequested();
    }

    public focusInteractiveObject(interactiveObjectName) {
        if(interactiveObjectName === "duspol") {
            const objectToFocus = this.scene.getObjectByName("o-duspol-working-plus");
            const boundingBox = new Box3();
            boundingBox.setFromObject(objectToFocus);
            const boundingBoxCenter = new Vector3();
            boundingBox.getCenter(boundingBoxCenter);

            const objectAtSelection = new Object3D();
            objectAtSelection.position.set(boundingBoxCenter.x, boundingBoxCenter.y, boundingBoxCenter.z);
            objectAtSelection.translateZ(0.25);
            objectAtSelection.translateX(0.1);
            objectAtSelection.translateY(0.3);

            const tempObj = {
                targetX: this.controls.target.x,
                targetY: this.controls.target.y,
                targetZ: this.controls.target.z,
                cameraX: this.userCamera.position.x,
                cameraY: this.userCamera.position.y,
                cameraZ: this.userCamera.position.z,
            };

            gsap.to(tempObj, {
                targetX: boundingBoxCenter.x,
                targetY: boundingBoxCenter.y,
                targetZ: boundingBoxCenter.z,
                cameraX: objectAtSelection.position.x,
                cameraY: objectAtSelection.position.y,
                cameraZ: objectAtSelection.position.z,
                duration: 1.5,
                ease: CustomEase.create("custom", "M0,0,C0.28,0.02,0.194,1,1,1"),
                onUpdate: () => {
                    this.controls.target.set(
                        tempObj.targetX,
                        tempObj.targetY,
                        tempObj.targetZ
                    );
                    this.userCamera.position.set(
                        tempObj.cameraX,
                        tempObj.cameraY,
                        tempObj.cameraZ
                    );
                    this.requestAnimateIfNotRequested();
                },
            });
        }
        else if(interactiveObjectName === "multimeter") {
            const objectToFocus = this.scene.getObjectByName("e-multimeter-minus");
            const boundingBox = new Box3();
            boundingBox.setFromObject(objectToFocus);
            const boundingBoxCenter = new Vector3();
            boundingBox.getCenter(boundingBoxCenter);

            const objectAtSelection = new Object3D();
            objectAtSelection.position.set(boundingBoxCenter.x, boundingBoxCenter.y, boundingBoxCenter.z);
            objectAtSelection.translateZ(0.25);
            objectAtSelection.translateX(0.1);
            objectAtSelection.translateY(0.3);

            const tempObj = {
                targetX: this.controls.target.x,
                targetY: this.controls.target.y,
                targetZ: this.controls.target.z,
                cameraX: this.userCamera.position.x,
                cameraY: this.userCamera.position.y,
                cameraZ: this.userCamera.position.z,
            };

            gsap.to(tempObj, {
                targetX: boundingBoxCenter.x,
                targetY: boundingBoxCenter.y,
                targetZ: boundingBoxCenter.z,
                cameraX: objectAtSelection.position.x,
                cameraY: objectAtSelection.position.y,
                cameraZ: objectAtSelection.position.z,
                duration: 1.5,
                ease: CustomEase.create("custom", "M0,0,C0.28,0.02,0.194,1,1,1"),
                onUpdate: () => {
                    this.controls.target.set(
                        tempObj.targetX,
                        tempObj.targetY,
                        tempObj.targetZ
                    );
                    this.userCamera.position.set(
                        tempObj.cameraX,
                        tempObj.cameraY,
                        tempObj.cameraZ
                    );
                    this.requestAnimateIfNotRequested();
                },
            });
        }
        else {
            const interactiveObjectToFocus = DATA.interactiveObjects.find((o => o.name === interactiveObjectName));
            if(!interactiveObjectToFocus) return;


            if(interactiveObjectToFocus.focusCameraPosition) {
                this.animateCamera(interactiveObjectToFocus.focusCameraPosition)
            }
            else {
                let objectToFocus: Object3D | null = null;

                if(interactiveObjectToFocus.focusObject) {
                    objectToFocus = this.scene.getObjectByName(interactiveObjectToFocus.focusObject);

                    if(!objectToFocus) return;

                    const objectAtSelection = new Object3D();
                    objectAtSelection.position.set(objectToFocus.position.x, objectToFocus.position.y, objectToFocus.position.z);
                    //Set quaternion of objectAtSelection to quaternion of objectToFocus
                    const objectToFocusQuaternion = new Quaternion();
                    objectToFocus.getWorldQuaternion(objectToFocusQuaternion);
                    objectAtSelection.quaternion.set(objectToFocusQuaternion.x, objectToFocusQuaternion.y, objectToFocusQuaternion.z, objectToFocusQuaternion.w);
                    objectAtSelection.translateY(0.85 * objectToFocus.scale.y);

                    const tempObj = {
                        targetX: this.controls.target.x,
                        targetY: this.controls.target.y,
                        targetZ: this.controls.target.z,
                        cameraX: this.userCamera.position.x,
                        cameraY: this.userCamera.position.y,
                        cameraZ: this.userCamera.position.z,
                    };

                    gsap.to(tempObj, {
                        targetX: objectToFocus.position.x,
                        targetY: objectToFocus.position.y,
                        targetZ: objectToFocus.position.z,
                        cameraX: objectAtSelection.position.x,
                        cameraY: objectAtSelection.position.y,
                        cameraZ: objectAtSelection.position.z,
                        duration: 1.5,
                        ease: CustomEase.create("custom", "M0,0,C0.28,0.02,0.194,1,1,1"),
                        onUpdate: () => {
                            this.controls.target.set(
                                tempObj.targetX,
                                tempObj.targetY,
                                tempObj.targetZ
                            );
                            this.userCamera.position.set(
                                tempObj.cameraX,
                                tempObj.cameraY,
                                tempObj.cameraZ
                            );
                            this.requestAnimateIfNotRequested();
                        },
                    });

                }
                else {
                    if(interactiveObjectName === "duspol") {
                        objectToFocus = this.scene.getObjectByName("o-duspol-working-plus");
                    }
                    else if(interactiveObjectName === "multimeter") {
                        objectToFocus = this.scene.getObjectByName("o-multimeter");
                    }
                    else {
                        objectToFocus = this.scene.getObjectByName(interactiveObjectToFocus.main3DTransform);
                    }

                    if(!objectToFocus) return;

                    const boundingBox = new Box3();
                    boundingBox.setFromObject(objectToFocus);
                    const boundingBoxCenter = new Vector3();
                    boundingBox.getCenter(boundingBoxCenter);

                    const objectAtSelection = new Object3D();
                    objectAtSelection.position.set(boundingBoxCenter.x, boundingBoxCenter.y, boundingBoxCenter.z);
                    //Set quaternion of objectAtSelection to quaternion of objectToFocus
                    const objectToFocusQuaternion = new Quaternion();
                    objectToFocus.getWorldQuaternion(objectToFocusQuaternion);
                    objectAtSelection.quaternion.set(objectToFocusQuaternion.x, objectToFocusQuaternion.y, objectToFocusQuaternion.z, objectToFocusQuaternion.w);
                    objectAtSelection.translateY(0.85 * objectToFocus.scale.y);


                    const tempObj = {
                        targetX: this.controls.target.x,
                        targetY: this.controls.target.y,
                        targetZ: this.controls.target.z,
                        cameraX: this.userCamera.position.x,
                        cameraY: this.userCamera.position.y,
                        cameraZ: this.userCamera.position.z,
                    };

                    gsap.to(tempObj, {
                        targetX: boundingBoxCenter.x,
                        targetY: boundingBoxCenter.y,
                        targetZ: boundingBoxCenter.z,
                        cameraX: objectAtSelection.position.x,
                        cameraY: objectAtSelection.position.y,
                        cameraZ: objectAtSelection.position.z,
                        duration: 1.5,
                        ease: CustomEase.create("custom", "M0,0,C0.28,0.02,0.194,1,1,1"),
                        onUpdate: () => {
                            this.controls.target.set(
                                tempObj.targetX,
                                tempObj.targetY,
                                tempObj.targetZ
                            );
                            this.userCamera.position.set(
                                tempObj.cameraX,
                                tempObj.cameraY,
                                tempObj.cameraZ
                            );
                            this.requestAnimateIfNotRequested();
                        },
                    });
                }
            }
        }
    }

    public centerCamera() {
        this.animateCamera(DATA.general.startCameraPosition);
    }

    /******************************************************************
     * Private Methods
     *****************************************************************/

    /**
     * Subscribes to stores to listen for changes and perform necessary changes in 3D scene
     * @private
     */
    private subscribeToState() {
        useGlobalStore.subscribe((state) => state.viewport, (viewport, oldViewport) => {
            if (viewport.width === oldViewport.width && viewport.height === oldViewport.height) return;
            this.handleResize();
        });
        useGlobalStore.subscribe((state) => state.hoveredInteractiveObjectName, (hoveredInteractiveObjectName) => {
            this.handleHoveredInteractiveObjectChange(hoveredInteractiveObjectName);
        });
        useGlobalStore.subscribe((state) => state.activeInspectActionName, (activeInspectActionName, previousInspectActionName) => {
            if(activeInspectActionName === "") {
                const interactiveObject = DATA.interactiveObjects.find((o) => o.actions.includes(previousInspectActionName));
                if(!interactiveObject) return;

                this.activeInspected3DObject = this.scene.getObjectByName(interactiveObject.main3DTransform);
                if(!this.activeInspected3DObject) return;

                this.controls.enabled = true;
                this.spinControls.dispose();
                this.spinControls = null;

                const tempObject = {
                    tx: this.activeInspected3DObject.position.x,
                    ty: this.activeInspected3DObject.position.y,
                    tz: this.activeInspected3DObject.position.z,
                    qx: this.activeInspected3DObject.quaternion.x,
                    qy: this.activeInspected3DObject.quaternion.y,
                    qz: this.activeInspected3DObject.quaternion.z,
                    qw: this.activeInspected3DObject.quaternion.w
                }
                const originalPosition = new Vector3();
                const originalRotation = new Quaternion();
                this.activeInspected3DObject.userData.originalTransform.decompose(originalPosition, originalRotation, new Vector3());

                gsap.to(tempObject, {
                    tx: originalPosition.x,
                    ty: originalPosition.y,
                    tz: originalPosition.z,
                    qx: originalRotation.x,
                    qy: originalRotation.y,
                    qz: originalRotation.z,
                    qw: originalRotation.w,
                    duration: 0.5,
                    ease: CustomEase.create("custom", "M0,0,C0.28,0.02,0.194,1,1,1"),
                    onUpdate: () => {
                        this.activeInspected3DObject.position.set(tempObject.tx, tempObject.ty, tempObject.tz);
                        this.activeInspected3DObject.quaternion.set(tempObject.qx, tempObject.qy, tempObject.qz, tempObject.qw);
                        this.requestAnimateIfNotRequested();
                    }
                });

            }
            else {
                const interactiveObject = DATA.interactiveObjects.find((o) => o.actions.includes(activeInspectActionName));
                if(!interactiveObject) return;

                this.activeInspected3DObject = this.scene.getObjectByName(interactiveObject.main3DTransform);
                if(!this.activeInspected3DObject) return;

                this.controls.enabled = false;

                //Find position directly in front of camera
                const cameraPosition = this.userCamera.position.clone();
                const cameraDirection = new Vector3();
                this.userCamera.getWorldDirection(cameraDirection);
                const distance = 0.7;
                const targetPosition = cameraPosition.add(cameraDirection.multiplyScalar(distance));

                //Use gsap to tween the object to the target position
                gsap.to(this.activeInspected3DObject.position, {
                    x: targetPosition.x,
                    y: targetPosition.y,
                    z: targetPosition.z,
                    duration: 0.5,
                    ease: CustomEase.create("custom", "M0,0,C0.28,0.02,0.194,1,1,1"),
                    onUpdate: () => {
                        this.requestAnimateIfNotRequested();
                    },
                    onComplete: () => {
                        this.spinControls = new SpinControls(this.activeInspected3DObject, 0.25, this.userCamera, this.canvas);
                        this.spinControls.addEventListener("change", () => {
                            this.requestAnimateIfNotRequested();
                        });
                    }
                });
            }



        });
        useGlobalStore.subscribe((state) => state.activePlaceActionName, (activePlaceActionName) => {
            if(activePlaceActionName === "") {
                this.intersectionObjectSets.place = [];
            }
            else {
                const currentPlaceAction = useActionsStore.getState().actions.find((action) => action.name === activePlaceActionName);
                if(!currentPlaceAction) return;

                const possiblePlace3DObjectNames: string[] = [];
                if(isIActionPlace(currentPlaceAction)) {
                    currentPlaceAction.correctPlaceInteractiveObjects.forEach((correctPlaceInteractiveObject) => {
                        let conditionsMet = false;

                        if(correctPlaceInteractiveObject.condition) {
                            const actions = useActionsStore.getState().actions;
                            const jsepTree = jsep(correctPlaceInteractiveObject.condition);
                            conditionsMet = evaluateJsepTree(jsepTree, actions);
                        }
                        else {
                            conditionsMet = true;
                        }

                        if(conditionsMet) {
                            DATA.interactiveObjects.forEach((interactiveObject) => {
                                if(interactiveObject.name === correctPlaceInteractiveObject.name) {
                                    possiblePlace3DObjectNames.push(...interactiveObject.objects3DNames);
                                }
                            })
                        }
                    });
                }

                this.scene.traverse((object) => {
                    if(object.type === "Mesh" || object.type === "Group") {
                        if(isIActionPlace(currentPlaceAction)) {
                            if(possiblePlace3DObjectNames.includes(object.name)) {
                                this.intersectionObjectSets.place.push(object);
                            }
                        }
                    }
                });
            }
        });
        useGlobalStore.subscribe((state) => state.activeUseActionName, (activeUseActionName) => {
            if(activeUseActionName === "") {
                this.intersectionObjectSets.use = [];
            }
            else {
                const currentUseAction = useActionsStore.getState().actions.find((action) => action.name === activeUseActionName);
                if(!currentUseAction || !isIActionUse(currentUseAction)) return;

                const possibleUse3DObjectNames: string[] = [];
                currentUseAction.correctInteractiveObjects.forEach((correctInteractiveObject) => {
                    DATA.interactiveObjects.forEach((interactiveObject) => {
                        if(interactiveObject.name === correctInteractiveObject.name) {
                            possibleUse3DObjectNames.push(...interactiveObject.objects3DNames);
                        }
                    });
                });

                this.scene.traverse((object) => {
                    if(object.type === "Mesh" || object.type === "Group") {
                        if(possibleUse3DObjectNames.includes(object.name)) {
                            this.intersectionObjectSets.use.push(object);
                        }
                    }
                });
            }
        });
        useGlobalStore.subscribe((state) => state.activeConnectDisconnectDuspolActionName, (activeConnectDisconnectDuspolActionName) => {
            if(activeConnectDisconnectDuspolActionName === "") {
                this.intersectionObjectSets.connectDuo = [];
            }
            else {
                const currentConnectDisconnectDuspolAction = useActionsStore.getState().actions.find((action) => action.name === activeConnectDisconnectDuspolActionName);
                if(!currentConnectDisconnectDuspolAction) return;

                const connectable3DObjectNames: string[] = [];
                if(isIActionConnectDisconnectDuspol(currentConnectDisconnectDuspolAction)) {
                    currentConnectDisconnectDuspolAction.connectableInteractiveObjects.forEach((connectableInteractiveObject) => {
                        DATA.interactiveObjects.forEach((interactiveObject) => {
                            if(interactiveObject.name === connectableInteractiveObject.name) {
                                connectable3DObjectNames.push(...interactiveObject.objects3DNames);
                            }
                        })
                    });
                }

                this.scene.traverse((object) => {
                    if(object.type === "Mesh" || object.type === "Group") {
                        if(isIActionConnectDisconnectDuspol(currentConnectDisconnectDuspolAction)) {
                            if(connectable3DObjectNames.includes(object.name)) {
                                this.intersectionObjectSets.connectDuo.push(object);
                            }
                        }
                    }
                });
            }
        });
        useGlobalStore.subscribe((state) => state.activeConnectDisconnectMultimeterActionName, (activeConnectDisconnectMultimeterActionName) => {
            if(activeConnectDisconnectMultimeterActionName === "") {
                this.intersectionObjectSets.connectMultimeter = [];
            }
            else {
                const currentConnectDisconnectMultimeterAction = useActionsStore.getState().actions.find((action) => action.name === activeConnectDisconnectMultimeterActionName);
                if(!currentConnectDisconnectMultimeterAction) return;

                const connectable3DObjectNames: string[] = [];
                if(isIActionConnectDisconnectMultimeter(currentConnectDisconnectMultimeterAction)) {
                    currentConnectDisconnectMultimeterAction.connectableInteractiveObjects.forEach((connectableInteractiveObject) => {
                        DATA.interactiveObjects.forEach((interactiveObject) => {
                            if(interactiveObject.name === connectableInteractiveObject.name) {
                                connectable3DObjectNames.push(...interactiveObject.objects3DNames);
                            }
                        })
                    });
                }

                this.scene.traverse((object) => {
                    if(object.type === "Mesh" || object.type === "Group") {
                        if(isIActionConnectDisconnectMultimeter(currentConnectDisconnectMultimeterAction)) {
                            if(connectable3DObjectNames.includes(object.name)) {
                                this.intersectionObjectSets.connectMultimeter.push(object);
                            }
                        }
                    }
                });
            }
        });
        useGlobalStore.subscribe((state) => state.hiddenCollectionNames, (hiddenCollectionNames) => {
            this.applyCollectionVisibility(hiddenCollectionNames);
        });
        usePerformanceSettings.subscribe((state) => {this.applyPerformanceSettings(state)});
        useActionsStore.subscribe((state) => state.actions, (actions, previousActions) => {
            actions.forEach((action, actionIndex) => {
                if(action.activationCount !== previousActions[actionIndex].activationCount) {
                    if(isIAction3D(action)) {
                        this.handle3DActionChange(action, actions);
                    }
                    if(isIActionPlace(action)) {
                        this.handlePlaceActionChange(action, actions);
                    }
                    if(isIActionAutoPlace(action)) {
                        this.handleAutoPlaceActionChange(action, actions, previousActions);
                    }
                    if(isIActionEquipmentTest(action)) {
                        if(action.activated === false && previousActions[actionIndex].activated) {
                            this.animateCamera({
                                landscape: {
                                    target: this.previousCamPosition.target,
                                    camera: this.previousCamPosition.camera,
                                }
                            });
                            this.performSceneActions(action, action.sceneActionConditionSetsToggle, actions);
                        }
                        else if (action.activated && previousActions[actionIndex].activated === false){
                            this.previousCamPosition.target = new Vector3(this.controls.target.x, this.controls.target.y, this.controls.target.z);
                            this.previousCamPosition.camera = new Vector3(this.userCamera.position.x, this.userCamera.position.y, this.userCamera.position.z);

                            if(action.name === "duspolWorkingTest") {
                                this.focusInteractiveObject("duspol");
                            }
                            else {
                                this.animateCamera(action.focusCameraPosition, 1);
                            }
                            setTimeout(() => {
                                this.performSceneActions(action, action.sceneActionConditionSets, actions);
                            }, 1000)
                        }
                    }
                    if(isIActionConnectDisconnectDuspol(action)) {
                        if(
                            action.connectedFirstInteractiveObjectName !== (previousActions[actionIndex] as IActionConnectDisconnectDuspol).connectedFirstInteractiveObjectName ||
                            action.connectedSecondInteractiveObjectName !== (previousActions[actionIndex] as IActionConnectDisconnectDuspol).connectedSecondInteractiveObjectName
                        ) {
                            //In the process of connecting.
                            //This is an abberation.
                            //Usually, we'd use action.activated to determine whether we should start the activation sceneActions or the removing ones.
                            //But with this action, action.activated will only be set to true, when both connections have been made.
                            if(action.connectedFirstInteractiveObjectName !== "" || action.connectedSecondInteractiveObjectName !== "") {
                                if(action.connectedFirstInteractiveObjectName !== "" && action.connectedSecondInteractiveObjectName === "") {
                                    const first3DObject = this.scene.getObjectByName(action.first3DMainTransform);
                                    const sceneActionConditionSetsToPerformWithout3DObject = action.connectableInteractiveObjects.find((connectableObject) => connectableObject.name === action.connectedFirstInteractiveObjectName)?.sceneActionConditionSets;
                                    this.scene.add(first3DObject);

                                    const sceneActionConditionSetsToPerform = sceneActionConditionSetsToPerformWithout3DObject.map((sceneActionSet) => {
                                        const completeSceneActionSet = structuredClone(sceneActionSet);

                                        //Add main3DTransformObject to sceneActions
                                        completeSceneActionSet.sceneActions = completeSceneActionSet.sceneActions.map((sceneAction) => {
                                            const completeSceneAction = structuredClone(sceneAction);
                                            completeSceneAction['objectName'] = action.first3DMainTransform;
                                            return completeSceneAction;
                                        }) as unknown as TSceneAction[];

                                        return completeSceneActionSet as unknown as ISceneActionConditionSet;
                                    });

                                    if(sceneActionConditionSetsToPerform) {
                                        this.performSceneActions(action, sceneActionConditionSetsToPerform, actions);
                                    }
                                }
                                else if(action.connectedFirstInteractiveObjectName !== "" && action.connectedSecondInteractiveObjectName !== "") {
                                    const second3DObject = this.scene.getObjectByName(action.second3DMainTransform);
                                    const sceneActionConditionSetsToPerformWithout3DObject = action.connectableInteractiveObjects.find((connectableObject) => connectableObject.name === action.connectedSecondInteractiveObjectName)?.sceneActionConditionSets;
                                    this.scene.add(second3DObject);

                                    const sceneActionConditionSetsToPerform = sceneActionConditionSetsToPerformWithout3DObject.map((sceneActionSet) => {
                                        const completeSceneActionSet = structuredClone(sceneActionSet);

                                        //Add main3DTransformObject to sceneActions
                                        completeSceneActionSet.sceneActions = completeSceneActionSet.sceneActions.map((sceneAction) => {
                                            const completeSceneAction = structuredClone(sceneAction);
                                            completeSceneAction['objectName'] = action.second3DMainTransform;
                                            return completeSceneAction;
                                        }) as unknown as TSceneAction[];

                                        return completeSceneActionSet as unknown as ISceneActionConditionSet;
                                    });

                                    //Get the scene actions for the specific pairing of connected objects and look for the conditionSet that applies to the current state of the scene
                                    action.connectionPairResults.forEach((pairResult) => {
                                        let pairWasFound = false;
                                        if(pairResult.orderRelevant) {
                                            if(pairResult.pairing[0] === action.connectedFirstInteractiveObjectName && pairResult.pairing[1] === action.connectedSecondInteractiveObjectName) {
                                                pairWasFound = true;
                                            }
                                        }
                                        else {
                                            if(pairResult.pairing.includes(action.connectedFirstInteractiveObjectName) && pairResult.pairing.includes(action.connectedSecondInteractiveObjectName)) {
                                                pairWasFound = true;
                                            }
                                        }

                                        if(pairWasFound) {
                                            for(let i=0; i < pairResult.sceneActionConditionSets.length; i++) {
                                                sceneActionConditionSetsToPerform.push(pairResult.sceneActionConditionSets[i]);
                                            }
                                        }
                                    });

                                    if(sceneActionConditionSetsToPerform) {
                                        this.performSceneActions(action, sceneActionConditionSetsToPerform, actions);
                                    }
                                }
                            }

                            //Removing
                            else {
                                const first3DObject = this.scene.getObjectByName(action.first3DMainTransform);
                                const second3DObject = this.scene.getObjectByName(action.second3DMainTransform);
                                const originalParent = this.scene.getObjectByName(first3DObject.userData.originalParentName);

                                originalParent.add(first3DObject);
                                originalParent.add(second3DObject);

                                const originalFirstPosition = new Vector3();
                                const originalFirstQuaternion = new Quaternion();

                                first3DObject.userData.originalTransform.decompose(originalFirstPosition, originalFirstQuaternion, new Vector3());
                                first3DObject.position.set(originalFirstPosition.x, originalFirstPosition.y, originalFirstPosition.z);
                                first3DObject.quaternion.set(originalFirstQuaternion.x, originalFirstQuaternion.y, originalFirstQuaternion.z, originalFirstQuaternion.w);

                                const originalSecondPosition = new Vector3();
                                const originalSecondQuaternion = new Quaternion();

                                second3DObject.userData.originalTransform.decompose(originalSecondPosition, originalSecondQuaternion, new Vector3());
                                second3DObject.position.set(originalSecondPosition.x, originalSecondPosition.y, originalSecondPosition.z);
                                second3DObject.quaternion.set(originalSecondQuaternion.x, originalSecondQuaternion.y, originalSecondQuaternion.z, originalSecondQuaternion.w);

                                this.performSceneActions(action, action.sceneActionConditionSetsToggle, actions);

                                this.requestAnimateIfNotRequested();
                            }
                        }
                    }
                    if(isIActionConnectDisconnectMultimeter(action)) {
                        if(
                            action.connectedFirstInteractiveObjectName !== (previousActions[actionIndex] as IActionConnectDisconnectMultimeter).connectedFirstInteractiveObjectName ||
                            action.connectedSecondInteractiveObjectName !== (previousActions[actionIndex] as IActionConnectDisconnectMultimeter).connectedSecondInteractiveObjectName
                        ) {
                            //In the process of connecting.
                            //This is an abberation.
                            //Usually, we'd use action.activated to determine whether we should start the activation sceneActions or the removing ones.
                            //But with this action, action.activated will only be set to true, when both connections have been made.
                            if(action.connectedFirstInteractiveObjectName !== "" || action.connectedSecondInteractiveObjectName !== "") {
                                if(action.connectedFirstInteractiveObjectName !== "" && action.connectedSecondInteractiveObjectName === "") {
                                    const first3DObject = this.scene.getObjectByName(action.first3DMainTransform);
                                    const sceneActionConditionSetsToPerformWithout3DObject = action.connectableInteractiveObjects.find((connectableObject) => connectableObject.name === action.connectedFirstInteractiveObjectName)?.sceneActionConditionSets;
                                    this.scene.add(first3DObject);

                                    const sceneActionConditionSetsToPerform = sceneActionConditionSetsToPerformWithout3DObject.map((sceneActionSet) => {
                                        const completeSceneActionSet = structuredClone(sceneActionSet);

                                        //Add main3DTransformObject to sceneActions
                                        completeSceneActionSet.sceneActions = completeSceneActionSet.sceneActions.map((sceneAction) => {
                                            const completeSceneAction = structuredClone(sceneAction);
                                            completeSceneAction['objectName'] = action.first3DMainTransform;
                                            return completeSceneAction;
                                        }) as unknown as TSceneAction[];

                                        return completeSceneActionSet as unknown as ISceneActionConditionSet;
                                    });

                                    if(sceneActionConditionSetsToPerform) {
                                        this.performSceneActions(action, sceneActionConditionSetsToPerform, actions);
                                    }
                                }
                                else if(action.connectedFirstInteractiveObjectName !== "" && action.connectedSecondInteractiveObjectName !== "") {
                                    const second3DObject = this.scene.getObjectByName(action.second3DMainTransform);
                                    const sceneActionConditionSetsToPerformWithout3DObject = action.connectableInteractiveObjects.find((connectableObject) => connectableObject.name === action.connectedSecondInteractiveObjectName)?.sceneActionConditionSets;
                                    this.scene.add(second3DObject);

                                    const sceneActionConditionSetsToPerform = sceneActionConditionSetsToPerformWithout3DObject.map((sceneActionSet) => {
                                        const completeSceneActionSet = structuredClone(sceneActionSet);

                                        //Add main3DTransformObject to sceneActions
                                        completeSceneActionSet.sceneActions = completeSceneActionSet.sceneActions.map((sceneAction) => {
                                            const completeSceneAction = structuredClone(sceneAction);
                                            completeSceneAction['objectName'] = action.second3DMainTransform;
                                            return completeSceneAction;
                                        }) as unknown as TSceneAction[];

                                        return completeSceneActionSet as unknown as ISceneActionConditionSet;
                                    });

                                    //Get the scene actions for the specific pairing of connected objects and look for the conditionSet that applies to the current state of the scene
                                    action.connectionPairResults.forEach((pairResult) => {
                                        let pairWasFound = false;
                                        if(pairResult.orderRelevant) {
                                            if(pairResult.pairing[0] === action.connectedFirstInteractiveObjectName && pairResult.pairing[1] === action.connectedSecondInteractiveObjectName) {
                                                pairWasFound = true;
                                            }
                                        }
                                        else {
                                            if(pairResult.pairing.includes(action.connectedFirstInteractiveObjectName) && pairResult.pairing.includes(action.connectedSecondInteractiveObjectName)) {
                                                pairWasFound = true;
                                            }
                                        }

                                        if(pairWasFound) {
                                            for(let i=0; i < pairResult.sceneActionConditionSets.length; i++) {
                                                sceneActionConditionSetsToPerform.push(pairResult.sceneActionConditionSets[i]);
                                            }
                                        }
                                    });

                                    if(sceneActionConditionSetsToPerform) {
                                        this.performSceneActions(action, sceneActionConditionSetsToPerform, actions);
                                    }
                                }
                            }

                            //Removing
                            else {
                                const first3DObject = this.scene.getObjectByName(action.first3DMainTransform);
                                const second3DObject = this.scene.getObjectByName(action.second3DMainTransform);
                                const originalParent = this.scene.getObjectByName(first3DObject.userData.originalParentName);

                                originalParent.add(first3DObject);
                                originalParent.add(second3DObject);

                                const originalFirstPosition = new Vector3();
                                const originalFirstQuaternion = new Quaternion();

                                first3DObject.userData.originalTransform.decompose(originalFirstPosition, originalFirstQuaternion, new Vector3());
                                first3DObject.position.set(originalFirstPosition.x, originalFirstPosition.y, originalFirstPosition.z);
                                first3DObject.quaternion.set(originalFirstQuaternion.x, originalFirstQuaternion.y, originalFirstQuaternion.z, originalFirstQuaternion.w);

                                const originalSecondPosition = new Vector3();
                                const originalSecondQuaternion = new Quaternion();

                                second3DObject.userData.originalTransform.decompose(originalSecondPosition, originalSecondQuaternion, new Vector3());
                                second3DObject.position.set(originalSecondPosition.x, originalSecondPosition.y, originalSecondPosition.z);
                                second3DObject.quaternion.set(originalSecondQuaternion.x, originalSecondQuaternion.y, originalSecondQuaternion.z, originalSecondQuaternion.w);

                                this.performSceneActions(action, action.sceneActionConditionSetsToggle, actions);

                                this.requestAnimateIfNotRequested();
                            }
                        }
                    }
                }
            })
        });
    }

    private applyPerformanceSettings(performanceSettings: TPerformanceSettingsState) {
        //Max resolution
        if(!performanceSettings.maxResolutionToggle) {
            let width = Math.floor(this.canvas.clientWidth * window.devicePixelRatio);
            let height = Math.floor(this.canvas.clientHeight * window.devicePixelRatio);
            const ratio = height / width;
            if (width > this.config.maxResolution) {
                width = this.config.maxResolution;
                height = width * ratio;
            }
            if (height > this.config.maxResolution) {
                height = this.config.maxResolution;
                width = height / ratio;
            }
            this.composer.setSize(width, height, false);
        }
        else {
            let width = Math.floor(this.canvas.clientWidth * window.devicePixelRatio);
            let height = Math.floor(this.canvas.clientHeight * window.devicePixelRatio);

            this.composer.setSize(width, height, false);
        }

        //Occlusion
        this.composer.passes[1].enabled = performanceSettings.occlusion;

        //Occlusion Performance
        this.aoPass.setQualityMode(performanceSettings.occlusionPerformance);

        //Occlusion Half Resolution
        this.aoPass.configuration.halfRes = !performanceSettings.occlusionHighRes;

        this.requestAnimateIfNotRequested();
    }

    /**
     * Collects the members of every collection in DATA once, right after the glTF was loaded. Matching runs
     * over the scene instead of over `getObjectByName`, so name patterns work and objects survive a Blender
     * re-export that renames them. Object references stay valid when a scene action reparents an object,
     * so there is no need to resolve again on every toggle.
     * @private
     */
    private resolveCollections() {
        this.collectionObjects.clear();

        for(const collection of DATA.collections as ICollection[]) {
            const patterns = (collection.objects3DNamePatterns ?? []).map((pattern) => new RegExp(pattern, "i"));
            const excludedPatterns = (collection.excludedObjects3DNamePatterns ?? []).map((pattern) => new RegExp(pattern, "i"));
            const excludedNames = collection.excludedObjects3DNames ?? [];
            const explicitNames = collection.objects3DNames ?? [];
            const isExcluded = (name: string) => excludedNames.includes(name) || excludedPatterns.some((pattern) => pattern.test(name));
            const objects = new Set<Object3D>();

            this.scene.traverse((object) => {
                if(!object.name || isExcluded(object.name)) return;
                if(!explicitNames.includes(object.name) && !patterns.some((pattern) => pattern.test(object.name))) return;

                //A multi material object is imported as a Group of child meshes named after the mesh data
                //block, so the geometry can sit below the matching object. Take the subtree along, minus
                //whatever the collection excludes.
                object.traverse((child) => {
                    if(child !== object && isExcluded(child.name)) return;
                    objects.add(child);
                });
            });

            for(const objectName of explicitNames) {
                if(![...objects].some((object) => object.name === objectName)) {
                    this.log(`Collection "${collection.name}": object "${objectName}" not found in scene`);
                }
            }

            this.collectionObjects.set(collection.name, [...objects]);
            this.log(`Collection "${collection.name}": ${objects.size} objects`);
        }
    }

    /**
     * Shows/hides whole collections of objects (see DATA.collections). Toggles the render layer instead of
     * `visible`: a hidden object neither renders nor takes part in raycasts, and hiding stays limited to the
     * resolved members - `visible = false` would always take the whole subtree along.
     * @private
     */
    private applyCollectionVisibility(hiddenCollectionNames: string[]) {
        this.collectionObjects.forEach((objects, collectionName) => {
            const layer = hiddenCollectionNames.includes(collectionName) ? ThreeD.HIDDEN_LAYER : 0;
            for(const object of objects) {
                object.layers.set(layer);
            }
        });

        this.requestAnimateIfNotRequested();
    }

    /**
     * Is only performed once on initialization. Checks for all actions that have activated set to true and
     */
    private handleInitialActionsSynchronization() {
        const actions = useActionsStore.getState().actions;
        actions.forEach((action, actionIndex) => {
            if(isIActionPlace(action)) {
                this.handlePlaceActionChange(action, actions);
            }
            if(isIActionAutoPlace(action)) {
                this.handleAutoPlaceActionChange(action, actions);
            }
            if(isIAction3D(action)) {
                this.handle3DActionChange(action, actions)
            }
        })
    }

    private handle3DActionChange(action: IAction3D, actions: TAction[]) {
        if(action.toggle) {
            if(action.activated === false) {
                this.performSceneActions(action, action.sceneActionConditionSetsToggle, actions);
            }
            else {
                this.performSceneActions(action, action.sceneActionConditionSets, actions);
            }
        }
    }

    private handlePlaceActionChange(action: IActionPlace, actions: TAction[]) {
        if(action.activated === false) {
            this.performSceneActions(action, action.sceneActionConditionSetsToggle, actions);
        }
        else {
            const pickedLocationInteractiveObjectName = action.pickedLocationInteractiveObjectName;
            const sceneActionConditionSetsToPerform = action.correctPlaceInteractiveObjects.find((correctConnectableObject) => correctConnectableObject.name === pickedLocationInteractiveObjectName)?.sceneActionConditionSets;

            if(sceneActionConditionSetsToPerform) {
                this.performSceneActions(action, sceneActionConditionSetsToPerform, actions);
            }
        }
    }

    private handleAutoPlaceActionChange(action: IActionAutoPlace, actions: TAction[], previousActions?: TAction[]) {
        if(action.activated === false) {
            this.performSceneActions(action, action.sceneActionConditionSetsToggle, actions);
        }
        else {
            const pickedLocationInteractiveObjectName = action.pickedLocationInteractiveObjectName;
            const sceneActionConditionSetsToPerform = action.correctPlaceInteractiveObjects.find((correctPlaceObject) => correctPlaceObject.name === pickedLocationInteractiveObjectName)?.sceneActionConditionSets;

            if(sceneActionConditionSetsToPerform) {
                // If the object was placed at a non-target location in the previous state
                // (e.g., attached to a car door), reparent it back to the scene first so the
                // target's world-space position/quaternion apply correctly. We only run the
                // `setParent` sub-actions from the sibling place action's toggle — running
                // the full toggle would kick off a competing scale→0 tween that fights the
                // target's scale→1.
                if(previousActions) {
                    const interactiveObject = DATA.interactiveObjects.find(io => (io.actions as string[]).includes(action.name));
                    if(interactiveObject) {
                        const siblingPlaceName = interactiveObject.actions.find(n => {
                            const a = actions.find(a => a.name === n);
                            return a && isIActionPlace(a);
                        });
                        if(siblingPlaceName) {
                            const prevSiblingPlace = previousActions.find(a => a.name === siblingPlaceName);
                            if(prevSiblingPlace && isIActionPlace(prevSiblingPlace)
                                && prevSiblingPlace.activated
                                && prevSiblingPlace.pickedLocationInteractiveObjectName !== pickedLocationInteractiveObjectName) {
                                const reparentOnly = prevSiblingPlace.sceneActionConditionSetsToggle.map(set => ({
                                    ...set,
                                    sceneActions: set.sceneActions.filter(sa => isISceneActionSetParent(sa))
                                }));
                                this.performSceneActions(prevSiblingPlace, reparentOnly, actions);
                            }
                        }
                    }
                }
                this.performSceneActions(action, sceneActionConditionSetsToPerform, actions);
            }
        }
    }

    /**
     * Applies hovered material to objects that are hovered over and removes it from the previously hovered object
     */
    private handleHoveredInteractiveObjectChange(hoveredInteractiveObjectName: string) {
        if(hoveredInteractiveObjectName === this.lastHoveredInteractiveObjectName) return;
        const interactiveObjects = DATA.interactiveObjects;

        let intersectionObjectSetKey = "navigation";
        if(useGlobalStore.getState().activePlaceActionName !== "") {
            intersectionObjectSetKey = "place";
        }
        if(useGlobalStore.getState().activeUseActionName !== "") {
            intersectionObjectSetKey = "use";
        }
        if(useGlobalStore.getState().activeConnectDisconnectDuspolActionName !== "") {
            intersectionObjectSetKey = "connectDuo";
        }
        if(useGlobalStore.getState().activeConnectDisconnectMultimeterActionName !== "") {
            intersectionObjectSetKey = "connectMultimeter";
        }

        if(this.lastHoveredInteractiveObjectName !== "") {
            const interactiveObject = interactiveObjects.filter((o) => o.name === this.lastHoveredInteractiveObjectName)[0];
            const hoverStyleChangeObjectsNames = interactiveObject.hoverStyleChangeObjectsNames;
            const threeDObjects = this.intersectionObjectSets[intersectionObjectSetKey].filter((o) => hoverStyleChangeObjectsNames.includes(o.name));
            if(!threeDObjects) return;

            threeDObjects.forEach((threeDObject) => {
                this.applyHoverStyle(threeDObject, null);
                this.requestAnimateIfNotRequested();
            });
        }

        if(hoveredInteractiveObjectName !== "") {
            const interactiveObject = interactiveObjects.filter((o) => o.name === hoveredInteractiveObjectName)[0];
            const hoverStyleChangeObjectsNames = interactiveObject.hoverStyleChangeObjectsNames;
            const threeDObjects = this.intersectionObjectSets[intersectionObjectSetKey].filter((o) => hoverStyleChangeObjectsNames.includes(o.name));
            if(!threeDObjects) return;

            threeDObjects.forEach((threeDObject) => {
                this.applyHoverStyle(threeDObject, this.hoverMaterial);
                this.requestAnimateIfNotRequested();
            });
        }
        this.lastHoveredInteractiveObjectName = hoveredInteractiveObjectName;
    }

    /**
     * Applies a material to a mesh or, for a multi material object imported as a Group, to all of its child
     * meshes. Passing null restores the material saved in userData.originalMaterial.
     * @param object {Object3D}
     * @param material {Material | null}
     * @private
     */
    private applyHoverStyle(object: Object3D, material: Material | null): void {
        object.traverse((child) => {
            const mesh = child as Mesh;
            if(!mesh.isMesh) return;

            const newMaterial = material ?? mesh.userData.originalMaterial;
            if(newMaterial) {
                mesh.material = newMaterial;
            }
        });
    }

    /**
     * Determines which pin - if any - sits under the pointer and publishes its name for the tooltip. Expects the
     * raycaster to be set from the camera already.
     *
     * Pins are small and sit close to the surface of their component, so a hit alone would also fire through a
     * closed hood. Objects of the navigation set (body panels, lids, covers) therefore count as occluders: is one
     * of them in front of the pin, the pin is not visible and stays untouched. The epsilon keeps a pin that is an
     * interactive object itself - it shows up in both sets at the same distance.
     * @private
     */
    private updateHoveredPin(): void {
        const pinIntersects = this.Raycaster.intersectObjects(this.intersectionObjectSets.pins, true);
        let hoveredPinObject: Object3D | null = null;

        if(pinIntersects.length > 0) {
            const occluderIntersects = this.Raycaster.intersectObjects(this.intersectionObjectSets.navigation, true);
            const pinIsVisible = occluderIntersects.length === 0 || occluderIntersects[0].distance > pinIntersects[0].distance - 0.0001;
            if(pinIsVisible) {
                hoveredPinObject = this.findPinObject(pinIntersects[0].object);
            }
        }

        this.setHoveredPin(hoveredPinObject);
    }

    /**
     * Applies the hover style to the newly hovered pin, restores the previous one and publishes the pin name.
     * @param pinObject {Object3D | null}
     * @private
     */
    private setHoveredPin(pinObject: Object3D | null): void {
        if(pinObject === this.hoveredPinObject) return;

        if(this.hoveredPinObject) {
            this.applyHoverStyle(this.hoveredPinObject, null);
        }
        if(pinObject) {
            this.applyHoverStyle(pinObject, this.hoverMaterial);
        }

        this.hoveredPinObject = pinObject;
        useGlobalStore.setState({hoveredPinName: pinObject ? ThreeD.getPinName(pinObject.name) : ""});
        this.requestAnimateIfNotRequested();
    }

    /**
     * Returns the pin an intersection belongs to. A multi material pin is imported as a Group of child meshes
     * named after the mesh data block, so the name has to be looked up on the ancestors.
     * @param object {Object3D}
     * @private
     */
    private findPinObject(object: Object3D): Object3D | null {
        let current: Object3D | null = object;
        while(current) {
            if(ThreeD.PIN_NAME_PATTERN.test(current.name)) return current;
            current = current.parent;
        }
        return null;
    }

    /**
     * Extracts the displayed pin name out of an object name: everything behind "-pin-" / "-pin_".
     * A trailing block of three digits is dropped - Blender numbers duplicates ("o-bms-pin-can_high.001"), and the
     * glTF loader turns that into "...can_high001". Only names with at least three trailing digits are shortened,
     * so a genuine number stays intact ("...batmodul10" keeps its 10, "...batmodul1001" becomes "batmodul1").
     * @param objectName {string}
     * @private
     */
    private static getPinName(objectName: string): string {
        const pinName = objectName.match(ThreeD.PIN_NAME_PATTERN)?.[1] ?? objectName;
        return pinName.replace(/(\d{3,})$/, (digits) => digits.slice(0, -3));
    }

    /**
     * Returns the name a raycast hit belongs to. A multi material object is imported as a Group of child meshes
     * named after the mesh data block, so the interactive name is saved on them in userData.interactionName
     * while loading.
     * @param object {Object3D}
     * @private
     */
    private getInteractionName(object: Object3D): string {
        return object.userData.interactionName ?? object.name;
    }

    /**
     * Logging function. Disabled by setting config.debug to false
     * @param s {string}
     * @private
     */
    private log(s: string): void {
        if (this.config.debug && window.console && window.console.log) {
            window.console.log.apply(window.console, [s]);
        }
    }

    /**
     * Loads GLTF and HDR files
     * @private
     */
    private loadObjects(): void {
        this.log("load");
        this.RGBELoader.load(
            "env.hdr",
            this.handleRGBELoaded,
            this.handleRGBELoadingProgress,
            (error) => this.handleLoadError("RGBE (env.hdr)", error)
        );
        this.GLTFLoader.load(
            import.meta.env.BASE_URL + "objects/car.glb",
            this.handleGLTFLoaded,
            this.handleGLTFLoadingProgress,
            (error) => this.handleLoadError("GLTF (car.glb)", error)
        );

        this.loadingTimeout = setTimeout(() => {
            if (!this.loadingStats.gltfWasLoaded || !this.loadingStats.rgbeWasLoaded) {
                console.error("Loading timeout");
                useGlobalStore.setState({loadingFailed: true});
            }
        }, 30000);
    }

    /**
     * Loading progress handler for RGBE-texture loader (env-texture)
     */
    private handleRGBELoadingProgress(request: any): void {
        this.handleAnyLoadingProgress({
            type: "rgbe",
            total: request.total,
            loaded: request.loaded,
        });
    }

    /**
     * Loading progress handler for GLTF-loader (main model file)
     * @param request
     * @private
     */
    private handleGLTFLoadingProgress(request: any): void {
        this.handleAnyLoadingProgress({
            type: "gltf",
            total: request.total,
            loaded: request.loaded,
        });
    }

    /**
     * Calculates data from all loading processes and sends data to consumer
     * @param payload
     * @private
     */
    private handleAnyLoadingProgress(payload: {
        type: "gltf" | "rgbe";
        total: number;
        loaded: number;
    }) {
        switch (payload.type) {
            case "gltf":
                this.loadingStats.gltfLoaded = payload.loaded;
                //this.loadingStats.gltfTotal = payload.total;
                break;
            case "rgbe":
                this.loadingStats.rgbeLoaded = payload.loaded;
                //this.loadingStats.rgbeTotal = payload.total;
                break;
        }
        //console.log('rgbe: ', this.loadingStats.rgbeLoaded, 'gltf: ', this.loadingStats.gltfLoaded);
        useGlobalStore.setState({
            loadedPercentage: Math.floor(
                ((this.loadingStats.rgbeLoaded + this.loadingStats.gltfLoaded) /
                    (this.loadingStats.rgbeTotal + this.loadingStats.gltfTotal)) *
                100
            ),
        });
    }

    /**
     * Handler for RGBELoader "loaded" event
     * @param texture
     * @private
     */
    private handleRGBELoaded(texture: Texture) {
        const gen = new PMREMGenerator(this.renderer);
        this.envTexture = gen.fromEquirectangular(texture).texture;
        this.scene.environment = this.envTexture;
        this.loadingStats.rgbeWasLoaded = true;
        this.handleAnyObjectHasLoaded();
    }

    /**
     * Handler for GLTF-Loader "loaded" event. Traverses scene and connects meshes, materials, animations
     * to class properties
     * @param gltf
     * @private
     */
    private handleGLTFLoaded(gltf: GLTF) {
        this.scene.add(gltf.scene);

        const aspectRatio = this.canvas.clientWidth / this.canvas.clientHeight;
        const zoom = mapRange(
            aspectRatio,
            this.config.containObjectInViewParams.portraitAspectRatio,
            this.config.containObjectInViewParams.portraitZoom,
            this.config.containObjectInViewParams.landscapeAspectRatio,
            this.config.containObjectInViewParams.landscapeZoom
        );

        this.userCamera.aspect = aspectRatio;
        this.userCamera.zoom = zoom;
        this.userCamera.updateProjectionMatrix();

        this.scene.traverse((object) => {
            if (object.type === "Mesh" || object.type === "Object3D" || object.type === "Group") {
                const mesh = object as Mesh;
                mesh.castShadow = false;
                mesh.receiveShadow = false;
                mesh.frustumCulled = false;
                if (mesh.material && !Array.isArray(mesh.material)) {
                    const material = mesh.material as (MeshStandardMaterial | MeshPhysicalMaterial);
                    let materialExists = false;
                    for (let i = 0; i < this.materialList.length; i++) {
                        if (this.materialList[i].name === material.name) {
                            materialExists = true;
                            break;
                        }
                    }
                    if (!materialExists) {
                        if(material.name.startsWith("m-env")) {
                            const newMaterial = new MeshBasicMaterial();
                            newMaterial.map = material.emissiveMap;
                            newMaterial.color = new Color(1.0,1.0,1.0);
                            newMaterial.aoMap = material.aoMap;
                            newMaterial.name = material.name;
                            newMaterial.aoMapIntensity = 0.5;
                            mesh.material = newMaterial;
                        }
                        else {
                            mesh.material.userData["originalColor"] = material.color.clone();
                            (mesh.material as MeshPhysicalMaterial).aoMap = null;

                            if(mesh.material.name === "m-displays") {
                                (mesh.material as MeshPhysicalMaterial).emissive = new Color(0,0,0);
                                (mesh.material as MeshPhysicalMaterial).color = new Color(0,0,0);
                            }
                        }
                        this.materialList.push(mesh.material);
                    }
                    else {
                        const newMaterial = this.materialList.find((m) => m.name === material.name);
                        if(newMaterial) {
                            mesh.material = newMaterial;
                        }
                    }
                }

                //Save original transform
                object.userData["originalTransform"] = object.matrix.clone();
                //Save original scale separately - scene actions can animate back to it ("value": "original")
                object.userData["originalScale"] = object.scale.clone();
                //Save original parent
                object.userData["originalParentName"] = object.parent.name;

                //Add to intersection objects
                //Iterate through all DATA.interactiveObjects and check if the object is in DATA.interactiveObjects[index].objects3DNames
                //If yes, add it to the intersectionObjects array.

                for(let i = 0; i < DATA.interactiveObjects.length; i++) {
                    const interactiveObject = DATA.interactiveObjects[i] as IInteractiveObjectRaw;
                    if(interactiveObject.objects3DNames.includes(object.name)) {
                        this.intersectionObjectSets.navigation.push(object);
                        //An object with more than one material is exported as one glTF primitive per material and
                        //imported as a Group of child meshes named after the mesh data block. Remember the
                        //interactive name on all children, so raycast hits on them can be mapped back to it.
                        object.traverse((child) => {
                            child.userData["interactionName"] = object.name;
                        });
                    }
                }

                //Add to the pin set. Matched by name pattern instead of a list in data.json, so pins added or
                //renamed by a Blender re-export are picked up automatically.
                if(ThreeD.PIN_NAME_PATTERN.test(object.name)) {
                    this.intersectionObjectSets.pins.push(object);
                }
            }
            if(object.userData.intersectionHelper) {
                object.visible = false;
                this.intersectionObjectSets.navigation.push(object);
            }
            if (object.userData && object.userData.hidden) {
                object.scale.set(0,0,0);
            }
            if (object.userData && object.userData.invisible) {
                object.visible = false;
            }
        });

        //Remember the materials used to restore the style after hovering. This is a separate pass, because the
        //traverse above may replace a material with the shared instance from this.materialList and visits the
        //children of a multi material object only after the object itself.
        this.scene.traverse((object) => {
            let needsOriginalMaterial = ThreeD.PIN_NAME_PATTERN.test(object.name);

            for(let i = 0; i < DATA.interactiveObjects.length; i++) {
                const interactiveObject = DATA.interactiveObjects[i] as IInteractiveObjectRaw;
                if(interactiveObject.hoverStyleChangeObjectsNames.includes(object.name)) {
                    needsOriginalMaterial = true;
                    break;
                }
            }

            if(needsOriginalMaterial) {
                object.traverse((child) => {
                    const mesh = child as Mesh;
                    if(mesh.isMesh) {
                        mesh.userData["originalMaterial"] = mesh.material;
                    }
                });
            }
        });

        this.resolveCollections();
        this.applyCollectionVisibility(useGlobalStore.getState().hiddenCollectionNames);

        //Cam Target Helper
        const camTargetGeometry1 = new BoxGeometry(0.02, 4.0, 0.02);
        const camTargetGeometry2 = new BoxGeometry(4.0, 0.02, 0.02);
        const camTargetGeometry3 = new BoxGeometry(0.02, 0.02, 4.0);
        const camTargetMaterial = new MeshBasicMaterial({
            color: new Color(0.0, 1.0, 0.0),
            name: "camTargetMaterial",
        });
        const camTargetMesh1 = new Mesh(camTargetGeometry1, camTargetMaterial);
        const camTargetMesh2 = new Mesh(camTargetGeometry2, camTargetMaterial);
        const camTargetMesh3 = new Mesh(camTargetGeometry3, camTargetMaterial);
        this.camTargetHelper = new Group();
        this.camTargetHelper.add(camTargetMesh1);
        this.camTargetHelper.add(camTargetMesh2);
        this.camTargetHelper.add(camTargetMesh3);
        this.scene.add(this.camTargetHelper);
        this.camTargetHelper.visible = this.config.showCamTarget;

        //TestCube
        /*
            const geometry = new BoxGeometry(0.2, 0.2, 0.2);
            const material = new MeshBasicMaterial({ color: 0x00ff00 });
            const cube = new Mesh(geometry, material);
            this.scene.add(cube);

             */

        this.loadingStats.gltfWasLoaded = true;
        this.handleAnyObjectHasLoaded();
    }

    /**
     * Is triggered on each "loaded"-event by all Loaders and determines whether all loaders are done and
     * tells the consumer
     * @private
     */
    private handleLoadError(assetName: string, error: unknown): void {
        console.error(`Failed to load asset: ${assetName}`, error);
        useGlobalStore.setState({loadingFailed: true});
    }

    private handleAnyObjectHasLoaded(): void {
        if (this.loadingStats.gltfWasLoaded && this.loadingStats.rgbeWasLoaded) {
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            useGlobalStore.setState({isLoading: false});

            this.handleInitialActionsSynchronization();
            this.subscribeToState();

            this.requestAnimateIfNotRequested();
        }
    }

    /**
     * Event handler for a resize event on window
     * @private
     */
    private handleResize(): void {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            const performanceSettings = usePerformanceSettings.getState();
            const aspectRatio = this.canvas.clientWidth / this.canvas.clientHeight;
            const zoom = mapRange(
                aspectRatio,
                this.config.containObjectInViewParams.portraitAspectRatio,
                this.config.containObjectInViewParams.portraitZoom,
                this.config.containObjectInViewParams.landscapeAspectRatio,
                this.config.containObjectInViewParams.landscapeZoom
            );

            this.userCamera.aspect = aspectRatio;
            this.userCamera.zoom = zoom;
            this.userCamera.updateProjectionMatrix();

            let width = Math.floor(this.canvas.clientWidth * window.devicePixelRatio);
            let height = Math.floor(this.canvas.clientHeight * window.devicePixelRatio);
            const ratio = height / width;

            if(!performanceSettings.maxResolutionToggle) {
                if (width > this.config.maxResolution) {
                    width = this.config.maxResolution;
                    height = width * ratio;
                }
                if (height > this.config.maxResolution) {
                    height = this.config.maxResolution;
                    width = height / ratio;
                }
            }

            this.composer.setSize(width, height, false);

            this.requestAnimateIfNotRequested();
        }, 10);
    }

    private updatePointerPosition(event: PointerEvent) {
        if(!event.isPrimary) return;

        this.pointerPosition.x = (event.clientX / this.canvas.clientWidth) * 2 - 1;
        this.pointerPosition.y = - (event.clientY / this.canvas.clientHeight) * 2 + 1;
    }

    private handlePointerOut = (event: PointerEvent) => {
        useGlobalStore.setState({hoveredInteractiveObjectName: ""});
        this.setHoveredPin(null);
    }

    private handlePointerMove = (event: PointerEvent) => {
        this.updatePointerPosition(event);

        //Do nothing if in inspect mode or equipment test mode
        if(useGlobalStore.getState().activeInspectActionName === "" && useGlobalStore.getState().activeEquipmentTestActionName === "") {
            if(this.pointerIsDown) {
                const pointerDragDelta = this.pointerDownPosition.ndc.distanceTo(this.pointerPosition);
                if(pointerDragDelta > 0.05) {
                    this.userIsDragging = true;
                    useGlobalStore.setState({hoveredInteractiveObjectName: ""});
                    this.setHoveredPin(null);
                }
            }

            if(!this.userIsDragging) {
                let intersectionObjectSetKey = "navigation";
                if(useGlobalStore.getState().activePlaceActionName !== "") {
                    intersectionObjectSetKey = "place";
                }
                if(useGlobalStore.getState().activeConnectDisconnectDuspolActionName !== "") {
                    intersectionObjectSetKey = "connectDuo";
                }
                if(useGlobalStore.getState().activeConnectDisconnectMultimeterActionName !== "") {
                    intersectionObjectSetKey = "connectMultimeter";
                }

                this.Raycaster.setFromCamera(this.pointerPosition, this.userCamera);

                //Runs before the interactive object handling below - that one returns early in several branches
                this.updateHoveredPin();

                const intersects = this.Raycaster.intersectObjects(this.intersectionObjectSets[intersectionObjectSetKey], true);

                if(intersects.length > 0) {
                    const hoveredInteractiveObjectName = useGlobalStore.getState().hoveredInteractiveObjectName;
                    const activeInteractiveObjectName = useGlobalStore.getState().activeInteractiveObjectName;
                    const intersectionName = this.getInteractionName(intersects[0].object);
                    //Check if the intersected name is part of DATA.interactiveObjects[index].objects3DNames and if so, set DATA.interactiveObjects[index].name as hoveredInteractiveObjectName
                    let foundHoveredInteractiveObject = false;
                    for(let i=0; i < DATA.interactiveObjects.length; i++) {
                        if(DATA.interactiveObjects[i].objects3DNames.includes(intersectionName)) {
                            if(hoveredInteractiveObjectName === DATA.interactiveObjects[i].name) return;
                            if(activeInteractiveObjectName === DATA.interactiveObjects[i].name) return;
                            if(intersectionObjectSetKey === "navigation" && !DATA.interactiveObjects[i].focusableWhileNavigating) {
                                useGlobalStore.setState({hoveredInteractiveObjectName: ""});
                                return;
                            }
                            else {
                                foundHoveredInteractiveObject = true;
                                useGlobalStore.setState({hoveredInteractiveObjectName: DATA.interactiveObjects[i].name});
                                return;
                            }
                        }
                    }
                    if(!foundHoveredInteractiveObject) {
                        useGlobalStore.setState({hoveredInteractiveObjectName: ""});
                    }
                }
                else {
                    useGlobalStore.setState({hoveredInteractiveObjectName: ""});
                }
            }
        }
        else {
            this.setHoveredPin(null);
        }
    }

    private handlePointerDown = (event: PointerEvent) => {
        this.pointerIsDown = true;
        this.pointerDownPosition.ndc.x = (event.clientX / this.canvas.clientWidth) * 2 - 1;
        this.pointerDownPosition.ndc.y = -(event.clientY / this.canvas.clientHeight) * 2 + 1;
        this.pointerDownPosition.screen.x = event.clientX;
        this.pointerDownPosition.screen.y = event.clientY;

        if(useGlobalStore.getState().activeInspectActionName === "") {
            useGlobalStore.setState({
                activeInteractiveObjectName: ""
            });
        }
    }

    private handlePointerUp = (event: PointerEvent) => {
        this.pointerIsDown = false;

        //Case not inspect mode, not place mode, not use mode, not connectDisconnectDuspol mode, not connectDisconnectMultimeter mode
        if(useGlobalStore.getState().activeInspectActionName === "" && useGlobalStore.getState().activePlaceActionName === "" && useGlobalStore.getState().activeUseActionName === "" && useGlobalStore.getState().activeConnectDisconnectDuspolActionName === "" && useGlobalStore.getState().activeConnectDisconnectMultimeterActionName === "") {
            if(!this.userIsDragging) {
                this.Raycaster.setFromCamera(this.pointerPosition, this.userCamera);
                const intersects = this.Raycaster.intersectObjects(this.intersectionObjectSets.navigation, true);
                if(intersects.length > 0) {
                    for(let i=0; i < DATA.interactiveObjects.length; i++) {
                        const interactiveObject = DATA.interactiveObjects[i];
                        if(interactiveObject.objects3DNames.includes(this.getInteractionName(intersects[0].object)) && interactiveObject.focusableWhileNavigating) {
                            useGlobalStore.setState({
                                activeInteractiveObjectName: DATA.interactiveObjects[i].name,
                                lastPointerUpCoordinates: {x: this.pointerDownPosition.screen.x, y: this.pointerDownPosition.screen.y},
                                hoveredInteractiveObjectName: ""
                            });

                            return;
                        }
                    }
                }
            }
        }
        //Case connect mode
        else if(useGlobalStore.getState().activePlaceActionName !== "") {
            if(!this.userIsDragging) {
                this.Raycaster.setFromCamera(this.pointerPosition, this.userCamera);
                const intersects = this.Raycaster.intersectObjects(this.intersectionObjectSets.place, true);
                if(intersects.length > 0) {
                    const currentPlaceAction = useActionsStore.getState().actions.find((action) => action.name === useGlobalStore.getState().activePlaceActionName);

                    if(isIActionPlace(currentPlaceAction)) {
                        if(useGlobalStore.getState().activePlaceActionCallback) {
                            useGlobalStore.getState().activePlaceActionCallback(this.getInteractionName(intersects[0].object));
                        }
                    }
                }
            }
        }
        //Case use mode
        else if(useGlobalStore.getState().activeUseActionName !== "") {
            if(!this.userIsDragging) {
                this.Raycaster.setFromCamera(this.pointerPosition, this.userCamera);
                const intersects = this.Raycaster.intersectObjects(this.intersectionObjectSets.use, true);
                if(intersects.length > 0) {
                    if(useGlobalStore.getState().activeUseActionCallback) {
                        useGlobalStore.getState().activeUseActionCallback(this.getInteractionName(intersects[0].object));
                    }
                }
            }
        }
        //Case connectDisconnectDuspol mode
        else if(useGlobalStore.getState().activeConnectDisconnectDuspolActionName !== "") {
            if(!this.userIsDragging) {
                this.Raycaster.setFromCamera(this.pointerPosition, this.userCamera);
                const intersects = this.Raycaster.intersectObjects(this.intersectionObjectSets.connectDuo, true);
                if(intersects.length > 0) {
                    const currentConnectDisconnectDuspolAction = useActionsStore.getState().actions.find((action) => action.name === useGlobalStore.getState().activeConnectDisconnectDuspolActionName);

                    if(isIActionConnectDisconnectDuspol(currentConnectDisconnectDuspolAction)) {
                        if(useGlobalStore.getState().activeConnectDisconnectDuspolActionCallback) {
                            useGlobalStore.getState().activeConnectDisconnectDuspolActionCallback(this.getInteractionName(intersects[0].object));
                        }
                    }
                }
            }
        }
        //Case connectDisconnectMultimeter mode
        else if(useGlobalStore.getState().activeConnectDisconnectMultimeterActionName !== "") {
            if(!this.userIsDragging) {
                this.Raycaster.setFromCamera(this.pointerPosition, this.userCamera);
                const intersects = this.Raycaster.intersectObjects(this.intersectionObjectSets.connectMultimeter, true);
                if(intersects.length > 0) {
                    const currentConnectDisconnectMultimeterAction = useActionsStore.getState().actions.find((action) => action.name === useGlobalStore.getState().activeConnectDisconnectMultimeterActionName);

                    if(isIActionConnectDisconnectMultimeter(currentConnectDisconnectMultimeterAction)) {
                        if(useGlobalStore.getState().activeConnectDisconnectMultimeterActionCallback) {
                            useGlobalStore.getState().activeConnectDisconnectMultimeterActionCallback(this.getInteractionName(intersects[0].object));
                        }
                    }
                }
            }
        }

        this.userIsDragging = false;
    }

    /**
     * `actions` is the snapshot the action was triggered with - it decides which condition sets apply and must
     * stay as it was at trigger time. The animation state written from the gsap callbacks below must NOT come
     * from that snapshot: those callbacks fire one or more frames later, and writing a stale array back into the
     * store discards everything that happened in between (e.g. the first contact point of a duspol connection).
     * They therefore read the current state at callback time.
     * @private
     */
    private performSceneActions(action: (IAction3D | IActionPlace | IActionAutoPlace | IActionConnectDisconnectDuspol | IActionConnectDisconnectMultimeter | IActionEquipmentTest), sceneActionConditionSets: ISceneActionConditionSet[], actions: TAction[]) {
        sceneActionConditionSets.forEach(set => {
            const jsepTree = jsep(set.condition);
            const conditionsMet = evaluateJsepTree(jsepTree, actions);

            if(conditionsMet) {
                for (let i = 0; i < set.sceneActions.length; i++) {
                    const currentSceneAction = set.sceneActions[i];
                    if(isISceneActionParameterAnimation(currentSceneAction)) {
                        if(currentSceneAction.objectName) {
                            const mesh = this.scene.getObjectByName(currentSceneAction.objectName);
                            if (mesh) {
                                //CASE ROTATION
                                if (currentSceneAction.parameter.startsWith("rotation")) {
                                    //@ts-ignore
                                    let currentValue = getNestedProperty(mesh, currentSceneAction.parameter);

                                    let tempObj = {
                                        value: currentValue as number,
                                    };

                                    let rotationVector = new Vector3(0, 0, 0);
                                    tempObj.value = (tempObj.value * 180) / Math.PI;
                                    switch (currentSceneAction.parameter) {
                                        case "rotation.x":
                                            rotationVector = new Vector3(1, 0, 0);
                                            break;
                                        case "rotation.y":
                                            rotationVector = new Vector3(0, 1, 0);
                                            break;
                                        case "rotation.z":
                                            rotationVector = new Vector3(0, 0, 1);
                                            break;
                                    }


                                    gsap.to(tempObj, {
                                        value: currentSceneAction.value,
                                        duration: currentSceneAction.duration,
                                        ease: CustomEase.create(
                                            "custom",
                                            "M0,0,C0.28,0.02,0.194,1,1,1"
                                        ),
                                        onStart: () => {
                                            useActionsStore.setState({
                                                actions: setAnimationState(useActionsStore.getState().actions, action.name, EAnimationStates.IS_RUNNING),
                                            });
                                            this.requestAnimateIfNotRequested();
                                        },
                                        onUpdate: () => {
                                            mesh.setRotationFromAxisAngle(
                                                rotationVector,
                                                (tempObj.value * Math.PI) / 180
                                            );
                                            this.requestAnimateIfNotRequested();
                                        },
                                        onComplete: () => {
                                            useActionsStore.setState({
                                                actions: setAnimationState(useActionsStore.getState().actions, action.name, EAnimationStates.IDLE),
                                            });
                                        },
                                    });
                                }

                                //CASE POSITION
                                if (currentSceneAction.parameter.startsWith("position")) {

                                    let tempObj = {
                                        value: 0,
                                    };

                                    switch (currentSceneAction.parameter) {
                                        case "position.x":
                                            tempObj.value = mesh.position.x as number;
                                            break;
                                        case "position.y":
                                            tempObj.value = mesh.position.y as number;
                                            break;
                                        case "position.z":
                                            tempObj.value = mesh.position.z as number;
                                            break;
                                    }


                                    gsap.to(tempObj, {
                                        value: currentSceneAction.value,
                                        duration: currentSceneAction.duration,
                                        ease: CustomEase.create(
                                            "custom",
                                            "M0,0,C0.28,0.02,0.194,1,1,1"
                                        ),
                                        onStart: () => {
                                            useActionsStore.setState({
                                                actions: setAnimationState(useActionsStore.getState().actions, action.name, EAnimationStates.IS_RUNNING),
                                            });
                                            this.requestAnimateIfNotRequested();
                                        },
                                        onUpdate: () => {
                                            switch (currentSceneAction.parameter) {
                                                case "position.x":
                                                    mesh.position.x = tempObj.value;
                                                    break;
                                                case "position.y":
                                                    mesh.position.y = tempObj.value;
                                                    break;
                                                case "position.z":
                                                    mesh.position.z = tempObj.value;
                                                    break;
                                            }
                                            this.requestAnimateIfNotRequested();
                                        },
                                        onComplete: () => {
                                            useActionsStore.setState({
                                                actions: setAnimationState(useActionsStore.getState().actions, action.name, EAnimationStates.IDLE),
                                            });
                                        },
                                    });
                                }

                                //CASE SCALE
                                if (currentSceneAction.parameter.startsWith("scale")) {
                                    //@ts-ignore
                                    let currentValue = getNestedProperty(mesh, currentSceneAction.parameter);

                                    let tempObj = {
                                        scaleX: (currentValue as Vector3).x,
                                        scaleY: (currentValue as Vector3).y,
                                        scaleZ: (currentValue as Vector3).z
                                    };

                                    //"original" restores the scale the object was exported with. Objects can
                                    //carry a baked - sometimes mirrored, i.e. negative - scale from Blender,
                                    //and animating those to 1 would resize and flip them.
                                    const originalScale = mesh.userData["originalScale"] as Vector3 | undefined;
                                    const targetScale = currentSceneAction.value === "original"
                                        ? (originalScale ?? new Vector3(1, 1, 1))
                                        : new Vector3(currentSceneAction.value, currentSceneAction.value, currentSceneAction.value);

                                    gsap.to(tempObj, {
                                        scaleX: targetScale.x,
                                        scaleY: targetScale.y,
                                        scaleZ: targetScale.z,
                                        duration: currentSceneAction.duration,
                                        ease: CustomEase.create(
                                            "custom",
                                            "M0,0,C0.28,0.02,0.194,1,1,1"
                                        ),
                                        onStart: () => {
                                            useActionsStore.setState({
                                                actions: setAnimationState(useActionsStore.getState().actions, action.name, EAnimationStates.IS_RUNNING),
                                            });
                                            this.requestAnimateIfNotRequested();
                                        },
                                        onUpdate: () => {
                                            mesh.scale.set(tempObj.scaleX, tempObj.scaleY, tempObj.scaleZ);
                                            mesh.updateMatrix();

                                            this.requestAnimateIfNotRequested();
                                        },
                                        onComplete: () => {
                                            useActionsStore.setState({
                                                actions: setAnimationState(useActionsStore.getState().actions, action.name, EAnimationStates.IDLE),
                                            });
                                        },
                                    });
                                }

                                //CASE MORPHTARGET
                                if (currentSceneAction.parameter.startsWith("morphTargetInfluences")) {
                                    //@ts-ignore
                                    let currentValue = mesh.morphTargetInfluences[0];

                                    let tempObj = {
                                        value: currentValue
                                    };


                                    gsap.to(tempObj, {
                                        value: currentSceneAction.value,
                                        duration: currentSceneAction.duration,
                                        ease: CustomEase.create(
                                            "custom",
                                            "M0,0,C0.28,0.02,0.194,1,1,1"
                                        ),
                                        onStart: () => {
                                            useActionsStore.setState({
                                                actions: setAnimationState(useActionsStore.getState().actions, action.name, EAnimationStates.IS_RUNNING),
                                            });
                                            this.requestAnimateIfNotRequested();
                                        },
                                        onUpdate: () => {
                                            if((mesh as Mesh).morphTargetInfluences[0] !== undefined) {
                                                (mesh as Mesh).morphTargetInfluences[0] = tempObj.value;
                                                mesh.updateMatrix();
                                                this.requestAnimateIfNotRequested();
                                            }
                                        },
                                        onComplete: () => {
                                            useActionsStore.setState({
                                                actions: setAnimationState(useActionsStore.getState().actions, action.name, EAnimationStates.IDLE),
                                            });
                                        },
                                    });
                                }
                            }
                        }
                        if(currentSceneAction.materialNames) {
                            const materials = this.materialList.filter((material) => currentSceneAction.materialNames.includes(material.name));

                            if(materials) {
                                let currentValue = materials[0][currentSceneAction.parameter];
                                let tempObj = {
                                    value: currentValue
                                }

                                gsap.to(tempObj, {
                                    value: currentSceneAction.value,
                                    duration: currentSceneAction.duration,
                                    ease: CustomEase.create(
                                        "custom",
                                        "M0,0,C0.28,0.02,0.194,1,1,1"
                                    ),
                                    onStart: () => {
                                        useActionsStore.setState({
                                            actions: setAnimationState(useActionsStore.getState().actions, action.name, EAnimationStates.IS_RUNNING),
                                        });
                                        this.requestAnimateIfNotRequested();
                                    },
                                    onUpdate: () => {
                                        materials.forEach((material) => {
                                            material[currentSceneAction.parameter] = tempObj.value;
                                            material.needsUpdate = true;
                                        });
                                        this.requestAnimateIfNotRequested();
                                    },
                                    onComplete: () => {
                                        useActionsStore.setState({
                                            actions: setAnimationState(useActionsStore.getState().actions, action.name, EAnimationStates.IDLE),
                                        });
                                    },
                                });
                            }
                        }
                    }
                    if(isISceneActionColor(currentSceneAction)) {
                        let targetColor = new Color(0,0,0);

                        if (currentSceneAction.RGBValues) {
                            targetColor = new Color(
                                `rgb(${currentSceneAction.RGBValues[0]},${currentSceneAction.RGBValues[1]},${currentSceneAction.RGBValues[2]})`
                            );
                        }
                        else if (currentSceneAction.RGBValuesNormalized) {
                            targetColor = new Color(
                                currentSceneAction.RGBValuesNormalized[0],
                                currentSceneAction.RGBValuesNormalized[1],
                                currentSceneAction.RGBValuesNormalized[2]
                            );
                        }

                        currentSceneAction.materialNames.forEach((materialName) => {
                            const currentMaterial = this.materialList.find(
                                (x) => x.name === materialName
                            );
                            if (currentMaterial !== undefined) {
                                let currentColor = new Color(0,0,0);

                                currentColor = new Color(currentMaterial[currentSceneAction.parameterName].r, currentMaterial[currentSceneAction.parameterName].g, currentMaterial[currentSceneAction.parameterName].b);

                                const tempObj = {
                                    r: currentColor.r,
                                    g: currentColor.g,
                                    b: currentColor.b
                                }

                                gsap.to(tempObj, {
                                    r: targetColor.r,
                                    g: targetColor.g,
                                    b: targetColor.b,
                                    duration: currentSceneAction.duration ? currentSceneAction.duration : 1,
                                    ease: CustomEase.create(
                                        "custom",
                                        "M0,0,C0.28,0.02,0.194,1,1,1"
                                    ),
                                    onStart: () => {
                                        useActionsStore.setState({
                                            actions: setAnimationState(useActionsStore.getState().actions, action.name, EAnimationStates.IS_RUNNING),
                                        });
                                        this.requestAnimateIfNotRequested();
                                    },
                                    onUpdate: () => {
                                        currentMaterial[currentSceneAction.parameterName] = new Color(tempObj.r, tempObj.g, tempObj.b);
                                        currentMaterial.needsUpdate = true;
                                        this.requestAnimateIfNotRequested();
                                    },
                                    onComplete: () => {
                                        useActionsStore.setState({
                                            actions: setAnimationState(useActionsStore.getState().actions, action.name, EAnimationStates.IDLE),
                                        });
                                    },
                                })
                            }
                        });
                    }
                    if(isISceneActionTexture(currentSceneAction)) {
                        const textureFileName = currentSceneAction.textureFileName;
                        const repeatU = currentSceneAction.repeatU;
                        const repeatV = currentSceneAction.repeatV;
                        const textureProperty = currentSceneAction.textureProperty;

                        currentSceneAction.materialNames.forEach((materialName) => {
                            const currentMaterial = this.materialList.find((x) => x.name === materialName);
                            if (currentMaterial !== undefined) {
                                if (this.textures[removeExtension(textureFileName)] !== undefined) {
                                    this.textures[removeExtension(textureFileName)].repeat.x =
                                        repeatU;
                                    this.textures[removeExtension(textureFileName)].repeat.y =
                                        repeatV;
                                    currentMaterial[textureProperty] =
                                        this.textures[removeExtension(textureFileName)];
                                    currentMaterial.needsUpdate = true;
                                }
                                else {
                                    this.textureLoader.load(textureFileName, (texture) => {
                                        this.textures[removeExtension(textureFileName)] = texture;
                                        this.textures[removeExtension(textureFileName)].flipY = false;
                                        this.textures[removeExtension(textureFileName)].wrapS = RepeatWrapping;
                                        this.textures[removeExtension(textureFileName)].wrapT = RepeatWrapping;
                                        this.textures[removeExtension(textureFileName)].repeat.x = repeatU;
                                        this.textures[removeExtension(textureFileName)].repeat.y = repeatV;
                                        this.textures[removeExtension(textureFileName)].colorSpace = SRGBColorSpace;
                                        currentMaterial[textureProperty] = this.textures[removeExtension(textureFileName)];
                                        currentMaterial.needsUpdate = true;
                                        this.requestAnimateIfNotRequested();
                                    });
                                }
                            }
                        });
                    }
                    if(isISceneActionSetBlenderPosition(currentSceneAction)) {
                        const threeDObjectToSet = this.scene.getObjectByName(currentSceneAction.objectName);
                        if(threeDObjectToSet) {
                            threeDObjectToSet.position.set(currentSceneAction.blenderPosition[0], currentSceneAction.blenderPosition[2], (currentSceneAction.blenderPosition[1])*-1);
                        }
                    }
                    if(isISceneActionSetBlenderQuaternion(currentSceneAction)) {
                        const threeDObjectToSet = this.scene.getObjectByName(currentSceneAction.objectName);
                        if(threeDObjectToSet) {
                            // Create quaternion from Blender values
                            const blenderQuat = new Quaternion(
                                currentSceneAction.blenderQuaternion[1],
                                currentSceneAction.blenderQuaternion[2],
                                currentSceneAction.blenderQuaternion[3],
                                currentSceneAction.blenderQuaternion[0]
                            );


                            const correctionQuat = new Quaternion();
                            const finalRotationQuat = new Quaternion();
                            const threeJsQuat = new Quaternion();

                            correctionQuat.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
                            threeJsQuat.multiplyQuaternions(correctionQuat, blenderQuat);

                            finalRotationQuat.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);

                            // Apply the final correction
                            threeJsQuat.multiply(finalRotationQuat);

                            threeDObjectToSet.quaternion.copy(threeJsQuat);
                        }
                    }
                    if(isISceneActionSetParent(currentSceneAction)) {
                        const objectToParent = this.scene.getObjectByName(currentSceneAction.objectName);
                        const parentObject = currentSceneAction.newParentName === "scene" ? this.scene : this.scene.getObjectByName(currentSceneAction.newParentName);

                        if(objectToParent && parentObject) {
                            const currentScale = objectToParent.scale.clone();
                            if(objectToParent.scale.x !== 1 || objectToParent.scale.y !== 1 || objectToParent.scale.z !== 1) {
                                objectToParent.scale.set(1,1,1);
                            }
                            parentObject.attach(objectToParent);
                            //Set scale back to original scale
                            objectToParent.scale.set(currentScale.x, currentScale.y, currentScale.z);
                        }
                    }
                    if(isISceneActionMultimeterDigits(currentSceneAction)) {
                        const object_base =this.scene.getObjectByName("o-multimeter-digits-base");
                        const object_0 =this.scene.getObjectByName("o-multimeter-digits-0");
                        const object_12 =this.scene.getObjectByName("o-multimeter-digits-12");
                        const object_87 =this.scene.getObjectByName("o-multimeter-digits-87");
                        const object_220 =this.scene.getObjectByName("o-multimeter-digits-220");
                        const object_230 =this.scene.getObjectByName("o-multimeter-digits-230");
                        const object_816 =this.scene.getObjectByName("o-multimeter-digits-816");

                        if(object_base && object_0 && object_12 && object_87 && object_220 && object_230 && object_816) {
                            object_base.visible = false;
                            object_0.visible = false;
                            object_12.visible = false;
                            object_87.visible = false;
                            object_220.visible = false;
                            object_230.visible = false;
                            object_816.visible = false;

                            //Set visibility of the current digit
                            switch(currentSceneAction.number) {
                                case 0: {
                                    object_0.visible = true;
                                    break;
                                }
                                case 12: {
                                    object_12.visible = true;
                                    break;
                                }
                                case 220: {
                                    object_220.visible = true;
                                    break;
                                }
                                case 230: {
                                    object_230.visible = true;
                                    break;
                                }
                                case 87: {
                                    object_87.visible = true;
                                    break;
                                }
                                case 816: {
                                    object_816.visible = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        })
    }

    private requestAnimateIfNotRequested() {
        if(!this.config.continuousRender) {
            if (!this.animateRequested) {
                this.animateRequested = true;
                cancelAnimationFrame(this.raf);
                this.raf = window.requestAnimationFrame(this.animate);
            }
        }
        else {
            if(!this.firstAnimateWasTriggered) {
                this.firstAnimateWasTriggered = true;
                this.animate();
            }
        }
    }

    /**
     * Main animation loop.
     */
    private animate(): void {
        if(this.config.continuousRender) {
            this.raf = window.requestAnimationFrame(this.animate);
        }
        this.animateRequested = false;
        this.clock.getDelta();

        if (this.controls.enabled) {
            this.controls.update();
        }
        if(this.spinControls) {
            this.spinControls.update();
        }

        this.composer.render();
        //console.log(this.renderer.info.render.calls);
        this.renderer.info.reset();
    }
}
