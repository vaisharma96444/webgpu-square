import './style.css'
import { GPU } from './gpu'
import { createGPUBuffer } from './gpuBuffer';
import { createPipeline } from './pipeline';
import { createRenderPass } from './renderpass';
import shader from './shader.wgsl?raw';

const BACKGROUND = { r: 0.25, g: 0.25, b: 0.3, a: 1.0 }

const gpu = new GPU()
let message = gpu.getStatusMessage()

const generateRandomColors = (numSquares, numRows) => {
    const colorData = new Float32Array(numSquares * numRows * 6 * 3);
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numSquares; col++) {
            const color = [Math.random(), Math.random(), Math.random()]; 
            for (let i = 0; i < 6; i++) {
                colorData.set(color, (row * numSquares + col) * 6 * 3 + i * 3);
            }
        }
    }
    return colorData;
};

const updateColorsPeriodically = (numSquares, numRows, interval) => {
    setInterval(() => {
        const newColorData = generateRandomColors(numSquares, numRows);
        createSquare(newColorData);
    }, interval);
};

const createSquare = async (colorData) => {
    if (!gpu.getStatus()) return;

    const device = await gpu.requestDevice()

    const numSquares = 50;
    const squareWidth = 0.05;
    const spacing = 0.005;
    const verticalSpacing = 0.005;
    const numRows = 50;

    const totalWidth = numSquares * (squareWidth + spacing) - spacing;
    const totalHeight = numRows * (squareWidth + verticalSpacing) - verticalSpacing;
    const xOffsetCentered = -totalWidth / 2;
    const yOffsetCentered = -totalHeight / 2;

    const vertexData = new Float32Array(numSquares * numRows * 6 * 3);
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numSquares; col++) {
            const xOffset = xOffsetCentered + col * (squareWidth + spacing);
            const yOffset = yOffsetCentered + row * (squareWidth + verticalSpacing);

            vertexData.set([
                -0.20 + xOffset, -0.10 + yOffset, 0, // vertex A
                0.0 + xOffset, -0.10 + yOffset, 0, // vertex B
                -0.20 + xOffset, 0.10 + yOffset, 0, // vertex D
                -0.20 + xOffset, 0.10 + yOffset, 0, // vertex D
                0.0 + xOffset, -0.10 + yOffset, 0, // vertex B
                0.0 + xOffset, 0.10 + yOffset, 0, // vertex C
            ], (row * numSquares + col) * 6 * 3);
        }
    }

    const vertexBuffer = createGPUBuffer(device, vertexData);
    const colorBuffer = createGPUBuffer(device, colorData);

    const pipeline = createPipeline(device, gpu.getFormat(), shader);

    const canvas = document.getElementById('canvas-webgpu') as HTMLCanvasElement;
    const context = canvas.getContext('webgpu') as unknown as GPUCanvasContext;
    context.configure({
        device: device,
        format: gpu.getFormat(),
        alphaMode:'opaque'
    });

    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPass = createRenderPass(commandEncoder, pipeline, textureView, vertexBuffer, colorBuffer, BACKGROUND);
    let nbOfVertices = vertexData.length / 3;
    renderPass.draw(nbOfVertices);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
}

const numSquares = 50;
const numRows = 50;
const colorUpdateInterval = 1000; // 1000 ms = 1 second

createSquare(generateRandomColors(numSquares, numRows));

updateColorsPeriodically(numSquares, numRows, colorUpdateInterval);

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `<div><p> ` + message + `</p></div>`;
