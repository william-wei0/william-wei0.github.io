import * as THREE from 'three';
import * as dat from './dat.gui.module.js';
import * as transform from './TransformControls.js'
import { Stats } from './stats.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

var scene, camera, renderer, controls, rotation_controls, stats, gizmo;
var atom1_mesh, atom2_mesh, outlineMesh1, outlineMesh2, arrowMesh, center_bar_mesh;
var xAxis, yAxis, zAxis;
var xzgrid;

const gui = new dat.GUI( {width : 400} )
gui.domElement.id = 'gui';

const MILLISECONDS_IN_SECOND = 1000
const ANIMATION_SPEED_SCALE = 0.000000000002
var ticks, delta_time 
var g_previous_ticks = 0
var frame_count = 0

const atom1 = {
    color: [0, 60, 255],
    outline_color: [255, 255, 255], 
    size: 7,
    outline: true,
    dist_from_center: 5,
    position: new THREE.Vector3(0,0,0),
    geometry: null,
    material: null,
    mesh: null
}

const atom2 = {
    color: [0, 60, 255],
    outline_color: [255, 255, 255], 
    size: 7,
    outline: true, 
    dist_from_center: 5,
    position: new THREE.Vector3(0,0,0),
    geometry: null,
    material: null,
    mesh: null
}

const simulation = {
    alpha_angle: 0,
    beta_angle: 0,
    rotational_speed: 5,
    center_bar: true,
    enable_axis: true,
    enable_grid: true,
    enable_rotation_controls: false,
    rotation_matrix: new THREE.Euler(0,0,0),
    distance_between_atoms: 30,
}
//'rgb(0, 60, 255)'

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
    camera.position.set(0,50,70);
    camera.lookAt(scene.position);

    

    // RENDERER
    renderer = new THREE.WebGLRenderer( {antialias:true} );

    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    document.body.appendChild( renderer.domElement );

    // CAMERA CONTROLS
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingfactor = 0.001;

    rotation_controls = new transform.TransformControls( camera, renderer.domElement );
    rotation_controls.setMode( 'rotate' );
    rotation_controls.addEventListener( 'change', render );
    rotation_controls.addEventListener( 'dragging-changed', function ( event ) {

        controls.enabled = ! event.value;

    } );

    // STATISTICS
    stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.bottom = '0px';
	stats.domElement.style.zIndex = 100;
	document.body.appendChild( stats.domElement );

    // GUI
    const simulationFolder = gui.addFolder('Simulation Settings')
    var alpha_angle_cont = simulationFolder.add(simulation, 'alpha_angle', 0, 360).step(1).name('Phi (Φ)')
    var beta_angle_cont = simulationFolder.add(simulation, 'beta_angle', 0, 180).step(1).name('Theta (θ)')
    simulationFolder.add(simulation, 'rotational_speed', -10, 10).step(0.01).name('Rotational Speed')
    simulationFolder.add(simulation, 'center_bar', false,true).name('Show Center Bar')
    simulationFolder.add(simulation, 'enable_rotation_controls', false,true).name('Show Rotation Controls')
    simulationFolder.add(simulation, 'enable_axis', false,true).name('Enable XYZ Axis')
    simulationFolder.add(simulation, 'enable_grid', false,true).name('Enable XY Grid')
    
    const atom1Folder = gui.addFolder('Atom 1 Settings')
    atom1Folder.addColor(atom1, "color").name("Color")
    atom1Folder.addColor(atom1, "outline_color").name("Outline Color")
    atom1Folder.add(atom1, "outline", false, true).name("Show Outline")


    const atom2Folder = gui.addFolder('Atom 2 Settings')
    atom2Folder.addColor(atom2, "color").name("Color")
    atom2Folder.addColor(atom2, "outline_color").name("Outline Color")
    atom2Folder.add(atom2, "outline", false, true).name("Show Outline")

    
    var obj = { Click_here_to_reset:function(){ 
        console.log("A");
        alpha_angle_cont.setValue(0);
        beta_angle_cont.setValue(0);
        simulation.rotational_speed = 5;
        simulation.center_bar = true;
        simulation.enable_axis = false;
        simulation.enable_grid = true;
        simulation.enable_rotation_controls = true;
        simulation.rotation_matrix = new THREE.Euler(0,0,0);
        simulation.distance_between_atoms = 30;
        camera.position.set(0,50,70);
        camera.lookAt(scene.position);
        gui.updateDisplay()
    }};
    simulationFolder.add(obj,'Click_here_to_reset');


    // LIGHTS
    var light = new THREE.PointLight(0xffffff);
	light.position.set(0,0,0);
	scene.add(light);
    

    // ----- SHAPES -----

    // ATOM 1
    atom1.geometry = new THREE.SphereGeometry( atom1.size, 32, 16 ); 
    atom1.material = new THREE.MeshBasicMaterial( { color: `rgb(${atom1.color[0]},${atom1.color[1]},${atom1.color[2]})` } ); 
    atom1_mesh = new THREE.Mesh( atom1.geometry, atom1.material );
    scene.add( atom1_mesh );

    // ATOM 2
    atom2.geometry = new THREE.SphereGeometry( atom2.size, 32, 16 ); 
    atom2.material = new THREE.MeshBasicMaterial( { color: `rgb(${atom2.color[0]},${atom2.color[1]},${atom2.color[2]})` } ); 
    atom2_mesh = new THREE.Mesh( atom2.geometry, atom2.material );
    scene.add( atom2_mesh );
    
    // ATOM 1 OUTLINE
	var outlineMaterial1 = new THREE.MeshBasicMaterial( { color: "white", side: THREE.BackSide } );
	outlineMesh1 = new THREE.Mesh( atom1.geometry, outlineMaterial1 );

    const worldPosition = new THREE.Vector3();
    atom1_mesh.getWorldPosition( worldPosition )

	outlineMesh1.position.set(worldPosition.x, worldPosition.y, worldPosition.z); 
	outlineMesh1.scale.multiplyScalar(1.03);
	scene.add( outlineMesh1 );

    // ATOM 2 OUTLINE
    var outlineMaterial2 = new THREE.MeshBasicMaterial( { color: "white", side: THREE.BackSide } );
	outlineMesh2 = new THREE.Mesh( atom1.geometry, outlineMaterial2 );

    atom2_mesh.getWorldPosition( worldPosition )

	outlineMesh2.position.set(worldPosition.x, worldPosition.y, worldPosition.z); 
	outlineMesh2.scale.multiplyScalar(1.03);
	scene.add( outlineMesh2 );

    // VECTOR
        // ARROW SHAFT
    const cylinder_height = 20;
    const cylinder_radius = 0.4;

    const shaftGeometry = new THREE.CylinderGeometry(cylinder_radius, cylinder_radius, cylinder_height, 32);
    const shaftMatrix = new THREE.Matrix4().makeTranslation(0, cylinder_height / 2, 0);
    shaftGeometry.applyMatrix4(shaftMatrix);

        // ARROW HEAD
    const cone_radius = 1;
    const cone_height = 3;

    const coneGeometry = new THREE.ConeGeometry(cone_radius, cone_height, 32);
    const coneMatrix = new THREE.Matrix4().makeTranslation(0, cylinder_height, 0);
    coneGeometry.applyMatrix4(coneMatrix);
    
    const mergedGeometry = BufferGeometryUtils.mergeGeometries([shaftGeometry, coneGeometry]);
    const arrow_material = new THREE.MeshBasicMaterial({ color: "white" });
    arrowMesh = new THREE.Mesh(mergedGeometry, arrow_material);
    scene.add(arrowMesh);

    arrowMesh.scale.set(1,1,1);

    rotation_controls.attach( arrowMesh );
    gizmo = rotation_controls.getHelper();
    scene.add( gizmo );


    const center_bar_height = 2 * simulation.distance_between_atoms;
    const center_bar_radius = 0.2;

    const center_bar_geometry = new THREE.CylinderGeometry(center_bar_radius, center_bar_radius, center_bar_height, 32);
    const center_bar_material = new THREE.MeshBasicMaterial({ color: "White" });
    const center_bar_matrix = new THREE.Matrix4().makeRotationZ(Math.PI/2);
    center_bar_geometry.applyMatrix4(center_bar_matrix);
    center_bar_mesh = new THREE.Mesh(center_bar_geometry, center_bar_material);
    scene.add( center_bar_mesh );

    // ----- GRID -----
    xzgrid = new THREE.GridHelper(500, 50);
    scene.add(xzgrid);

    // Create materials for each axis
    const axis_radius = 0.1;
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

    alpha_angle_cont.onChange(function(value) {
        simulation.rotation_matrix.y = value * (Math.PI / 180);
        arrowMesh.rotation.y = value * (Math.PI / 180)
        alpha_angle_cont.updateDisplay()
    });

    beta_angle_cont.onChange(function(value) {
        simulation.rotation_matrix.z = -value * (Math.PI / 180);
        arrowMesh.rotation.z = -value * (Math.PI / 180)
        beta_angle_cont.updateDisplay()
    });

    // Add the axes to the scene
    scene.add(xAxis);
    scene.add(yAxis);
    scene.add(zAxis);
    
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

function showRotationControls() {rotation_controls.attach(arrowMesh);}
function hideRotationControls() {rotation_controls.detach();}

function showOutline(outline) {outline.visible = true;}
function hideOutline(outline) {outline.visible = false;}

function showCenterBar() {center_bar_mesh.visible = true;}
function hideCenterBar() {center_bar_mesh.visible = false;}

init()
animate()

function update()
{
    ticks = Date.now() / MILLISECONDS_IN_SECOND;
    delta_time = ticks - g_previous_ticks;
    g_previous_ticks = ticks;

    frame_count += g_previous_ticks * ANIMATION_SPEED_SCALE * simulation.rotational_speed;

    if (simulation.enable_axis){enableAxis();} else{disableAxis();}

    if (simulation.enable_grid){enableGrid();} else{disableGrid();}

    if (simulation.enable_rotation_controls){showRotationControls();} else{hideRotationControls();}

    if (simulation.center_bar) {showCenterBar()} else{hideCenterBar()}

    if (atom1.outline) {showOutline(outlineMesh1);} else {hideOutline(outlineMesh1);}
    if (atom2.outline) {showOutline(outlineMesh2);} else {hideOutline(outlineMesh2);}

    atom1_mesh.material.color.set(`rgb(${atom1.color[0]},${atom1.color[1]},${atom1.color[2]})`)
    atom2_mesh.material.color.set(`rgb(${atom2.color[0]},${atom2.color[1]},${atom2.color[2]})`)
    outlineMesh1.material.color.set(`rgb(${atom1.outline_color[0]},${atom1.outline_color[1]},${atom1.outline_color[2]})`)
    outlineMesh2.material.color.set(`rgb(${atom2.outline_color[0]},${atom2.outline_color[1]},${atom2.outline_color[2]})`)
    /*
    atom1_mesh.material.needsUpdate = true;
    atom2_mesh.material.needsUpdate = true;
    outlineMesh1.material.needsUpdate = true;
    outlineMesh2.material.needsUpdate = true;
    */

    let x1 = (atom1.dist_from_center + simulation.distance_between_atoms) 
        * Math.cos(-frame_count);
    
    let z1 = (atom1.dist_from_center + simulation.distance_between_atoms) 
        * Math.sin(-frame_count);

    let x2 = -(atom1.dist_from_center + simulation.distance_between_atoms) 
        * Math.cos(-frame_count)
        
    let z2 = -(atom1.dist_from_center + simulation.distance_between_atoms) 
            * Math.sin(-frame_count);

    atom1.position.set(x1, 0, z1); 
    atom2.position.set(x2, 0, z2); 

    const rotation_matrix = arrowMesh.rotation  

    atom1.position.applyEuler(rotation_matrix);
    atom2.position.applyEuler(rotation_matrix);
    
    atom1_mesh.position.set(atom1.position.x, atom1.position.y, atom1.position.z);
    atom2_mesh.position.set(atom2.position.x, atom2.position.y, atom2.position.z);

    center_bar_mesh.rotation.copy(rotation_matrix);
    center_bar_mesh.rotateY(frame_count);

    arrowMesh.scale.set(1,simulation.rotational_speed/5,1)

    const worldPosition = new THREE.Vector3();
    atom1_mesh.getWorldPosition( worldPosition )
	outlineMesh1.position.set(worldPosition.x, worldPosition.y, worldPosition.z); 

    atom2_mesh.getWorldPosition( worldPosition )
	outlineMesh2.position.set(worldPosition.x, worldPosition.y, worldPosition.z); 
    
	controls.update();
	stats.update();
}


function render() 
{
	renderer.render( scene, camera );
}

function animate() {
    requestAnimationFrame( animate );
    update();
	render();
}