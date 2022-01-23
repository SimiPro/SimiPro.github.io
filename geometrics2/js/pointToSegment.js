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
    let num_points = 3;
    const positions = [];
    const point = new THREE.Vector3();
    const lines = [];

    let projected_point;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onUpPosition = new THREE.Vector2();
    const onDownPosition = new THREE.Vector2();

    const geometry = new THREE.BoxGeometry( 10, 10, 10 );
    let transformControl;


    init();
    animate();

    function init() {

        container = document.getElementById("pointToSegment");
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



        /*
                const gui = new GUI();

                gui.add( params, 'uniform' );
                gui.add( params, 'tension', 0, 1 ).step( 0.01 ).onChange( function ( value ) {

                    splines.uniform.tension = value;
                    updateSplineOutline();

                } );
                gui.add( params, 'centripetal' );
                gui.add( params, 'chordal' );
                gui.add( params, 'addPoint' );
                gui.add( params, 'removePoint' );
                gui.add( params, 'exportSpline' );
                gui.open();*/

        // Controls
        const controls = new OrbitControls( camera, renderer.domElement );
        controls.damping = 0.2;
        controls.addEventListener( 'change', render );

        transformControl = new TransformControls( camera, renderer.domElement );
        transformControl.addEventListener( 'change', render );
        transformControl.addEventListener( 'dragging-changed', function ( event ) {

            controls.enabled = ! event.value;

        } );
        scene.add( transformControl );

        transformControl.addEventListener( 'objectChange', function () {
            updateSplineOutline();
        } );

        container.addEventListener( 'pointerdown', onPointerDown );
        container.addEventListener( 'pointerup', onPointerUp );
        container.addEventListener( 'pointermove', onPointerMove );


        for ( let i = 0; i < num_points; i ++ ) {
            addSplineObject( positions[ i ] );
        }

        positions.length = 0;

        for ( let i = 0; i < num_points; i ++ ) {
            positions.push( helperObjects[ i ].position );
        }

        const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
        let line_ps = [positions[0], positions[1]]
        const geometry = new THREE.BufferGeometry().setFromPoints(line_ps);


        let line = new THREE.Line(geometry, material );
        line.castShadow = true;
        line.receiveShadow = true;
        lines.push(line);


        scene.add(line);


        const sgeometry = new THREE.SphereGeometry( 7, 32, 32 );
        const smaterial = new THREE.MeshBasicMaterial( {color: 0xff0000} );
        const sphere = new THREE.Mesh( sgeometry, smaterial );
        projected_point = sphere;
        scene.add( sphere );

    }

    function setNewProjectedPoint(position) {
        projected_point.position.set(position.x, position.y, position.z);
       // projected_point.geometry.attributes.position.needsUpdate = true;
    }

    function addSplineObject( position ) {

        const material = new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } );
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
        if (M.dot(ab, ab) >= 1e-5) { // check if parallel
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

    function updateSplineOutline() {
        for (let i = 0; i < lines.length; i++ ) {
            //position.setXYZ( i, point.x, point.y, point.z );
            lines[i].geometry.attributes.position.setXYZ(0, positions[0].x, positions[0].y, positions[0].z);
            lines[i].geometry.attributes.position.setXYZ(1, positions[1].x, positions[1].y, positions[1].z);
            lines[i].geometry.attributes.position.needsUpdate = true;
        }
        updateProjectedPoint();
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
