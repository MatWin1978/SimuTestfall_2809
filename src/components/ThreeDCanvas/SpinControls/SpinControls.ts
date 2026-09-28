import {EventDispatcher, Object3D, PerspectiveCamera, Quaternion, Ray, Sphere, Vector2, Vector3} from "three";

enum POINTER_SPHERE_MAPPING {
    SHOEMAKE = 'shoemake',
    HOLROYD = 'holroyd',
    AZIMUTHAL = 'azimuthal',
    RAYCAST = 'raycast'
}

const offTrackBallVelocityGainMap = {
    'shoemake': 20,
    'holroyd': 8,
    'azimuthal': 8,
    'raycast': 20
};

type MyEvents = { change: {}; start: {}; end: {} };

class SpinControls extends EventDispatcher<MyEvents> {
    public enabled = true;
    public rotateSensitivity = 1.0; // Keep at 1 for direct touching feel
    public relativelySpinOffTrackball = true; // Rotation continues relatively when pointer is beyond trackball
    public enableDamping = true; // True for movement with momentum after pointer release on control.update
    public dampingFactor = 5; // Increase for more friction
    public object: Object3D;
    public trackBallRadius: number;
    public camera: PerspectiveCamera
    public domElement: HTMLElement | Document;
    public screen = { left: 0, top: 0, width: 0, height: 0 };
    public spinAxisConstraint: Vector3 | undefined; // Set to a THREE.Vector3 to limit spinning to about an axis

    private _pointerMapping = POINTER_SPHERE_MAPPING.AZIMUTHAL;
    private _offTrackBallVelocityGain = offTrackBallVelocityGainMap[this._pointerMapping];
    private _pointerUpVelDamping = 2000;

    private _angularVelocity = new Vector3(0, 0, 0);
    private _lastQuaternion = new Quaternion();
    private _lastVelTime: number;
    private _deltaVelTime: number;
    private _deltaAngle: number;

    private _pointOnSphere = new Vector3();
    private _pointerScreen = new Vector2;
    private _pointOnSphereOld = new Vector3();
    private _lastPointerEventTime = 0;
    private _wasLastPointerEventOnSphere = false;
    private _isPointerDown = false;
    private _hasPointerMovedThisFrame = false;
    private _EPS = 0.000001;

    private changeEvent = { type: 'change' };
    private startEvent = { type: 'start' };
    private endEvent = { type: 'end' };

    private currentTime = 0;
    private lastTime = performance.now();
    private deltaTime = 0;

    private q0 = new Quaternion();
    private q1 = new Quaternion();
    private q0Conj = new Quaternion();

    private normalizedAxis = new Vector3();
    private quat = new Quaternion();

    private PISPoint = new Vector3();
    private PISObjPos = new Vector3();
    private PISObjToPointer = new Vector2();
    private PISCameraRot = new Quaternion();
    private PISTrackBallSphere = new Sphere();
    private PISRay = new Ray();

    private OTPObjPos = new Vector3();
    private OTPObjEdgePos = new Vector3();
    private OTPOffset = new Vector3();
    private OTPObjToPointer = new Vector2();
    private OTPCameraRot = new Quaternion();

    private pointerNdc = new Vector2();
    private objToPointer = new Vector2();
    private deltaMouse = new Vector2();
    private lastNdc = new Vector2();
    private objectPos = new Vector3();
    private objectToCamera = new Vector3();
    private polarVel = new Vector3();
    private lastPointOnSphere = new Vector3();

    constructor(object: Object3D, trackBallRadius: number, camera: PerspectiveCamera, domElement: HTMLElement) {
        super();

        this.object = object;
        this.trackBallRadius = trackBallRadius;
        this.camera = camera;
        this.domElement = ( domElement !== undefined ) ? domElement : document;

        this.update = this.update.bind(this);
        this.updateAngularVelocity = this.updateAngularVelocity.bind(this);
        this.getPointerInNDC = this.getPointerInNDC.bind(this);
        this.getObjectToPointer = this.getObjectToPointer.bind(this);
        this.getPointerInSphere = this.getPointerInSphere.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.setPointerToSphereMapping = this.setPointerToSphereMapping.bind(this);
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.cancelSpin = this.cancelSpin.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
        this.dispose = this.dispose.bind(this);

        this.domElement.addEventListener( 'mousedown', this.onMouseDown );

        this.domElement.addEventListener( 'touchstart', this.onTouchStart, {passive: false} );
        this.domElement.addEventListener( 'touchmove', this.onTouchMove, {passive: false} );
        this.domElement.addEventListener( 'touchend', this.onTouchEnd, {passive: false} );

        this.onWindowResize();
        this.update();
    }

    update() {
        this.currentTime = performance.now() / 1000.0;
        this.deltaTime = this.currentTime - this.lastTime;
        this.lastTime = this.currentTime;

        if( !this._isPointerDown && this.enableDamping ) {

            this._angularVelocity.multiplyScalar( 1 / ( this.deltaTime * this.dampingFactor + 1 ) );

            this.applyVelocity();

        }

        if( !this.enableDamping ) {

            this._lastVelTime = performance.now(); // ToDo Avoid this hack.  Causes trackball drift.

        }

        this._hasPointerMovedThisFrame = false;
    }

    updateAngularVelocity(p1: Vector3, p0: Vector3, timeDelta: number) {
        this.q0Conj.set(p0.x, p0.y, p0.z, 0.0)
        this.q0Conj.normalize();
        this.q0Conj.conjugate();
        this.q1.set(p1.x, p1.y, p1.z, 0.0).multiply(this.q0Conj);
        timeDelta *= 2.0; // divide angleDelta by 2 to keep sphere under pointer.  Might break algorithm properties, TODO: perhaps investigate.

        // path dependent
        // q1.setFromUnitVectors(p0, p1);

        this.q0.set(p0.x, p0.y, p0.z, 1.0);
        const angleSpeed = this.q1.angleTo(this.q0) / timeDelta;

        // Just set velocity because we are touching trackball without sliding
        this._angularVelocity.crossVectors( p0, p1);
        this._angularVelocity.setLength( angleSpeed );
        this.applyVelocity();
    }

    applyVelocity() {
        const timeStamp = performance.now();
        this._deltaVelTime = ( timeStamp - this._lastVelTime ) / 1000.0;
        this._lastVelTime = timeStamp;

        if(this.spinAxisConstraint) {
            this.normalizedAxis.copy( this.spinAxisConstraint );
            this._deltaAngle = this.normalizedAxis.dot( this._angularVelocity ) ;
        }
        else {
            this.normalizedAxis.copy( this._angularVelocity );
            this._deltaAngle = this._angularVelocity.length();
        }

        if(this._deltaAngle && this._deltaVelTime) {
            this.normalizedAxis.normalize();
            this.quat.setFromAxisAngle( this.normalizedAxis, this._deltaAngle * this._deltaVelTime * this.rotateSensitivity );

            this.object.quaternion.normalize();
            this.object.quaternion.premultiply(this.quat);
            this.object.updateMatrix();

            // using small-angle approximation cos(x/2) = 1 - x^2 / 8

            if ( 8 * ( 1 - this._lastQuaternion.dot( this.object.quaternion ) ) > this._EPS) {

                this.dispatchEvent(this.changeEvent as { type: keyof MyEvents });

                this._lastQuaternion.copy( this.object.quaternion );

            }
        }
    }

    onWindowResize() {
        if ( this.domElement === document ) {
            this.screen.left = 0;
            this.screen.top = 0;
            this.screen.width = window.innerWidth;
            this.screen.height = window.innerHeight;

        } else {
            const domElement = this.domElement as HTMLElement;
            const box = domElement.getBoundingClientRect();
            const d = domElement.ownerDocument.documentElement;
            this.screen.left = box.left + window.pageXOffset - d.clientLeft;
            this.screen.top = box.top + window.pageYOffset - d.clientTop;
            this.screen.width = box.width;
            this.screen.height = box.height;

        }
    }

    getPointerInNDC(pageX: number, pageY: number) {
        const ndcVector = new Vector2();
        ndcVector.set(
            ( pageX - this.screen.width * 0.5 - this.screen.left ) / ( this.screen.width * 0.5 ),
            ( this.screen.height + 2 * ( this.screen.top - pageY ) ) / this.screen.height
        )

        return ndcVector;
    }

    getObjectToPointer(pointerNdcScreen: Vector2) {
        this.object.updateWorldMatrix( true, false );
        this.OTPObjPos.setFromMatrixPosition( this.object.matrixWorld );
        this.camera.updateWorldMatrix( true, false );
        // Need to update camera.matrixWorldInverse if camera moved before renderer.render
        this.camera.matrixWorldInverse.copy( this.camera.matrixWorld ).invert();
        this.OTPObjPos.project( this.camera ); // position in ndc/screen
        this.OTPObjToPointer.set( this.OTPObjPos.x, this.OTPObjPos.y );
        this.OTPObjToPointer.subVectors( pointerNdcScreen, this.OTPObjToPointer );

        // Normalize OTPObjToPointer by object screen size
        // so OTPObjToPointer of length 1 is 1 object radius distance from object center.
        this.OTPObjEdgePos.setFromMatrixPosition( this.object.matrixWorld ); // OTPObjEdgePos is still aspirational on this line
        this.OTPOffset.set( this.trackBallRadius, 0, 0 );

        this.OTPOffset.applyQuaternion( this.OTPCameraRot.setFromRotationMatrix( this.camera.matrixWorld ) );
        this.OTPObjEdgePos.add( this.OTPOffset );
        this.OTPObjEdgePos.project( this.camera ); // position in ndc/screen
        this.OTPObjEdgePos.z = 0;
        this.OTPObjPos.z = 0;
        const objRadiusNDC = this.OTPObjEdgePos.distanceTo( this.OTPObjPos );

        this.OTPObjToPointer.x /= objRadiusNDC;
        this.OTPObjToPointer.y /= objRadiusNDC;
        if ( this.camera.aspect ) { // Perspective camera probably
            this.OTPObjToPointer.y /= this.camera.aspect;
        }

        return this.OTPObjToPointer;
    }

    getPointerInSphere(ndc: Vector2) {
        this.PISObjToPointer.copy( this.getObjectToPointer( ndc ) );

        this.PISCameraRot.setFromRotationMatrix( this.camera.matrixWorld );

        if ( this._pointerMapping === POINTER_SPHERE_MAPPING.RAYCAST ) {

            if ( this.PISObjToPointer.lengthSq() < 1 ) {

                this.PISObjPos.setFromMatrixPosition( this.object.matrixWorld );
                this.PISTrackBallSphere.set( this.PISObjPos, this.trackBallRadius );

                this.PISRay.origin.copy( this.camera.position );
                this.PISRay.direction.set( ndc.x, ndc.y, .5 );
                this.PISRay.direction.unproject( this.camera ); // In world space
                this.PISRay.direction.sub( this.camera.position ).normalize(); // Subtract to put around origin

                this.PISRay.intersectSphere( this.PISTrackBallSphere, this.PISPoint );
                this.PISPoint.sub( this.PISObjPos );
                this.PISPoint.normalize(); // updateAngularVelocity expects unit vectors

            } else {

                // Shoemake project on edge of sphere
                this.PISObjToPointer.normalize();
                this.PISPoint.set( this.PISObjToPointer.x, this.PISObjToPointer.y, 0.0 );
                this.PISPoint.applyQuaternion( this.PISCameraRot );

            }

        }
        // Pointer mapping code below derived from Yasuhiro Fujii's https://mimosa-pudica.net/3d-rotation/
        else if ( this._pointerMapping === POINTER_SPHERE_MAPPING.HOLROYD ) {

            var t = this.PISObjToPointer.lengthSq();
            if (t < 0.5) {
                this.PISPoint.set( this.PISObjToPointer.x, this.PISObjToPointer.y, Math.sqrt( 1.0 - t ) );
            } else {
                this.PISPoint.set( this.PISObjToPointer.x, this.PISObjToPointer.y, 1.0 / ( 2.0 * Math.sqrt( t ) ) );
                this.PISPoint.normalize();
            }
            this.PISPoint.applyQuaternion( this.PISCameraRot ); // Rotate from looking down z axis to camera direction

        }
        else if ( this._pointerMapping === POINTER_SPHERE_MAPPING.SHOEMAKE ) {

            var t = this.PISObjToPointer.lengthSq();
            if (t < 1.0) {
                this.PISPoint.set( this.PISObjToPointer.x, this.PISObjToPointer.y, Math.sqrt( 1.0 - t ) );
            } else {
                this.PISObjToPointer.normalize();
                this.PISPoint.set( this.PISObjToPointer.x, this.PISObjToPointer.y, 0.0 );
            }
            this.PISPoint.applyQuaternion( this.PISCameraRot );

        }
        else if ( this._pointerMapping === POINTER_SPHERE_MAPPING.AZIMUTHAL ) {

            var t = ( Math.PI / 2.0 ) * this.PISObjToPointer.length();
            var sined = t < Number.EPSILON ? 1.0 : Math.sin( t ) / t;
            this.PISObjToPointer.multiplyScalar( ( Math.PI / 2.0 ) * sined );
            this.PISPoint.set( this.PISObjToPointer.x, this.PISObjToPointer.y, Math.cos( t ) );
            this.PISPoint.applyQuaternion( this.PISCameraRot );

        }

        return this.PISPoint;
    }

    onPointerDown(pointerScreenX: number, pointerScreenY: number, time: number) {
        var pointerNdc = this.getPointerInNDC( pointerScreenX, pointerScreenY );

        var objToPointer = this.getObjectToPointer( pointerNdc );

        if ( objToPointer.lengthSq() < 1 ) {

            this._wasLastPointerEventOnSphere = true;
            this._pointOnSphere.copy( this.getPointerInSphere( pointerNdc ) );

        } else {

            this._wasLastPointerEventOnSphere = false;

        }

        this._pointerScreen.set(pointerScreenX, pointerScreenY);
        this._lastPointerEventTime = time;
        this._angularVelocity.set( 0, 0, 0 );
        this._isPointerDown = true;
    }



    onPointerMove(pointerScreenX: number, pointerScreenY: number, time: number) {
        var deltaTime = ( time - this._lastPointerEventTime ) / 1000.0;
        this._lastPointerEventTime = time;

        this._pointOnSphereOld.copy( this._pointOnSphere );

        this.pointerNdc.copy( this.getPointerInNDC( pointerScreenX, pointerScreenY ) );

        this.objToPointer.copy( this.getObjectToPointer( this.pointerNdc ) );

        if ( this.objToPointer.lengthSq() < 1 || !this.relativelySpinOffTrackball ) {

            // Pointer is within radius of trackball circle on the screen
            // or relative rotation off trackball disabled
            this._pointOnSphere.copy( this.getPointerInSphere( this.pointerNdc ) );

            if ( this._wasLastPointerEventOnSphere ) {
                // Still on sphere
                if( deltaTime > 0 ) { // Sometimes zero due to timer precision?
                    this.updateAngularVelocity( this._pointOnSphere, this._pointOnSphereOld, deltaTime );
                }
            }
            else {
                // Moved onto sphere
                this._angularVelocity.set( 0, 0, 0 );
                this._lastVelTime = time;

            }

            this._wasLastPointerEventOnSphere = true;

        } else {

            // Pointer off trackball
            if ( this._wasLastPointerEventOnSphere ) {

                // Just moved off trackball

                this._angularVelocity.set( 0, 0, 0 );
                this._lastVelTime = time;

            }
            else {

                // Pointer still off trackball this frame
                if( deltaTime > 0 ) { // Sometimes zero due to timer precision?

                    // Relatively spin towards pointer from trackball center by change in distance amount
                    // Simplify by finding pointer's delta polar coordinates with THREE.Sphere?

                    this.lastNdc.copy( this.getPointerInNDC( this._pointerScreen.x, this._pointerScreen.y ) );

                    this.deltaMouse.subVectors(this.pointerNdc, this.lastNdc);

                    // Find change in pointer radius to trackball center
                    this.objectPos.setFromMatrixPosition( this.object.matrixWorld );

                    if ( this.camera.isPerspectiveCamera ) {

                        this.objectToCamera.copy( this.camera.position ).sub( this.objectPos );

                    } else { // Assuming orthographic

                        this.camera.getWorldDirection( this.objectToCamera );
                        this.objectToCamera.negate();

                    }

                    this._pointOnSphere.copy( this.getPointerInSphere( this.pointerNdc ) );

                    // Radius angular velocity direction
                    this._angularVelocity.crossVectors( this.objectToCamera, this._pointOnSphere );

                    // Find radius change over time

                    var ndcToBall;

                    if ( this.camera.isPerspectiveCamera ) {

                        ndcToBall = ( 2 / this.camera.fov ) // NDC per field of view degree
                            / Math.atan( this.trackBallRadius / this.objectToCamera.length() ); // Ball field of view angle size

                    } else { //Assume orthographic
                        //@ts-ignore
                        ndcToBall = this.trackBallRadius / ( ( this.camera.top - this.camera.bottom ) / this.camera.zoom * 2 );

                    }

                    this.objToPointer.normalize();
                    var deltaRadius = this.deltaMouse.dot( this.objToPointer ) * ndcToBall / deltaTime;
                    this._angularVelocity.setLength( deltaRadius * this._offTrackBallVelocityGain ); // Just set it because we are touching trackball without sliding

                    // Find polar angle change
                    this.lastPointOnSphere.copy( this.getPointerInSphere( this.lastNdc ) );
                    var angle = this.lastPointOnSphere.angleTo( this._pointOnSphere ) / deltaTime;
                    this.polarVel.crossVectors( this.lastPointOnSphere, this._pointOnSphere );
                    this.polarVel.setLength( angle );

                    this._angularVelocity.add( this.polarVel );

                    this.applyVelocity();

                }

            }

            this._wasLastPointerEventOnSphere = false;

        }

        this._pointerScreen.set( pointerScreenX, pointerScreenY );

        this._hasPointerMovedThisFrame = true;
    }

    public setPointerToSphereMapping ( mappingTechnique: POINTER_SPHERE_MAPPING ) {
        this._pointerMapping = mappingTechnique;
        this._offTrackBallVelocityGain = offTrackBallVelocityGainMap[this._pointerMapping];
    }

    handlePointerDown(event: PointerEvent) {
        event.preventDefault(); // Prevent the browser from scrolling.
        event.stopImmediatePropagation(); // Stop other controls working.

        // Manually set the focus since calling preventDefault above
        // prevents the browser from setting it automatically.
        //@ts-ignore
        this.domElement.focus ? this.domElement.focus() : window.focus();

        this.dispatchEvent( this.startEvent as { type: keyof MyEvents });
    }

    handlePointerUp(event: (PointerEvent | TouchEvent | MouseEvent)) {
        event.preventDefault();

        if( !this._hasPointerMovedThisFrame ) {

            // To support subtle touches do big dampening, not just zeroing velocity
            var deltaTime = ( event.timeStamp - this._lastPointerEventTime ) / 1000.0;
            this._angularVelocity.multiplyScalar( 1 / (this._pointerUpVelDamping * Math.pow(deltaTime, 2) + this.dampingFactor * deltaTime + 1) );

        }

        this._isPointerDown = false;

        this.dispatchEvent( this.endEvent as { type: keyof MyEvents });
    }

    onMouseDown( event: PointerEvent ) {
        if ( this.enabled === false || event.button !== 0 ) return;
        this.onPointerDown( event.pageX, event.pageY, event.timeStamp );
        document.addEventListener( 'mousemove', this.onMouseMove, false );
        document.addEventListener( 'mouseup', this.onMouseUp, false );
        this.handlePointerDown( event );
    }

    onMouseMove( event: PointerEvent ) {
        if ( this.enabled === false ) return;
        event.preventDefault();
        this.onPointerMove( event.pageX, event.pageY, event.timeStamp );
    }

    onMouseUp( event: PointerEvent ) {
        if ( this.enabled === false ) return;
        document.removeEventListener( 'mousemove', this.onMouseMove );
        document.removeEventListener( 'mouseup', this.onMouseUp );
        this.handlePointerUp( event );
    }

    public cancelSpin(){
        this._angularVelocity.set( 0, 0, 0 );
    } ;

    public handleTouchStart ( event: PointerEvent ) {
        this.onPointerDown( event.pageX, event.pageY, event.timeStamp );
        this.applyVelocity();  //TODO Should not be needed here
    }

    public onTouchStart( event: PointerEvent ) {
        if ( this.enabled === false ) return;
        this.handleTouchStart( event );
        this.handlePointerDown( event );
    }

    public onTouchMove( event: TouchEvent ) {
        if ( this.enabled === false || !this._isPointerDown ) return;
        event.preventDefault();
        event.stopImmediatePropagation(); // Prevent other controls from working.
        this.onPointerMove( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY, event.timeStamp );
    }

    public onTouchEnd( event: TouchEvent ) {
        if( this.enabled === false ) return;
        this.handlePointerUp( event );
        // override handlePointerUp if finger still down
        if( event.touches.length > 0 ) {
            this._isPointerDown = true;
        }
    }

    public dispose() {
        this.domElement.removeEventListener( 'mousedown', this.onMouseDown );
        document.removeEventListener( 'mousemove', this.onMouseMove );
        document.removeEventListener( 'mouseup', this.onMouseUp );

        this.domElement.removeEventListener( 'touchstart', this.onTouchStart );
        this.domElement.removeEventListener( 'touchmove', this.onTouchMove );
        this.domElement.removeEventListener( 'touchend', this.onTouchEnd );
    }
}

export default SpinControls;
