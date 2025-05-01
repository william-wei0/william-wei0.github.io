const canvas = document.querySelector('canvas')
const gui = new dat.GUI( {width : 300} )
gui.domElement.id = 'gui';

const c = canvas.getContext('2d')
canvas.width = window.innerWidth
canvas.height = window.innerHeight - 5
const MILLISECONDS_IN_SECOND = 1000
const ANIMATION_SPEED_SCALE = 0.00000000000001
g_previous_ticks = 0
frame_count = 0
points = 4500
hue = 0
any_combination = false

const WaveColor = {
    color: [28, 90, 190],
    a: 1,
    thickness: 5,
    rainbow: false,
    filled: true
}

const background = {
    color: [0, 0, 0],
    a: 1,
    horizontal_lines: 5,
    tick_marks: 4
}

const simulation = {
    n: 1,
    n_proportion: 0.5,
    n_sqrt_proportion: 1/Math.SQRT2,
    m: 2,
    m_proportion: 0.5,
    m_sqrt_proportion: 1/Math.SQRT2,
    speed: 400,
    wave_amplitude: 300.0,
    well_width: canvas.width * 7/10,
    well_base_height: canvas.height * (8.5/10),
}

const backgroundFolder = gui.addFolder('Background and Grid')
backgroundFolder.addColor(background, "color").name("BackGround Color")
backgroundFolder.add(background, 'a', 0.1, 1).step(0.01).name('Opacity')
backgroundFolder.add(background, 'horizontal_lines', 0, 10).step(1).name('Horizontal Lines')
backgroundFolder.add(background, 'tick_marks', 0, 10).step(1).name('X-axis ticks')

const WaveFolder = gui.addFolder('Wave Color')
WaveFolder.addColor(WaveColor, "color").name("Wave Color")
WaveFolder.add(WaveColor, 'a', 0, 1).name('Opacity')
WaveFolder.add(WaveColor, 'thickness', 1, 10).name('Wave Thickness')
WaveFolder.add(WaveColor, 'filled', true, false).name('Filled Wave')
WaveFolder.add(WaveColor, 'rainbow', true, false).name('Rainbow Filled Wave')

const simulationFolder = gui.addFolder('Simulation Settings')
simulationFolder.add(simulation, 'speed', 1, 1000).name('Simulation Speed')
sim_n_cont = simulationFolder.add(simulation, 'n', 1, 20).step(1).name('Energy Level (n)')
sim_m_cont = simulationFolder.add(simulation, 'm', 2, 21).step(1).name('Energy Level (m)')
sim_n_prop_cont = simulationFolder.add(simulation, 'n_proportion', 0, 1).step(0.01).name('n proportion')
sim_m_prop_cont = simulationFolder.add(simulation, 'm_proportion', 0, 1).step(0.01).name('m proportion')
simulationFolder.add(simulation, 'well_width', 1, canvas.width-200).name('Well Width')


window.addEventListener('resize', function(event) {
    canvas.width = innerWidth 
    canvas.height = innerHeight
    simulation.well_width = canvas.width * 7/10
    simulation.well_base_height = well_base_height = canvas.height * (8.5/10)
}, true);


function input(){
    if (!any_combination){
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
    })}
}


function draw_grid_horizontal(){
    c.lineWidth = 1;

    for (let i = 0; i < background.horizontal_lines; i++) {
        
        c.beginPath()
        c.moveTo(left_boundary, simulation.well_base_height * i / background.horizontal_lines)
        c.lineTo(right_boundary, simulation.well_base_height * i / background.horizontal_lines)
    
        c.strokeStyle = `rgba(200, 200, 200, 0.5)`
        c.stroke();

    }

    c.lineWidth = 1.0;

}


function draw_tick_marks(){
    c.lineWidth = 2;

    for (let i = 1; i < background.tick_marks ; i++) {
        x = left_boundary + simulation.well_width * i / background.tick_marks  

        c.beginPath()
        c.moveTo(x, simulation.well_base_height - 8)
        c.lineTo(x, simulation.well_base_height + 8)
    
        c.strokeStyle = `rgba(200, 200, 200, 1)`
        c.stroke();

    }

    c.lineWidth = 1.0;

}


function draw_labels(){
    c.font = "30px Arial";
    c.fillStyle = 'white';
    c.textAlign = 'center'
    c.fillText("Position", canvas.width / 2, simulation.well_base_height + 40);
    c.fillText("0", left_boundary, simulation.well_base_height + 40);
    c.fillText("L", left_boundary + simulation.well_width, simulation.well_base_height + 40);

    c.save();
    c.translate(left_boundary - 25, simulation.well_base_height / 2);
    c.rotate(-Math.PI/2);
    c.fillText("Probability Density |ψ|\u00B2",0,0);

    c.restore();
}


function draw_well(){
    c.lineWidth = 4;

    c.beginPath()
    c.moveTo(left_boundary, 0)
    c.lineTo(left_boundary, simulation.well_base_height)
    c.lineTo(right_boundary, simulation.well_base_height)
    c.lineTo(right_boundary, 0)

    c.strokeStyle = `rgba(200, 200, 200)`
    c.stroke();
    c.lineWidth = 1.0;
}


function drawFilledWave() {
    c.beginPath()
    c.moveTo(x, simulation.well_base_height)
    c.lineTo(x, simulation.well_base_height - y)
    c.stroke()
}


function update() {
    ticks = Date.now() / MILLISECONDS_IN_SECOND;
    delta_time = ticks - g_previous_ticks;
    g_previous_ticks = ticks;

    frame_count += g_previous_ticks * ANIMATION_SPEED_SCALE * simulation.speed

    // Calculate left and right boundaries - Needed for drawing the grid
    left_boundary = (canvas.width - simulation.well_width) / 2.0
    right_boundary = left_boundary + simulation.well_width

    // Set background color and draw background
    c.fillStyle = `rgba(${background.color[0]},${background.color[1]},${background.color[2]},${background.a})`
    c.fillRect(0, 0, canvas.width, canvas.height)
    draw_grid_horizontal()

    // Set Wavecolor and wave thickness
    c.strokeStyle = `rgba(${WaveColor.color[0]},${WaveColor.color[1]},${WaveColor.color[2]},${WaveColor.a})`
    c.lineWidth = WaveColor.thickness;

    c.beginPath()
    c.moveTo(left_boundary, simulation.well_base_height)

    for (let i = 0; i < points; i++) {

        x = i * simulation.well_width/points + left_boundary
        y = simulation.wave_amplitude 
        *( simulation.n_proportion * Math.sin(i/points * simulation.n * Math.PI) ** 2
        +  simulation.m_proportion * Math.sin(i/points * simulation.m * Math.PI) ** 2
        +  simulation.n_sqrt_proportion * simulation.m_sqrt_proportion 
              * Math.sin(i/points * simulation.n * Math.PI)
              * Math.sin(i/points * simulation.m * Math.PI)
              * Math.cos((simulation.m**2 - simulation.n**2) * frame_count * Math.PI))

        if (WaveColor.rainbow){
            hue = (y / simulation.wave_amplitude/1.8)*360 % 360
            c.strokeStyle = `hsl(${hue}, 100%, 50%)`
        }

        if (WaveColor.filled)
            drawFilledWave()
        else
            c.lineTo(x, simulation.well_base_height - y)
    }

    if (!WaveColor.filled){
        c.stroke()
    }
    
    draw_well()
    draw_labels()
    draw_tick_marks()
}


function animate() {
    requestAnimationFrame(animate)
    input()
    update()
}
animate()