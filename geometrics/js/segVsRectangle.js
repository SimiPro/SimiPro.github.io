import * as THREE from '../../build/three.module.js';
import { OrbitControls } from '../../build/OrbitControls.js';
import { TransformControls } from '../../build/TransformControls.js';
import { GUI } from '../../build/jsm/libs/dat.gui.module.js';
import * as M from './math_helper.js'

(function() {
    let container;
    let camera, scene, renderer;
    let height, width;
    const helperObjects = [];
    let num_points = 5;
    const positions = [];

    let rectangle;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onUpPosition = new THREE.Vector2();
    const onDownPosition = new THREE.Vector2();

    let projS1;
    let projS2;
    let lineSeg;


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

    function addPlane(p1, p2, p3) {
        // we define the plane with the edge p2 - p1
        // and an additional point p3 on the plane but describing nothing else
        // then the normal is just the cross product
        // and the last edge is then normmal to p2, p1 and the plane normal

        let u1 = M.sub(p2, p1);
        let u2_ = M.sub(p3, p1);

        let ext1 = u1.length();
        let ext2 = u2_.length();

        u1.normalize();
        u2_.normalize();

        let nNormal = M.cross(u1, u2_);
        let u2 = M.cross(u1, nNormal);
        u2.normalize();

        let p4 = M.add(p2, M.sub(p3, p1));

        u1 = M.smul(ext1, u1);
        u2 = M.smul(ext2, u2);

        // check if we have to turn u2 because it could point into the wrong direction
        if (M.sub(M.add(p1, u2), p3).length() > M.sub(M.add(p1, u2.clone().negate()), p3).length()) {
            u2.negate();
        }

        let v1 = p1;
        let v2 = M.add(p1, u1);
        let v3 = M.add(p1, u2);
        let v4 = M.add(v3, u1);

        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array( [
            v1.x, v1.y, v1.z,
            v2.x, v2.y, v2.z,
            v3.x, v3.y, v3.z,

            v3.x, v3.y, v3.z,
            v4.x, v4.y, v4.z,
            v2.x, v2.y, v2.z
        ]);
        // itemSize = 3 because there are 3 values (components) per vertex
        geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
        const material = new THREE.MeshBasicMaterial( {color: 0xccaca9, side: THREE.DoubleSide} );
        let plane = new THREE.Mesh( geometry, material );
        scene.add( plane );
        return plane;
    }

    function updatePlaneTransformation() {
        let p1 = positions[0];
        let p2 = positions[1];
        let p3 = positions[2];

        let u1 = M.sub(p2, p1);
        let u2_ = M.sub(p3, p1);

        let ext1 = u1.length();
        let ext2 = u2_.length();

        u1.normalize();
        u2_.normalize();

        let nNormal = M.cross(u1, u2_);
        let u2 = M.cross(u1, nNormal);
        u2.normalize();

        let p4 = M.add(p2, M.sub(p3, p1));

        u1 = M.smul(ext1, u1);
        u2 = M.smul(ext2, u2);

        // check if we have to turn u2 because it could point into the wrong direction
        if (M.sub(M.add(p1, u2), p3).length() > M.sub(M.add(p1, u2.clone().negate()), p3).length()) {
            u2.negate();
        }

        let v1 = p1;
        let v2 = M.add(p1, u1);
        let v3 = M.add(p1, u2);
        let v4 = M.add(v3, u1);

        // update rectangle points
        rectangle.geometry.attributes.position.setXYZ(0, v1.x, v1.y, v1.z);
        rectangle.geometry.attributes.position.setXYZ(1, v2.x, v2.y, v2.z);
        rectangle.geometry.attributes.position.setXYZ(2, v3.x, v3.y, v3.z);
        rectangle.geometry.attributes.position.setXYZ(3, v3.x, v3.y, v3.z);
        rectangle.geometry.attributes.position.setXYZ(4, v4.x, v4.y, v4.z);
        rectangle.geometry.attributes.position.setXYZ(5, v2.x, v2.y, v2.z);
        rectangle.geometry.attributes.position.needsUpdate = true;

    }

    function updatePlanePosition(plane, p1, p2) {
        plane.position.set(p1.x,p1.y,p1.z);
        plane.lookAt(p2);
    }

    function init() {

        container = document.getElementById("SegToRect");
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

        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0xff00ff];
        positions.push(new THREE.Vector3(0, 0, 0));
        positions.push(new THREE.Vector3(0, 0, 100));
        positions.push(new THREE.Vector3(100, 0, 0));
        positions.push(new THREE.Vector3(0, 100, 0));
        positions.push(new THREE.Vector3(0, 100, 100));
        for ( let i = 0; i < num_points; i ++ ) {
            addControlPoints( positions[ i ], colors[i] );
        }

        positions.length = 0;

        for ( let i = 0; i < num_points; i ++ ) {
            positions.push( helperObjects[ i ].position );
        }

        projS1 = addSphere(0xffffff);
        projS2 = addSphere(0xffffff);

        lineSeg = addLine(positions[3], positions[4], 0xff00ff);


        rectangle = addPlane(positions[0], positions[1], positions[2]);
        updatePlaneTransformation();
        updateProjectedPoint();
        updateLine(lineSeg, positions[3], positions[4]);
    }

    function addSphere(color) {
        const sgeometry = new THREE.SphereGeometry( 7, 32, 32 );
        const smaterial = new THREE.MeshBasicMaterial( {color: color} );
        const sphere = new THREE.Mesh( sgeometry, smaterial );
        scene.add(sphere);
        return sphere;
    }

    function projectToPlane(nPlane_, pPlane, p) {
        let nPlane = nPlane_.clone();
        nPlane.normalize();
        let v = M.sub(p, pPlane);
        let dist = M.dot(v, nPlane);
        return M.sub(p, M.smul(dist, nPlane));
    }

    function addControlPoints( position, color ) {

        const material = new THREE.MeshLambertMaterial( { color: color } );
        //const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
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

    function clamp01(t) {
        return clamp(t, 0, 1);
    }

    function clamp(t, mini, maxi) {
        if (t > maxi)
            return maxi
        if (t < mini)
            return mini;
        return t;
    }

    function projectToSegment(p, a, b) {
        let ab = M.sub(b, a);
        let t = 1;
        if (M.dot(ab, ab) >= 1e-5) {
            t = M.dot(M.sub(p, a), ab);
            t = t / M.dot(ab, ab);
            t = clamp01(t);
        }
        return M.add(a, M.smul(t, ab));
    }

    function updateProjectedPoint() {
        const s1Proj = pointToRectangle(positions[3]);
        const s2Proj = pointToRectangle(positions[4]);
        projS1.position.set(s1Proj.x, s1Proj.y, s1Proj.z);
        projS2.position.set(s2Proj.x, s2Proj.y, s2Proj.z);

    }

    function pointToRectangle(q) {
        const p0 = positions[0];
        const p1 = positions[1];
        const p2 = positions[2];

        const p = p0;

        let u1 = M.sub(p1, p0);
        let u2_ = M.sub(p2, p0);

        let ext1 = u1.length();
        let ext2 = u2_.length();

        u1.normalize();
        u2_.normalize();

        let nNormal = M.cross(u1, u2_);
        let u2 = M.cross(u1, nNormal);


        // check if we have to turn u2 because it could point into the wrong direction
        if (M.sub(M.add(p, u2), p2).length() > M.sub(M.add(p, u2.clone().negate()), p2).length()) {
            u2.negate();
        }

        let diff = M.sub(q, p);
        let s = clamp(u1.dot(diff), 0, ext1);
        let t = clamp(u2.dot(diff), 0, ext2);



        return M.add(M.add(p, M.smul(s, u1)), M.smul(t, u2));
    }

    function updateLine(line, pos1, pos2) {
        line.geometry.attributes.position.setXYZ(0, pos1.x, pos1.y, pos1.z);
        line.geometry.attributes.position.setXYZ(1, pos2.x, pos2.y, pos2.z);
        line.geometry.attributes.position.needsUpdate = true;
    }

    function updateStuff() {

        // 1. take the end positions of the segments
        let p1 = positions[0];
        let p2 = positions[1];
        let p3 = positions[2];
        let p4 = positions[3];

        updatePlaneTransformation();
        updateProjectedPoint();
        updateLine(lineSeg, positions[3], positions[4]);
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
