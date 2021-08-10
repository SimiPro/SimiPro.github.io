import * as THREE from '../../build/three.module.js';
import { OrbitControls } from '../../build/OrbitControls.js';
import { TransformControls } from '../../build/TransformControls.js';
import { GUI } from '../../build/jsm/libs/dat.gui.module.js';
import * as M from './math_helper.js'
import {shortestDistanceRectangleSegment, shortestDistanceRectangleSegment_rOrtho} from "./math_helper.js";

let dimCounter = 0;
const DIMS = 7;

class LineSegment {

    constructor(dim1, scene) {
        this.p1 = new THREE.Vector3(0,0,0);
        this.u1 = M.smul(dim1, new THREE.Vector3(1, 0, 0));
        this.p2 =  M.add(this.p1, this.u1);
        this.line = this.initLine(this.p1, this.p2, 0x00FF00, scene );
        this.index = dimCounter;
        dimCounter += DIMS;
    }

    initLine(p1, p2, color, scene) {
        const material = new THREE.LineBasicMaterial( { color: color, linewidth:10, linecap:'square' } );
        let line_ps = [p1, p2]
        const geometry = new THREE.BufferGeometry().setFromPoints(line_ps);
        let line = new THREE.Line(geometry, material );
        line.castShadow = true;
        line.receiveShadow = true;
        scene.add(line);
        return line;
    }

    setCOM(s, newP) {
        s[this.index] = newP.x;
        s[this.index+1] = newP.y;
        s[this.index+2] = newP.z;
    }

    getCOM(s) {
        return new THREE.Vector3(s[this.index], s[this.index+1], s[this.index+2]);
    }

    setQuat(s, quat) {
        s[this.index+3] = quat.x;
        s[this.index+4] = quat.y;
        s[this.index+5] = quat.z;
        s[this.index+6] = quat.w;
    }

    getQuat(s) {
        return new THREE.Quaternion(s[this.index+3], s[this.index+4], s[this.index+5], s[this.index+6]);
    }

    toWorld(s, p_) {
        let p = p_.clone();
        return M.add(this.getCOM(s), p.applyQuaternion(this.getQuat(s)));
    }

    updateRendering(s) {
        let pos1 = this.toWorld(s, this.p1);
        let pos2 = this.toWorld(s, this.p2);
        console.log("local length: ", M.sub(this.p1, this.p2).length(), "world length: ", M.sub(pos1, pos2).length());
        this.line.geometry.attributes.position.setXYZ(0, pos1.x, pos1.y, pos1.z);
        this.line.geometry.attributes.position.setXYZ(1, pos2.x, pos2.y, pos2.z);
        this.line.geometry.attributes.position.needsUpdate = true;
    }

}

(function() {
    let container;
    let camera, scene, renderer;
    let height, width;
    const helperObjects = [];
    let num_points = 2;
    const positions = [];

    let rectangle;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onUpPosition = new THREE.Vector2();
    const onDownPosition = new THREE.Vector2();

    let projS1;
    let projS2;
    let lineSeg;

    let lineShortestDist;
    let p1Shortest;
    let p2Shortest;

    let s1, s2;
    let state;


    const data = {
        width: 100,
        height: 100,
        depth: 100
    }

    let currPlane = [];

    const geometry = new THREE.BoxGeometry( 10, 10, 10 );
    let transformControl;
    init();
    animate();

    function addLine(p1, p2, color) {
        const material = new THREE.LineBasicMaterial( { color: color } );
        let line_ps = [p1, p2]
        const geometry = new THREE.BufferGeometry().setFromPoints(line_ps);

        let line = new THREE.Line(geometry, material );
        line.castShadow = true;
        line.receiveShadow = true;
        scene.add(line);
        return line;
    }



    function init() {

        container = document.getElementById("SegVsBox");
        height = container.clientHeight;
        width = container.clientWidth;
        scene = new THREE.Scene();
        scene.background = new THREE.Color( 0xf0f0f0 );

        camera = new THREE.PerspectiveCamera( 40, width/height, 1, 10000 );
        camera.position.set( 0, 150, 250 );
        scene.add( camera );

        scene.add( new THREE.AmbientLight( 0xf0f0f0 ) );
        const light = new THREE.SpotLight( 0xffffff, 1.5 );
        light.position.set( 0, 1500, 200 );
        light.angle = Math.PI * 0.2;
        light.castShadow = true;
        light.shadow.camera.near = 200;
        light.shadow.camera.far = 2000;
        light.shadow.bias = - 0.000222;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        scene.add( light );

        const planeGeometry = new THREE.PlaneGeometry( 2000, 2000 );
        planeGeometry.rotateX( - Math.PI / 2 );
        const planeMaterial = new THREE.ShadowMaterial( { opacity: 0.2 } );

        const plane = new THREE.Mesh( planeGeometry, planeMaterial );
        plane.position.y = - 200;
        plane.receiveShadow = true;
        scene.add( plane );

        const helper = new THREE.GridHelper( 2000, 100 );
        helper.position.y = - 199;
        helper.material.opacity = 0.25;
        helper.material.transparent = true;
        scene.add( helper );

        renderer = new THREE.WebGLRenderer( { antialias: true } );
        renderer.setPixelRatio( width/height );
        renderer.setSize( width, height );
        renderer.shadowMap.enabled = true;
        container.appendChild( renderer.domElement );


        // gui

        const gui = new GUI({autoPlace: false});
        const cubeFolder = gui.addFolder('Cube')
     //  cubeFolder.add(data, 'segmentLength', 1, 1000).onChange(generateGeometry);
        cubeFolder.open()

        var guiHolder = document.getElementById("SegVsBoxGui");
        guiHolder.appendChild(gui.domElement);

        // Controls
        const controls = new OrbitControls( camera, renderer.domElement );
        controls.damping = 0.2;
        controls.addEventListener( 'change', render );

        transformControl = new TransformControls( camera, renderer.domElement );
        transformControl.addEventListener( 'change', render );
        transformControl.addEventListener( 'dragging-changed', function ( event ) {
            controls.enabled = ! event.value;
        });
        scene.add( transformControl );

        transformControl.addEventListener( 'objectChange', function () {
            updateStuff();
        });

        container.addEventListener( 'pointerdown', onPointerDown );
        container.addEventListener( 'pointerup', onPointerUp );
        container.addEventListener( 'pointermove', onPointerMove );

        s1 = new LineSegment(100, scene);
        //s2 = new LineSegment(200, scene);

        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0xff00ff];
        positions.push(s1.p1);
        positions.push(s1.p2);
       // positions.push(s2.p1);
       // positions.push(s2.p2);
        for ( let i = 0; i < num_points; i ++ ) {
            addControlPoints( positions[ i ], colors[i] );
        }

        positions.length = 0;

        for ( let i = 0; i < num_points; i ++ ) {
            positions.push( helperObjects[ i ].position );
        }

        // add coordinate system
        addArrow(new THREE.Vector3(-100, 0 ,0), new THREE.Vector3(1, 0, 0), 0xff0000);
        addArrow(new THREE.Vector3(-100, 0 ,0), new THREE.Vector3(0, 1, 0), 0x00ff00);
        addArrow(new THREE.Vector3(-100, 0 ,0), new THREE.Vector3(0, 0, 1), 0x0000ff);

      //  projS1 = addSphere(0xffffff);
    //    projS2 = addSphere(0xffffff);

      //  p1Shortest = addSphere(0xff0000);
      //  p2Shortest = addSphere(0xff0000);
    //    lineShortestDist = addLine(p1Shortest, p2Shortest, 0x000000);

    //    lineSeg = addLine(positions[2], positions[3], 0xff00ff);


        state = math.ones(dimCounter);
        updateStuff();
    }

    function addArrow(p, v_, color) {
        let dir = v_.clone();
        dir.normalize();
        const arrowHelper = new THREE.ArrowHelper( dir, p, 10, color );
        scene.add( arrowHelper );
    }

    function addBox(color) {
        const geometry = new THREE.BoxGeometry( data.width, data.height, data.depth );
        const material = new THREE.MeshPhongMaterial( {color: color} );
        const boxi = new THREE.Mesh( geometry, material );
        boxi.receiveShadow = true;
        scene.add(boxi);
        return boxi;
    }

    function addSphere(color) {
        const sgeometry = new THREE.SphereGeometry( 7, 32, 32 );
        const smaterial = new THREE.MeshBasicMaterial( {color: color} );
        const sphere = new THREE.Mesh( sgeometry, smaterial );
        scene.add(sphere);
        return sphere;
    }

    function addControlPoints( position, color ) {

        const material = new THREE.MeshLambertMaterial( { color: color } );
        //const material = new THREE.LineBasiFscMaterial( { color: 0x0000ff } );
        const object = new THREE.Mesh( geometry, material );

        if ( position ) {
            object.position.copy( position );
        } else {
            object.position.x = Math.random() * 250;
            object.position.y = Math.random() * 50;
            object.position.z = Math.random() * 10 - 40;
        }

        object.castShadow = true;
        object.receiveShadow = true;
        scene.add( object );
        helperObjects.push( object );
        return object;
    }

    function worldToLocal(p, R, q_) {
        let q = q_.clone();
        return M.sub(q, p).applyMatrix3(R.clone().transpose());
    }

    function localToWorld(p, R, q_) {
        let q = q_.clone();
        return M.add(p, q.applyMatrix3(R));
    }

    function calcShortestDistance(p,R, dims, s1_, s2_) {
        // 1. translate point into local coordinates
        let s1 = worldToLocal(p, R, s1_);
        let s2 = worldToLocal(p, R, s2_);

        // we calculate shortest distance to
        // dims = [width, height, depth] => x, y, z
        let u1 = M.smul(dims[0],  new THREE.Vector3(1, 0 , 0));
        let u2 = M.smul(dims[1], new THREE.Vector3(0, 1 , 0));
        let u3 = M.smul(dims[2], new THREE.Vector3(0, 0 , 1));

        // 2. create all the rectangle points in local coordinates
        let p1 = new THREE.Vector3( - dims[0]/2., - dims[1]/2., - dims[2]/2);
        let p2 = M.add(p1, u2);
        let p3 = M.add(M.add(p1, u1), u2);
        let p4 = M.add(p1, u1);
        let p5 = M.add(p1, u3);
        let p6 = M.add(p2, u3);
        let p7 = M.add(p3, u3);
        let p8 = M.add(p4, u3);

        // 3. create all the planes
        let plane1 = [p1, p2, p3, p4];
        let plane2 = [p1, p4, p8, p5];
        let plane3 = [p5, p6, p7, p8];
        let plane4 = [p8, p7, p3, p4];
        let plane5 = [p5, p6, p2, p1];
        let plane6 = [p6, p2, p3, p7];
        let planes = [plane1, plane2, plane3, plane4, plane5, plane6];

        let i_draw = 5;
        let i = 0;
        let min_dist = 1000000;
        let p1_min;
        let p2_min;
        for (let plane of planes) {
            if (true || i_draw ===i) {
                for (let j = 0; j < 4; j++) {
                   // currPlane[j].position.set(plane[j].x, plane[j].y, plane[j].z);
                }
                let res = M.shortestDistanceRectangleSegment_rOrtho(plane[0], plane[1], plane[2], plane[3], s1, s2);
                if (res[2] < min_dist) {
                    min_dist = res[2];
                    p1_min = res[0];
                    p2_min = res[1];
                }
            }
            i = i +1;
        }

        p1_min = localToWorld(p, R, p1_min);
        p2_min = localToWorld(p, R, p2_min);

        return [p1_min, p2_min, min_dist];


    }

    function updateStuff() {
      //  updateLine(lineSeg, positions[2], positions[3]);

    //    let res =  calcShortestDistance(box.position,RL, [data.width, data.height, data.depth], positions[2], positions[3]);

      //  p1Shortest.position.set(res[0].x, res[0].y,res[0].z);
       // p2Shortest.position.set(res[1].x, res[1].y, res[1].z);
       // updateLine(lineShortestDist, res[0], res[1]);


        // since the movement of the segments on the gui is happening with dragging around the 2
        // positioning cubes we have to update the state accordingly to these positions
        let v1 = s1.u1;
        let v2 = M.sub(positions[1], positions[0]);
        let R_ = M.rotateAlignNaive(v1, v2);
        let R = new THREE.Matrix4();
        R.setFromMatrix3(R_);
        let newQ = new THREE.Quaternion().setFromRotationMatrix(R);
        let newP = positions[0];

        s1.setCOM(state, newP);
        s1.setQuat(state, newQ);

        positions[1] = s1.toWorld(state, s1.p2);

        helperObjects[1].position.copy(positions[1]);

        s1.updateRendering(state);
       // s2.updateRendering(state);
    }


    function animate() {

        requestAnimationFrame( animate );
        render();

    }

    function render() {

        renderer.render( scene, camera );
    }

    function onPointerDown( event ) {

        onDownPosition.x = event.clientX;
        onDownPosition.y = event.clientY;

    }

    function onPointerUp() {

        onUpPosition.x = event.clientX;
        onUpPosition.y = event.clientY;

        if ( onDownPosition.distanceTo( onUpPosition ) === 0 ) transformControl.detach();

    }

    function onPointerMove( event ) {
        var rect = event.target.getBoundingClientRect();

        const x_left = event.clientX - rect.x;
        const y_up = event.clientY - rect.y;
        pointer.x =  ( x_left / width )  * 2 - 1;
        pointer.y = - ( y_up / height ) * 2 + 1;



        raycaster.setFromCamera( pointer, camera );

        const intersects = raycaster.intersectObjects( helperObjects );

        if ( intersects.length > 0 ) {
            const object = intersects[ 0 ].object;

            if ( object !== transformControl.object ) {

                transformControl.attach( object );

            }

        }

    }
})();
