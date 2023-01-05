'use strict';

let gl; // The webgl context.
let surface; // A surface model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse.
let xVal = 1;
let yVal = 0;
let zVal = 0;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function({vertexList, normalList}) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexList), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalList), gl.STREAM_DRAW);


        this.count = vertexList.length / 3;
    }

    this.Draw = function() {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);


        gl.drawArrays(gl.TRIANGLES_STRIP, 0, this.count);

    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    this.iAttribVertex = -1;
    this.iColor = -1;

    this.iModelViewProjectionMatrix = -1;

    this.iAttribNormal = -1;
    this.iNormalMatrix = -1;

    this.iAmbientColor = -1;
    this.iDiffuseColor = -1;

    this.iShininess = -1;
    this.iLightDir = -1;

    this.Use = function () {
    gl.useProgram(this.prog);
    };
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const lDir = [xVal, yVal, zVal];

    /* Set the values of the projection transformation */
    const projection = m4.orthographic(-10, 10, -10, 10, -40, 40);

    /* Get the view matrix from the SimpleRotator object.*/
    const modelView = spaceball.getViewMatrix();

    const rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    const translateToPointZero = m4.translation(0, 0, -10);

    const matAccum0 = m4.multiply(rotateToPointZero, modelView);
    const matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    const modelViewProjection = m4.multiply(projection, matAccum1);

    const modelviewInv = m4.inverse(matAccum1, new Float32Array(16));
    const normalMatrix = m4.transpose(modelviewInv, new Float32Array(16));

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    gl.uniform1f(shProgram.iShininess, 2.0);
    gl.uniform3fv(shProgram.iLightDir, lDir);
    gl.uniform3fv(shProgram.iAmbientColor, [0.2, 0.1, 0.0]);
    gl.uniform3fv(shProgram.iDiffuseColor, [1.0, 1.0, 0.0]);

    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

    surface.Draw();
}

function rerender() {
    surface.BufferData(CreateSurfaceData());
    draw();
  }

function CreateSurfaceData() {
    const step = .5;
    const min = -180;
    const max = 180;

    function f(u, v) {
    return Math.acos(-3 * (Math.cos(u) + Math.cos(v)) / (3 + 4 * Math.cos(u) * Math.cos(v)));
    }

    let vertexList = [];
    let normalList = [];
    for (let u = min; u < max; u += step) {
        const uRad = deg2rad(u);
        for (let v = min; v <= max; v += step) {
            const vRad = deg2rad(v);

            const h = 0.0001;

            const df_du = (f(uRad + h, vRad) - f(uRad, vRad)) / deg2rad(h);
            const df_dv = (f(uRad, vRad + h) - f(uRad, vRad)) / deg2rad(h);

            const plusTangentU = m4.normalize([1, vRad, df_du]);
            const plusTangentV = m4.normalize([uRad, 1, df_dv]);
            const minusTangentU = m4.normalize([1, vRad, -df_du]);
            const minusTangentV = m4.normalize([uRad, 1, -df_dv]);

            const plusNormal = m4.normalize(m4.cross(plusTangentU, plusTangentV));
            const minusNormal = m4.normalize(m4.cross(minusTangentU, minusTangentV));

            vertexList.push(uRad, vRad, f(uRad, vRad));
            vertexList.push(uRad, vRad, -f(uRad, vRad));
            normalList.push(plusNormal[0], plusNormal[1], plusNormal[2]);
            normalList.push(minusNormal[0], minusNormal[1], minusNormal[2]);
    }
}

  return { vertexList, normalList };

}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, 'vertex');
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, 'ModelViewProjectionMatrix');
    shProgram.iColor = gl.getUniformLocation(prog, 'color');

    shProgram.iAttribNormal = gl.getAttribLocation(prog, 'normal');
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, 'normalMatrix');

    shProgram.iAmbientColor = gl.getUniformLocation(prog, 'ambientColor');
    shProgram.iDiffuseColor = gl.getUniformLocation(prog, 'diffuseColor');

    shProgram.iShininess = gl.getUniformLocation(prog, 'shininessVal');

    shProgram.iLightDir = gl.getUniformLocation(prog, 'lightDir');

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL(); // initialize the WebGL graphics context
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}

const onArrowLeftKeyX = () => {
    if (xVal < -25){
        xVal = -25;
        draw();
    }
    else if (xVal > 25) {
        xVal = 25;
    }
    xVal -= 1;
    draw();
}

const onArrowRightKeyX = () => {
    if (xVal < -25){
        xVal = -25;
        draw();
    }
    else if (xVal > 25) {
        xVal = 25;
    }
    xVal += 1;
    draw();
}

const onArrowLeftKeyY = () => {
    if (yVal < -25){
        yVal = -25;
        draw();
    }
    else if (yVal > 25) {
        yVal = 25;
    }
    yVal -= 1;
    draw();
}

const onArrowRightKeyY = () => {
    if (yVal < -25){
        yVal = -25;
        draw();
    }
    else if (yVal > 25) {
        yVal = 25;
    }
    yVal += 1;
    draw();
}


const onArrowLeftKeyZ = () => {
    if (zVal < -25){
        zVal = -25;
        draw();
    }
    else if (zVal > 25) {
        zVal = 25;
    }
    zVal -= 1;
    draw();
}

const onArrowRightKeyZ = () => {
    if (zVal < -25){
        zVal = -25;
        draw();
    }
    else if (zVal > 25) {
        zVal = 25;
    }
    zVal += 1;
    draw();
}

let keysPressed = {};
document.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true;
 
    if (keysPressed['x'] && event.key == 'ArrowLeft') {
        onArrowLeftKeyX();
    }
    if (keysPressed['x'] && event.key == 'ArrowRight') {
        onArrowRightKeyX();
    }
    if (keysPressed['y'] && event.key == 'ArrowLeft') {
        onArrowLeftKeyY();
    }
    if (keysPressed['y'] && event.key == 'ArrowRight') {
        onArrowRightKeyY();
    }
    if (keysPressed['z'] && event.key == 'ArrowLeft') {
        onArrowLeftKeyZ();
    }
    if (keysPressed['z'] && event.key == 'ArrowRight') {
        onArrowRightKeyZ();
    }
 });
 
 document.addEventListener('keyup', (event) => {
    delete keysPressed[event.key];
 });