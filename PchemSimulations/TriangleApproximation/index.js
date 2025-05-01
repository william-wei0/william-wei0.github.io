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
    color2: [255, 165, 0],
    a: 1,
    thickness: 5,
    rainbow: false,
}

const background = {
    color: [0, 0, 0],
    a: 1,
    horizontal_lines: 5,
    tick_marks: 4
}

const simulation = {
    num_terms: 1,
    wave_amplitude: 400.0,
    well_width: canvas.width * 7/10,
    well_base_height: canvas.height * (8.5/10),
}

const WaveFolder = gui.addFolder('Colors')
WaveFolder.addColor(WaveColor, "color").name("Function Color")
WaveFolder.addColor(WaveColor, "color2").name("Approximation Color")
WaveFolder.add(WaveColor, 'a', 0, 1).name('Opacity')
WaveFolder.add(WaveColor, 'thickness', 1, 10).name('Line Thickness')

gui.add(simulation, 'num_terms', 1, 10).step(1).name('Number of Terms')


window.addEventListener('resize', function(event) {
    canvas.width = innerWidth 
    canvas.height = innerHeight
    simulation.well_width = canvas.width * 7/10
    simulation.well_base_height = well_base_height = canvas.height * (8.5/10)
}, true);


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
function drawFraction(ctx, numerator, denominator, x, y, fontSize = 24) {
    // Set font style
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    
    // Measure text widths
    const numWidth = ctx.measureText(numerator).width;
    const denomWidth = ctx.measureText(denominator).width;
    
    // Use the widest part for fraction bar
    const barWidth = Math.max(numWidth, denomWidth) + 10;
    
    // Draw numerator
    ctx.fillText(numerator, x + barWidth/2, y + fontSize);
    
    // Draw fraction bar
    ctx.beginPath();
    ctx.moveTo(x, y + fontSize + 5);
    ctx.lineTo(x + barWidth, y + fontSize + 5);
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw denominator
    ctx.fillText(denominator, x + barWidth/2, y + fontSize * 2);
}

function draw_equation(){
    c.font = "24px Arial";
    c.fillStyle = 'white';
    c.textAlign = 'center'
    let terms = [];
    let coeff = '';
    max_terms = 4;
    let num_terms_txt = simulation.num_terms;
    let ellipses = '';
    //c.fillText("y = x² + 3x + 2", canvas.width / 2, 40);
    if (simulation.num_terms > max_terms){
        num_terms_txt = max_terms
        ellipses = ' + ...'
    }

    for (let i = 0; i < num_terms_txt; i++) {
        let n = 2 * i + 1;
        let sign = (i % 2 === 0) ? '' : '- ';
        if (n == 1){
            n = '';
        }
        let term = `${sign}${coeff}sin(${n}πx/${'L'})`;
        terms.push(term);
    }
    const seriesString = 'y =       [' + terms.join(' + ').replace(/\+\s-\s/g, '- ') + ']' + ellipses;
    c.fillText(seriesString, canvas.width / 2, 100);

    const centerX = canvas.width / 2;
    const textWidth = c.measureText(seriesString).width;
    const startX = centerX - (textWidth-80) / 2;
    drawFraction(c, "4L", "π²", startX, 70);
    c.fillText("Eigenfunction Approximation of a Triangle Function", canvas.width / 2, 65);
}

function draw_labels(){
    c.font = "30px Arial";
    c.fillStyle = 'white';
    c.textAlign = 'center'
    c.fillText("X", canvas.width / 2, simulation.well_base_height + 40);
    c.fillText("0", left_boundary, simulation.well_base_height + 40);
    c.fillText("L", left_boundary + simulation.well_width, simulation.well_base_height + 40);



    c.save();
    c.translate(left_boundary - 25, simulation.well_base_height / 2);
    c.rotate(-Math.PI/2);
    c.fillText("Y",0,0);

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


function update() {
    ticks = Date.now() / MILLISECONDS_IN_SECOND;
    delta_time = ticks - g_previous_ticks;
    g_previous_ticks = ticks;

    frame_count += g_previous_ticks * ANIMATION_SPEED_SCALE * simulation.speed

    // Calculate left and right boundaries - Needed for drawing the grid
    left_boundary = (canvas.width - simulation.well_width) / 2.0;
    right_boundary = left_boundary + simulation.well_width;
    let box_length = right_boundary - left_boundary-200;

    // Set background color and draw background
    c.fillStyle = `rgba(${background.color[0]},${background.color[1]},${background.color[2]},${background.a})`
    c.fillRect(0, 0, canvas.width, canvas.height)
    draw_grid_horizontal()

    // Set Wavecolor and wave thickness
    c.strokeStyle = `rgba(${WaveColor.color[0]},${WaveColor.color[1]},${WaveColor.color[2]},${WaveColor.a})`
    c.lineWidth = WaveColor.thickness;

    c.beginPath()
    c.moveTo(left_boundary, simulation.well_base_height)

    for (let i = 0; i < points/2; i++) {

        x = i * simulation.well_width/points + left_boundary
        y = (box_length)*i/points;

        if (WaveColor.rainbow){
            hue = (y / simulation.wave_amplitude/1.8)*360 % 360
            c.strokeStyle = `hsl(${hue}, 100%, 50%)`
        }

        c.lineTo(x, simulation.well_base_height - y)
    }

    
    for (let i = points/2; i < points; i++) {

        x = i * simulation.well_width/points + left_boundary
        y = box_length*(1-i/points);

        if (WaveColor.rainbow){
            hue = (y / simulation.wave_amplitude/1.8)*360 % 360
            c.strokeStyle = `hsl(${hue}, 100%, 50%)`
        }


        c.lineTo(x, simulation.well_base_height - y)
    }


    c.stroke()


    c.beginPath()
    c.moveTo(left_boundary, simulation.well_base_height)
    for (let i = 0; i < points; i++) {
        
        x = i * simulation.well_width/points + left_boundary;
        y = 0;

        let sign = 1;
        
        for (let j = 0; j < simulation.num_terms; j++) {
            let n = 2*j+1;
            y += sign*Math.sin(n * Math.PI * i / (points))/(n*n);
            
            sign *= -1;
        }
        y *= 4*box_length/(Math.PI*Math.PI);

        if (WaveColor.rainbow){
            hue = (y / simulation.wave_amplitude/1.8)*360 % 360
            c.strokeStyle = `hsl(${hue}, 100%, 50%)`
        }


        c.lineTo(x, simulation.well_base_height - y)
    }
    
    c.strokeStyle = `rgba(${WaveColor.color2[0]},
                          ${WaveColor.color2[1]},
                          ${WaveColor.color2[2]},
                          ${WaveColor.a})`


    c.stroke()
    
    draw_well()
    draw_labels()
    draw_tick_marks()
    draw_equation()
    
    //drawFraction(ctx, "x+1", "y-2", 150, 30, 20);
}


function animate() {
    requestAnimationFrame(animate)
    update()    
}
animate()