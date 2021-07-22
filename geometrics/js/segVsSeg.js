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
    let num_points = 4;
    const positions = [];
    const point = new THREE.Vector3();
    const lines = [];
    let plane;
    let projected_point;
    let pSeg34;
    let pSeg12;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onUpPosition = new THREE.Vector2();
    const onDownPosition = new THREE.Vector2();

    const geometry = new THREE.BoxGeometry( 10, 10, 10 );
    let transformControl;
    let proj3, proj4;
    let projectedLine;
    let shortest_distance_line;
    init();
    animate();

    function addLine(p1, p2, addToLines, color) {

        const material = new THREE.LineBasicMaterial( { color: color } );
        let line_ps = [p1, p2]
        const geometry = new THREE.BufferGeometry().setFromPoints(line_ps);

        let line = new THREE.Line(geometry, material );
        line.castShadow = true;
        line.receiveShadow = true;
        if (addToLines) {
            lines.push(line);
        }

        scene.add(line);
        return line;
    }

    function addPlane(p1, p2) {
        const geometry = new THREE.PlaneGeometry( 500, 500     );
        const material = new THREE.MeshBasicMaterial( {color: 0xccaca9, side: THREE.DoubleSide} );

        plane = new THREE.Mesh( geometry, material );
        plane.position.set(p1.x,p1.y,p1.z);
        // plane.position.set(p1);
       // plane.rotation.set
        scene.add( plane );
    }



    function updatePlanePosition(p1, p2) {
        plane.position.set(p1.x,p1.y,p1.z);
        plane.lookAt(p2);
    }

    function init() {

        container = document.getElementById("SegVsSeg");
        height = container.clientHeight;
        width = container.clientWidth;
        scene = new THREE.Scene();
        scene.background = new THREE.Color( 0xf0f0f0 );

        camera = new THREE.PerspectiveCamera( 40, width/height, 1, 10000 );
        camera.position.set( -500, 150, 500 );
        scene.add( camera );

        scene.add( new THREE.AmbientLight( 0xf0f0f0 ) );
        const light = new THREE.SpotLight( 0xffffff, 1.5 );
        light.position.set( 0, 1500, 500 );
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
            updateSplineOutline();
        });

        container.addEventListener( 'pointerdown', onPointerDown );
        container.addEventListener( 'pointerup', onPointerUp );
        container.addEventListener( 'pointermove', onPointerMove );

        positions.push(new THREE.Vector3(0, 100, 0));
        positions.push(new THREE.Vector3(0, 100, 100));
        positions.push(new THREE.Vector3(100, 0, 50));
        positions.push(new THREE.Vector3(0, 0, 50));


        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff];
        for ( let i = 0; i < num_points; i ++ ) {
            addControlPoints( positions[ i ], colors[i] );
        }

        positions.length = 0;

        for ( let i = 0; i < num_points; i ++ ) {
            positions.push( helperObjects[ i ].position );
        }

        addLine(positions[0], positions[1], true, 0x0000ff);
        addLine(positions[2], positions[3], true, 0x0000ff)

        addPlane(positions[0], positions[1]);


        const sgeometry = new THREE.SphereGeometry( 7, 32, 32 );
        const smaterial = new THREE.MeshBasicMaterial( {color: 0xff0000} );
        const sphere = new THREE.Mesh( sgeometry, smaterial );
        projected_point = sphere;
        scene.add( sphere );

        proj3 = addSphere(colors[2]);
        proj4 = addSphere(colors[3]);

        pSeg12 = addSphere(0xffffff);
        pSeg34 = addSphere(0xffffff);

        shortest_distance_line = addLine(pSeg12.position, pSeg34.position, false, 0x000000);
        projectedLine = addLine(proj3.position, proj4.position, false, 0x0000ff);

        updateSplineOutline();

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

    function setNewProjectedPoint(position) {
        projected_point.position.set(position.x, position.y, position.z);
        // projected_point.geometry.attributes.position.needsUpdate = true;
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
        if (t > 1)
            return 1
        if (t < 0)
            return 0;
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
        const p1 = positions[0];
        const p2 = positions[1];
        const p3 = positions[2];
        const projectedPoint = projectToSegment(p3, p1, p2);
        setNewProjectedPoint(projectedPoint)

    }

    function updateLine(line, pos1, pos2) {
        line.geometry.attributes.position.setXYZ(0, pos1.x, pos1.y, pos1.z);
        line.geometry.attributes.position.setXYZ(1, pos2.x, pos2.y, pos2.z);
        line.geometry.attributes.position.needsUpdate = true;
    }

    function calculateShortestDistance(p1, p2, p3, p4) {
        // 2. create a plane with the normal being the direction of the segment and the
        //    starting point being the start of the segment
        updatePlanePosition(p1, p2);
        let nPlane = M.sub(p2, p1);
        let pPlane = p1;
        // 3. project the other segment onto this plane
        //    now we reduced the problem to a simple point to segment distance problem
        let p3_ = projectToPlane(nPlane, pPlane, p3);
        let p4_ = projectToPlane(nPlane, pPlane, p4);
        proj3.position.set(p3_.x, p3_.y, p3_.z);
        proj4.position.set(p4_.x, p4_.y, p4_.z);
        updateLine(projectedLine, p3_, p4_);

        // 4. we calculate that distance
        // now p1 and the line segment p4_, p3_ lie in the same plane
        // which means all we have to do is project the point p1 onto the line segment e34_
        // this gives us lambda
        let e34_ = M.sub(p4_, p3_);
        let lambda = 0.5;
        if (e34_.dot(e34_) > 1e-7) { // check if not parallel
            lambda = M.sub(p1, p3_).dot(e34_) / e34_.dot(e34_);
        }
        // the point calculated is now on the "line" if there was any
        lambda = clamp01(lambda);
        let p34_line = M.add(p3, M.smul(lambda, M.sub(p4, p3)));
        projected_point.position.set(p34_line.x, p34_line.y, p34_line.z);

        // so we project it normally back to the line segment
        // to be really accurate we have to project the point first on the segment 1,2
        let p12_seg = projectToSegment(p34_line, p1, p2);
        // and now also this point onto the segment 3,4
        // and now also project this normally to the other line segment
        let p34_seg = projectToSegment(p12_seg, p3, p4);

        pSeg12.position.set(p12_seg.x, p12_seg.y, p12_seg.z);
        pSeg34.position.set(p34_seg.x, p34_seg.y, p34_seg.z);

        return [pSeg12, pSeg34]
    }

    function SegSegShortestDist(p1, p2, p3, p4) {
        // 2. create a plane with the normal being the direction of the segment and the
        //    starting point being the start of the segment
        let nPlane = M.sub(p2, p1);
        let pPlane = p1;
        // 3. project the other segment onto this plane
        //    now we reduced the problem to a simple point to segment distance problem
        let p3_ = projectToPlane(nPlane, pPlane, p3);
        let p4_ = projectToPlane(nPlane, pPlane, p4);
        // 4. we calculate that distance
        // now p1 and the line segment p4_, p3_ lie in the same plane
        // which means all we have to do is project the point p1 onto the line segment e34_
        // this gives us lambda
        let e34_ = M.sub(p4_, p3_);
        let lambda = 0.5;
        if (e34_.dot(e34_) > 1e-7) { // check if not parallel
            lambda = M.sub(p1, p3_).dot(e34_) / e34_.dot(e34_);
        }
        // the point calculated is now on the "line" if there was any
        lambda = clamp01(lambda);
        let p34_line = M.add(p3, M.smul(lambda, M.sub(p4, p3)));
        // so we project it normally back to the line segment
        // to be really accurate we have to project the point first on the segment 1,2
        let p12_seg = projectToSegment(p34_line, p1, p2);
        // and now also this point onto the segment 3,4
        // and now also project this normally to the other line segment
        let p34_seg = projectToSegment(p12_seg, p3, p4);
        return [p12_seg, p34_seg]
    }

    function updateSplineOutline() {
        for (let i = 0; i < lines.length; i++ ) {
            //position.setXYZ( i, point.x, point.y, point.z );
            const id1 = 2*i;
            const id2 = 2*i + 1;
            updateLine(lines[i], positions[id1], positions[id2]);
        }

        // 1. take the end positions of the segments
        let p1 = positions[0];
        let p2 = positions[1];
        let p3 = positions[2];
        let p4 = positions[3];

        let res = calculateShortestDistance(p1, p2, p3, p4);
        let pSeg12 = res[0];
        let pSeg34 = res[1];
        updateLine(shortest_distance_line, pSeg12.position, pSeg34.position);

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
