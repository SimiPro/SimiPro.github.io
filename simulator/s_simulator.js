var threeScene;
var renderer;
var camera;
var cameraControl;

// -- Simulation Stuff

var physicsScene = {
    gravity: new THREE.Vector3(0, -10, 0),
    dt: 1.0 / 60.,
    worldSize: {x: 1.5, z: 2.5},
    paused: true,
    objects: []
}

class Ball {
    constructor(pos, radius, vel, scene) {
        //  state
        this.pos = pos;
        this.radius = radius;
        this.vel = vel;

        // mesh
        var geometry = new THREE.SphereGeometry(radius, 32, 32);
        var material = new THREE.MeshPhongMaterial({color: 0xff0000});
        this.visMesh = new THREE.Mesh(geometry, material);
        this.visMesh.position.copy(pos);
        threeScene.add(this.visMesh);
    }

    simulate() {
        // v1 = v0 + dt*g
        this.vel.addScaledVector(physicsScene.gravity, physicsScene.dt);
        // x1 = x0 + dt*v1
        this.pos.addScaledVector(this.vel, physicsScene.dt);

        if (this.pos.x < -physicsScene.worldSize.x) {
            this.pos.x = -physicsScene.worldSize.x;
            this.vel.x = -this.vel.x;
        }
        if (this.pos.x > physicsScene.worldSize.x) {
            this.pos.x = physicsScene.worldSize.x;
            this.vel.x = -this.vel.x;
        }
        if (this.pos.z < -physicsScene.worldSize.z) {
            this.pos.z = -physicsScene.worldSize.z;
            this.vel.z = -this.vel.z;
        }
        if (this.pos.z > physicsScene.worldSize.z) {
            this.pos.z = physicsScene.worldSize.z;
            this.vel.z = -this.vel.z;
        }
        if (this.pos.y - this.radius < 0) {
            this.pos.y = this.radius;
            this.vel.y = - this.vel.y;
        }
        this.visMesh.position.copy(this.pos);
    }
}

function initPhysics(scene) {
    var radius = 0.2;
    var pos = new THREE.Vector3(radius, radius, radius);
    var vel = new THREE.Vector3(2.0, 5.0, 3.0);

    physicsScene.objects.push(new Ball(pos, radius, vel, scene));
}

// -----------------------
function simulate() {
    if (physicsScene.paused) return;
    for (var i = 0; i < physicsScene.objects.length; i++) {
        physicsScene.objects[i].simulate();
    }
}


// -- GUI STUFF
// -------------------------
function initThreeScene() {
    threeScene = new THREE.Scene();

    // Lights
    threeScene.add(new THREE.AmbientLight(0x000000));
   // threeScene.fog = new THREE.Fog(0x000000, 0, 15);

    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.angle = Math.PI / 5;
    spotLight.penumbra = 0.2;
    spotLight.position.set(2, 3, 3);
    spotLight.castShadow = true;
    spotLight.shadow.camera.near = 3;
    spotLight.shadow.camera.far = 10;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    threeScene.add(spotLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(0, 3, 0);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 1.0;
    dirLight.shadow.camera.far = 10;
    dirLight.shadow.camera.right = 1;
    dirLight.shadow.camera.left = -1;
    dirLight.shadow.camera.top = 1;
    dirLight.shadow.camera.bottom = -1;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    threeScene.add(dirLight);

    var ground = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(20, 20, 1, 1),
        new THREE.MeshPhongMaterial({color: 0xffffff, shininess: 150})
    )
    ground.rotation.x = -Math.PI / 2; // rotates X/Y to X/Z
    ground.receiveShadow = true;
    threeScene.add(ground);

    var helper = new THREE.GridHelper(20, 20);
    helper.material.opacity = 1.0;
    helper.material.transparent = true;
    helper.position.set(0, 0.002, 0);
    threeScene.add(helper);

    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(0.8 * window.innerWidth, 0.8* window.innerHeight);
    window.addEventListener('resize', onWindowResize, false);
    container.appendChild(renderer.domElement);

    // camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 1, 4);
    camera.updateMatrixWorld();
    threeScene.add(camera);

    cameraControl = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControl.zoomSpeed = 2.0;
    cameraControl.panSpeed = 0.4;

    // Objects
    // 1.0 = 1m
 //   var sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  //  var sphereMaterial = new THREE.MeshPhongMaterial({color: 0xff0000});
   // var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
   // sphere.position.set(0, 1, 0);
   // threeScene.add(sphere);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


function run() {
    var button = document.getElementById("buttonRun");
    if (physicsScene.paused) button.innerHTML = "Stop";
    else button.innerHTML = "Run";
    physicsScene.paused = !physicsScene.paused;
}

function restart() {
    location.reload();
}

function update() {
    simulate();
    renderer.render(threeScene, camera);
    cameraControl.update();

    requestAnimationFrame(update);
}

initThreeScene();
initPhysics();
update();