import * as THREE from 'three';
import * as dat from './dat.gui.module.js';
import * as transform from './TransformControls.js'
import { Stats } from './stats.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

var scene, camera, renderer, controls, stats, sim_n_prop_cont, sim_m_prop_cont;
var points;
var xAxis, yAxis, zAxis;
var xzgrid;
const NUMPOINTS = 700000;
const distance_from_origin_setup = [];

const gui = new dat.GUI( {width : 400} )
gui.domElement.id = 'gui';

const MILLISECONDS_IN_SECOND = 1000
const ANIMATION_SPEED_SCALE = 0.00000000002
var ticks, delta_time 
var g_previous_ticks = 0
var frame_count = 0

const simulation = {
    threshold: 0.5,
    speed: 1,
    n_proportion: 0.5,
    n_sqrt_proportion: 1/Math.SQRT2,
    m_proportion: 0.5,
    m_sqrt_proportion: 1/Math.SQRT2,
}

const settings = {
    center_bar: true,
    enable_axis: true,
    enable_grid: true,
    enable_rotation_controls: false,
    rotation_matrix: new THREE.Euler(0,0,0),
    distance_between_atoms: 30,
}

window.addEventListener('resize', function(event) {
    var SCREEN_WIDTH = window.innerWidth;
    var SCREEN_HEIGHT = window.innerHeight;
    var ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT

    camera.aspect = ASPECT;
    camera.updateProjectionMatrix();
    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
}, true);


function init(){
    // SCENE
    scene = new THREE.Scene();

    // CAMERA
    var SCREEN_WIDTH = window.innerWidth; 
    var SCREEN_HEIGHT = window.innerHeight;
	var VIEW_ANGLE = 75;
    var ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT
    var NEAR = 0.1; 
    var FAR = 200000;

    camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR)
    scene.add(camera);
    camera.position.set(6,3,6);
    camera.lookAt(scene.position);
    

    // RENDERER
    renderer = new THREE.WebGLRenderer( {antialias:true} );

    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    document.body.appendChild( renderer.domElement );

    // CAMERA CONTROLS
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingfactor = 0.001;

    // STATISTICS
    stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.bottom = '0px';
	stats.domElement.style.zIndex = 100;
	document.body.appendChild( stats.domElement );

    // GUI

    
    const simulationFolder = gui.addFolder('Simulation Settings')
    simulationFolder.add(simulation, 'threshold', 0.4, 0.95).step(0.01).name('Probability Threshold')
    simulationFolder.add(simulation, 'speed', 0, 1).step(0.01).name('Animation Speed')
    sim_n_prop_cont = simulationFolder.add(simulation, 'n_proportion', 0, 1).step(0.01).name('1s proportion')
    sim_m_prop_cont = simulationFolder.add(simulation, 'm_proportion', 0, 1).step(0.01).name('2pz proportion')
    
    const settingsFolder = gui.addFolder('Settings')
    settingsFolder.add(settings, 'enable_axis', false,true).name('Enable XYZ Axis')
    settingsFolder.add(settings, 'enable_grid', false,true).name('Enable XY Grid')

    var obj = { Click_here_to_reset:function(){ 
        simulation.speed = 5;
        settings.enable_axis = false;
        settings.enable_grid = true;
        camera.position.set(0,3,15);
        camera.lookAt(scene.position);
        gui.updateDisplay()
    }};
    settingsFolder.add(obj,'Click_here_to_reset');


    // LIGHTS
    var light = new THREE.PointLight(0xffffff);
	light.position.set(0,0,0);
	scene.add(light);

    
    // ----- GRID -----
    xzgrid = new THREE.GridHelper(50, 50);
    scene.add(xzgrid);

    // Create materials for each axis
    const axis_radius = 0.05;
    const axis_length = 10000;

    const xAxisMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red for X
    const yAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green for Y
    const zAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // Blue for Z

    // Create geometries for each axis
    const AxisGeometry = new THREE.CylinderGeometry(axis_radius, axis_radius, axis_length, 12);

    // Create lines for each axis
    xAxis = new THREE.Mesh(AxisGeometry, xAxisMaterial);
    yAxis = new THREE.Mesh(AxisGeometry, yAxisMaterial);
    zAxis = new THREE.Mesh(AxisGeometry, zAxisMaterial);

    xAxis.rotateZ(Math.PI/2);
    zAxis.rotateX(Math.PI/2);


    // Add the axes to the scene
    scene.add(xAxis);
    scene.add(yAxis);
    scene.add(zAxis);
    
    // ----- SHAPES -----
    const a = 1

    const positions = [];
    const wavefunction_1s_at_point = [];
    const wavefunction_2pz_at_point = [];
    const theta = [];
    const geometry = new THREE.BufferGeometry();
    const isActive = new Float32Array(NUMPOINTS); // 1 = visible, 0 = hidden
    for (let i = 0; i < NUMPOINTS; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      const distance = Math.sqrt(x*x + y*y + z*z)
      
      isActive[i] = Math.random() > 0.5 ? 1.0 : 0.0;
      distance_from_origin_setup[i] = distance;
      theta[i] = Math.atan2(Math.sqrt(x*x + z*z) , y);
      positions.push(x, y, z);

      //wavefunction_1s_at_point[i] = Math.E**(-distance);
      //wavefunction_2pz_at_point[i] = Math.cos(theta[i])*distance*Math.E**(-distance/2);

      wavefunction_1s_at_point[i] = Math.E**(-distance);
      wavefunction_2pz_at_point[i] = 0.6*distance*Math.E**(-distance/2)*Math.cos(theta[i]);
    }
  
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('distance_from_origin', new THREE.Float32BufferAttribute(distance_from_origin_setup, 1));
    geometry.setAttribute('theta', new THREE.Float32BufferAttribute(theta, 1));
    geometry.setAttribute('isActive', new THREE.BufferAttribute(isActive, 1));

    geometry.setAttribute('wavefunction_1s_at_point', new THREE.Float32BufferAttribute(wavefunction_1s_at_point, 1));
    geometry.setAttribute('wavefunction_2pz_at_point', new THREE.Float32BufferAttribute(wavefunction_2pz_at_point, 1));

    // === Shader Material with discard ===
    const material = new THREE.ShaderMaterial({
    vertexShader: `
        attribute float isActive;
        varying float vIsActive;

        void main() {
        vIsActive = isActive;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 6.0;
        }
    `,
    fragmentShader: `
        varying float vIsActive;

        void main() {
        if (vIsActive < 0.5) discard;
        gl_FragColor = vec4(0.2, 0.8, 1.0, 1.0);
        }
    `,
    transparent: true,
    });


    points = new THREE.Points(geometry, material);
    scene.add(points);


}

function enableAxis(){
    xAxis.visible = true;
    yAxis.visible = true;
    zAxis.visible = true;
}
function disableAxis(){
    xAxis.visible = false;
    yAxis.visible = false;
    zAxis.visible = false;
}

function enableGrid(){xzgrid.visible = true;}
function disableGrid(){xzgrid.visible = false;}


init()
animate()

function input(){

    sim_n_prop_cont.onChange(function(newValue) {
    simulation.m_proportion = 1 - newValue
    simulation.m_sqrt_proportion = Math.sqrt(1 - newValue)
    simulation.n_sqrt_proportion = Math.sqrt(newValue)
    
    sim_n_prop_cont.updateDisplay()
    sim_m_prop_cont.updateDisplay()
} )

sim_m_prop_cont.onChange(function(newValue) {
    simulation.n_proportion = 1 - newValue
    simulation.m_sqrt_proportion = Math.sqrt(newValue)
    simulation.n_sqrt_proportion = Math.sqrt(1 - newValue)
    sim_n_prop_cont.updateDisplay()
    sim_m_prop_cont.updateDisplay()
    })
}


function update()
{
    ticks = Date.now() / MILLISECONDS_IN_SECOND;
    delta_time = ticks - g_previous_ticks;
    g_previous_ticks = ticks;

    frame_count += g_previous_ticks * ANIMATION_SPEED_SCALE * simulation.speed;

    if (settings.enable_axis){enableAxis();} else{disableAxis();}

    if (settings.enable_grid){enableGrid();} else{disableGrid();}

    //const distance_from_origin = points.geometry.attributes.distance_from_origin;
    //const theta = points.geometry.attributes.theta;
    const is_active = points.geometry.attributes.isActive;
    //const pos = points.geometry.attributes.position;
    //console.log(Math.E**-distance_from_origin.array[0])
    //console.log(is_active[0])

    const wavefunction_1s_at_point = points.geometry.attributes.wavefunction_1s_at_point;
    const wavefunction_2pz_at_point = points.geometry.attributes.wavefunction_2pz_at_point;


    for (let i = 0; i < NUMPOINTS; i++) {
        
        if (simulation.n_proportion * wavefunction_1s_at_point.array[i] ** 2 + 
            simulation.m_proportion * wavefunction_2pz_at_point.array[i] ** 2 + 
            simulation.n_proportion * simulation.m_proportion *
            wavefunction_1s_at_point.array[i] * wavefunction_2pz_at_point.array[i] * Math.cos(frame_count) > simulation.threshold/10){
            is_active.array[i] = 1
        }
        else{
            is_active.array[i] = 0
        }
    }
    is_active.needsUpdate = true;
    
	controls.update();
	stats.update();
}


function render() 
{
	renderer.render( scene, camera );
}

function animate() {
    requestAnimationFrame( animate );
    input();
    update();
	render();
}
