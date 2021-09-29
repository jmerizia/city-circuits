// import { debounce } from 'debounce';
import React, { useEffect, useRef, useState } from 'react';
import { range, zip } from '../utils';
import { kdTree } from 'kd-tree-javascript';


const MAX_ZOOM = 1000;
const MIN_ZOOM = 0.5;


function arrayMin<T>(v: T[]): T {
    let min = v[0];
    for (let i = 1; i < v.length; i++) {
        if (v[i] < min) {
            min = v[i];
        }
    }
    return min;
}

function arrayMax<T>(v: T[]): T {
    let max = v[0];
    for (let i = 1; i < v.length; i++) {
        if (v[i] > max) {
            max = v[i];
        }
    }
    return max;
}

function convertToWebGLCoords(v: number, dataWidth: number): number {
    return v / dataWidth * 2 - 1;
}

function distance(
    a: { x: number, y: number, idx: number },
    b: { x: number, y: number, idx: number }
): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

interface FastScatterProps {
    x: number[];
    y: number[];
    width: number;
    height: number;
    marker?: {
        size?: number;
    },
    selectedIdx: number | null,
    onChangeSelectedIdx?: (idx: number | null) => void;
}

/**
 * Custom WebGL / KD-Tree optimized scatter plot for rendering millions of points.
 */
function FastScatter({ x, y, width, height, marker, selectedIdx, onChangeSelectedIdx }: FastScatterProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [xMin, setXMin] = useState(0);
    const [xMax, setXMax] = useState(0);
    const [yMin, setYMin] = useState(0);
    const [yMax, setYMax] = useState(0);
    const [zoom, setZoom] = useState<number>(1);
    const [centerX, setCenterX] = useState<number>(0);
    const [centerY, setCenterY] = useState<number>(0);
    const [mouseX, setMouseX] = useState<number>(0);
    const [mouseY, setMouseY] = useState<number>(0);
    const [dragStartMouseX, setDragStartMouseX] = useState<number>(0);
    const [dragStartMouseY, setDragStartMouseY] = useState<number>(0);
    const [dragStartCenterX, setDragStartCenterX] = useState<number>(0);
    const [dragStartCenterY, setDragStartCenterY] = useState<number>(0);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [hoveringIdx, setHoveringIdx] = useState<number | null>(null);
    const uniformsRef = useRef<{
        center: WebGLUniformLocation,
        zoom: WebGLUniformLocation,
    } | null>(null);
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const indicesRef = useRef<number[] | null>(null);
    const kdTreeRef = useRef<kdTree<{ x: number, y: number, idx: number }> | null>(null);

    // choose these to fit the data
    const maxSize = (xMax - xMin) > (yMax - yMin) ? (xMax - xMin) : (yMax - yMin);
    const dataWidth = maxSize * 1.2;
    const dataHeight = dataWidth * height / width;

    const localDataWidth = dataWidth / zoom;
    const localDataHeight = dataHeight / zoom;
    const localLeft = centerX - localDataWidth / 2;
    const localRight = centerX + localDataWidth / 2;
    const localBottom = centerY - localDataHeight / 2;
    const localTop = centerY + localDataHeight / 2;

    const markerSize = marker?.size ?? 3;

    // build the kd tree
    useEffect(() => {
        const points = zip(x, y).map(([x, y], idx) => ({ x, y, idx }));
        const tree = new kdTree(points, distance, ['x', 'y']);
        kdTreeRef.current = tree;
    }, [x, y]);

    useEffect(() => {
        if (canvasRef.current) {
            const gl = canvasRef.current.getContext('webgl');
            if (!gl) return;
            glRef.current = gl;
            // this lets us use 2^32 indices
            gl.getExtension('OES_element_index_uint');
            // normalize x and y
            const normalizedX = x.map(x0 => convertToWebGLCoords(x0, dataWidth));
            const normalizedY = y.map(y0 => convertToWebGLCoords(y0, dataHeight));
            const vertices: number[] = [];
            for (let i = 0; i < x.length; i++) vertices.push(normalizedX[i], normalizedY[i]);
            const indices = range(0, x.length);
            indicesRef.current = indices;

            // set up buffers
            const pointsVertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, pointsVertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            const pointsIndexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pointsIndexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

            // set up shaders
            const shaders = {
                points: {
                    vs: `
                        attribute vec2 coordinates;
                        uniform vec2 center;
                        uniform float zoom;
                        void main() {
                            gl_Position = vec4(
                                (coordinates - center) * zoom,
                                0.0,
                                1.0
                            );
                            gl_PointSize = 5.0;
                        }
                    `,
                    fs: `
                        void main() {
                            gl_FragColor = vec4(0.0, 0.5, 0.0, 1);
                        }
                    `,
                },
            }

            const pointsVertShader = gl.createShader(gl.VERTEX_SHADER);
            if (!pointsVertShader) return;
            gl.shaderSource(pointsVertShader, shaders.points.vs);
            gl.compileShader(pointsVertShader);
            const pointsFragShader = gl.createShader(gl.FRAGMENT_SHADER);
            if (!pointsFragShader) return;
            gl.shaderSource(pointsFragShader, shaders.points.fs);
            gl.compileShader(pointsFragShader);
            var pointsShaderProgram = gl.createProgram();
            if (!pointsShaderProgram) return;
            gl.attachShader(pointsShaderProgram, pointsVertShader);
            gl.attachShader(pointsShaderProgram, pointsFragShader);
            gl.linkProgram(pointsShaderProgram);
            gl.useProgram(pointsShaderProgram);

            // point the buffers to the locations in the program
            gl.bindBuffer(gl.ARRAY_BUFFER, pointsVertexBuffer);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pointsIndexBuffer);
            var coord = gl.getAttribLocation(pointsShaderProgram, "coordinates");
            gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(coord);

            gl.clearColor(1, 1, 1, 10);
            gl.enable(gl.DEPTH_TEST);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.viewport(0, 0, canvasRef.current.width, canvasRef.current.height);

            // uniforms
            const centerUniform = gl.getUniformLocation(pointsShaderProgram, "center");
            const zoomUniform = gl.getUniformLocation(pointsShaderProgram, "zoom");
            if (!centerUniform || !zoomUniform) return;
            uniformsRef.current = {
                center: centerUniform,
                zoom: zoomUniform,
            };
        }
    }, [canvasRef, x, y, marker]);

    // start the loop
    useEffect(() => {
        let frameId: number | null = null;
        const render = (time: number) => {
            if (glRef.current && uniformsRef.current && indicesRef.current) {
                const gl = glRef.current;
                const indices = indicesRef.current;
                const normalizedCenterX = convertToWebGLCoords(centerX, dataWidth);
                const normalizedCenterY = convertToWebGLCoords(centerY, dataHeight);
                gl.uniform2fv(uniformsRef.current.center, [normalizedCenterX, normalizedCenterY]);
                gl.uniform1f(uniformsRef.current.zoom, zoom);
                gl.drawElements(gl.POINTS, indices.length, gl.UNSIGNED_INT, 0);
            }
            frameId = window.requestAnimationFrame(render);
        }
        frameId = window.requestAnimationFrame(render);
        // stop the loop if we unmount
        return () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [glRef, indicesRef, centerX, centerY, zoom, dataWidth, dataHeight]);

    // initialize
    useEffect(() => {
        const xMin = arrayMin(x);
        const xMax = arrayMax(x);
        const yMin = arrayMin(y);
        const yMax = arrayMax(y);
        setXMin(xMin);
        setXMax(xMax);
        setYMin(yMin);
        setYMax(yMax);
        setCenterX(0);
        setCenterY(0);
    }, [x, y]);

    useEffect(() => {
        const onWheel = (e: WheelEvent) => {
            if (canvasRef.current &&
                mouseX >= 0 &&
                mouseX <= canvasRef.current.width &&
                mouseY >= 0 &&
                mouseY <= canvasRef.current.height)
            {
                e.preventDefault();
                const delta = e.deltaY;
                const newZoom = Math.min(Math.max(zoom - delta / 300 * zoom, MIN_ZOOM), MAX_ZOOM);
                // move the center proportionally to the current mouse position
                setZoom(newZoom);
            }
        };
        const onMouseMove = (e: MouseEvent) => {
            if (canvasRef.current) {
                // get mouse position relative to canvas
                const rect = canvasRef.current.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                setMouseX(mouseX);
                setMouseY(mouseY);
                // update the offset
                if (mouseX >= 0 &&
                    mouseX <= canvasRef.current.width &&
                    mouseY >= 0 &&
                    mouseY <= canvasRef.current.height)
                {
                    if (isDragging) {
                        // pan from drag start to current mouse position
                        const dx = (mouseX - dragStartMouseX) / width * dataWidth;
                        const dy = (mouseY - dragStartMouseY) / height * dataHeight;
                        const newCenterX = dragStartCenterX - dx / zoom;
                        const newCenterY = dragStartCenterY + dy / zoom;
                        setCenterX(newCenterX);
                        setCenterY(newCenterY);
                    } else {
                        // update the hovering index
                        if (kdTreeRef.current) {
                            // translate mouse back into data coordinates
                            const localX = mouseX / width;
                            const localY = (height - mouseY) / height;
                            const mouseDataX = localDataWidth * localX + centerX - localDataWidth / 2;
                            const mouseDataY = localDataHeight * localY + centerY - localDataHeight / 2;
                            const point = { x: mouseDataX, y: mouseDataY, idx: 0 };
                            const closestPoints = kdTreeRef.current.nearest(point, 1);
                            if (closestPoints.length > 0) {
                                const [closestPoint, dist] = closestPoints[0];
                                if (dist < 0.5) {
                                    setHoveringIdx(closestPoint.idx);
                                } else {
                                    setHoveringIdx(null);
                                }
                            }
                        }
                    }
                }
            }
        };
        const onMouseDown = (e: MouseEvent) => {
            if (canvasRef.current &&
                mouseX >= 0 &&
                mouseX <= canvasRef.current.width &&
                mouseY >= 0 &&
                mouseY <= canvasRef.current.height)
            {
                setDragStartMouseX(mouseX);
                setDragStartMouseY(mouseY);
                setDragStartCenterX(centerX);
                setDragStartCenterY(centerY);
                setIsDragging(true);
            }
        };
        const onMouseUp = (e: MouseEvent) => {
            if (canvasRef.current &&
                mouseX >= 0 &&
                mouseX <= canvasRef.current.width &&
                mouseY >= 0 &&
                mouseY <= canvasRef.current.height)
            {
                // if we haven't moved the mouse, then we clicked
                if (onChangeSelectedIdx && (dragStartMouseX === mouseX || dragStartMouseY === mouseY)) {
                    onChangeSelectedIdx(hoveringIdx);
                }
                setIsDragging(false);
            }
        };
        window.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('mousemove', onMouseMove, { passive: false });
        window.addEventListener('mousedown', onMouseDown, { passive: false });
        window.addEventListener('mouseup', onMouseUp, { passive: false });
        return () => {
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [canvasRef, width, height, zoom, mouseX, mouseY, isDragging, dragStartMouseX, dragStartMouseY, dragStartCenterX, dragStartCenterY, centerX, centerY, localDataWidth, localDataHeight, localLeft, localRight, localBottom, localTop, dataWidth, dataHeight]);

    const hoveringBlockX = hoveringIdx !== null ? (convertToWebGLCoords((x[hoveringIdx] - centerX) * zoom, dataWidth) + 2) / 2 * width : null;
    const hoveringBlockY = hoveringIdx !== null ? (convertToWebGLCoords((y[hoveringIdx] - centerY) * zoom, dataHeight) + 2) / 2 * height : null;
    const selectedBlockX = selectedIdx !== null ? (convertToWebGLCoords((x[selectedIdx] - centerX) * zoom, dataWidth) + 2) / 2 * width : null;
    const selectedBlockY = selectedIdx !== null ? (convertToWebGLCoords((y[selectedIdx] - centerY) * zoom, dataHeight) + 2) / 2 * height : null;

    return <div style={{ position: 'relative' }}>
        {/* canvas w/ WebGL for speed */}
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ width, height }}
        />
        {/* regular markup for the overlays for simplicity */}
        <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            pointerEvents: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.0)',
        }}>
            {hoveringIdx !== null && hoveringBlockX !== null && hoveringBlockY !== null &&
                <div style={{
                    position: 'absolute',
                    left: `${hoveringBlockX - 2.5}px`,
                    bottom: `${hoveringBlockY + 2}px`,
                    width: '5px',
                    height: '5px',
                    backgroundColor: 'red',
                }} />
            }
            {selectedIdx !== null && selectedBlockX !== null && selectedBlockY !== null &&
                <div style={{
                    position: 'absolute',
                    left: `${selectedBlockX - 2.5}px`,
                    bottom: `${selectedBlockY + 2}px`,
                    width: '5px',
                    height: '5px',
                    backgroundColor: 'cyan',
                }} />
            }
        </div>
    </div>;
}

export default FastScatter;
