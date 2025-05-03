// Constants - default values
const g = 9.81;  // gravitational acceleration (m/s^2)
let targetAltitude = 30; // meters
let mass = 1.5;  // kg
let dragCoef = 0.05;
let maxThrust = 30.0;  // N
let kP = 2.0;

// Time setup
const dt = 0.05;  // time step in seconds (for physics calculation)
// const timeEnd = 90;  // simulation duration in seconds
const simulationSpeed = 1;  // simulation runs 5x normal speed
const maxAltitude = 60;
let time = 0;

// Simulation state
let velocity = 0;
let position = 0;
let error = targetAltitude - position;
let thrust = 0;
let acceleration = 0;
let thrustActive = false;
let simulationRunning = false;
let animationFrameId = null;

// Data for the chart
const maxDataPoints = 500; // Increased to allow for more data points for smoother graph
const timeData = [];
const positionData = [];

// DOM Elements
const droneElement = document.getElementById('drone');
const targetLineElement = document.getElementById('targetLine');
const thrustIndicatorElement = document.getElementById('thrustIndicator');
const positionValueElement = document.getElementById('positionValue');
const velocityValueElement = document.getElementById('velocityValue');
const thrustStatusElement = document.getElementById('thrustStatus');
const startButton = document.getElementById('startBtn');
const resetButton = document.getElementById('resetBtn');

// Drone and target line dimensions - used for centering
const droneHeight = 35; // Total height of drone with propellers (in px)
const targetLineHeight = 2; // Height of target line (in px)

// Input Elements
const targetAltitudeInput = document.getElementById('targetAltitude');
const kPInput = document.getElementById('propGain');

// Chart initialization
let altitudeChart = null;

// Initialize simulation
function initSimulation() {
    // Reset simulation state
    time = 0;
    velocity = 0;
    position = 0;
    acceleration = 0;
    error = 0;
    thrustActive = false;
    
    // Reset data arrays
    timeData.length = 0;
    positionData.length = 0;
    
    // Update display
    updateDronePosition();
    updateStatusDisplay();
    
    // Initialize chart
    initChart();
    
    // Update target line position
    updateTargetLine();
}

// Update the simulation parameters from inputs
function updateParameters() {
    altCheck = parseFloat(targetAltitudeInput.value);
    altCheck = Math.max(0, altCheck);
    altCheck = Math.min(altCheck, maxAltitude-5);

    targetAltitude = altCheck;
    targetAltitudeInput.value = altCheck;
    updateTargetLine();

    kP = parseFloat(kPInput.value);
}

// Update the target line position
function updateTargetLine() {
    const percentage = (targetAltitude / maxAltitude) * 100;
    // Position the target line so its center aligns with the altitude marker
    targetLineElement.style.bottom = `calc(${percentage}% - ${targetLineHeight/2}px)`;
    targetLineElement.textContent = `Target: ${targetAltitude}m`;
}

// Calculate next simulation step
function simulationStep() {
    // Calculate drag force - acts against direction of motion
    let drag = dragCoef * (velocity ** 2);
    if (velocity > 0) {
        drag *= -1;
    }

    error = targetAltitude - position;
    thrust = kP * error;
    thrust = Math.max(0, thrust);
    thrust = Math.min(thrust, maxThrust);
    
    // Bang-bang control logic

    acceleration = (thrust / mass) + (drag / mass) - g;
    thrustActive = (thrust > 0)
    
    // Update state using Euler integration
    position += velocity * dt;
    velocity += acceleration * dt;
    
    // Prevent negative position (ground collision)
    if (position < 0) {
        position = 0;
        velocity = 0; // Stop at ground
    }
    
    // Update time
    time += dt;
    
    // Update data arrays for graph - collect data at every time step for smooth lines
    timeData.push(time);
    positionData.push(position);
    
    // Limit data points to keep performance high
    if (timeData.length > maxDataPoints) {
        timeData.shift();
        positionData.shift();
    }
    
    // Update chart
    updateChart();
}

// Update drone position on screen
function updateDronePosition() {
    const maxAltitude = 60;  // Maximum altitude on the scale (m)
    const percentage = (position / maxAltitude) * 100;
    // Position the drone so its center aligns with the altitude marker
    droneElement.style.bottom = `calc(${percentage}% - ${droneHeight/2}px)`;
    
    // Show thrust indicator when active
    if (thrustActive) {
        thrustIndicatorElement.style.height = '15px';
        thrustIndicatorElement.style.opacity = '1';
    } else {
        thrustIndicatorElement.style.height = '0';
        thrustIndicatorElement.style.opacity = '0';
    }
}

// Update status display
function updateStatusDisplay() {
    positionValueElement.textContent = position.toFixed(2);
    velocityValueElement.textContent = velocity.toFixed(2);
    thrustStatusElement.textContent = thrustActive ? 'ON' : 'OFF';
    thrustStatusElement.style.color = thrustActive ? '#e74c3c' : '#777';
}

// Animation loop
function animate() {
    // if (simulationRunning && time < timeEnd) {
    if (simulationRunning) {
        // Run multiple physics steps per animation frame for faster simulation
        for (let i = 0; i < simulationSpeed; i++) {
            // if (time < timeEnd) {
            //     simulationStep();
            // }
            simulationStep();
        }
        updateDronePosition();
        updateStatusDisplay();
        animationFrameId = requestAnimationFrame(animate);
    }
    // } else if (time >= timeEnd) {
    //     simulationRunning = false;
    //     startButton.textContent = 'Start';
    // }
}

// Initialize chart
function initChart() {
    const ctx = document.getElementById('altitudeGraph').getContext('2d');
    
    if (altitudeChart) {
        altitudeChart.destroy();
    }
    
    // Set fixed scale to match the altitude visualization panel
    const maxAltitude = 60;  // Maximum altitude on the scale (m)
    
    altitudeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeData,
            datasets: [{
                label: 'Drone Altitude (m)',
                data: positionData,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                pointRadius: 0, // Hide individual data points for smoother look
            }, {
                label: 'Target Altitude',
                data: Array(maxDataPoints).fill(targetAltitude),
                borderColor: '#e74c3c',
                borderWidth: 1,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (s)'
                    },
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                        color: function(context) {
                            // Only draw gridlines at 5 second intervals
                            const value = context.tick.value;
                            const time = timeData[context.tick.index];
                            if (time !== undefined && Math.round(time) % 5 === 0) {
                                return 'rgba(0, 0, 0, 0.1)';
                            }
                            return 'rgba(0, 0, 0, 0)';
                        }
                    },
                    ticks: {
                        autoSkip: false,
                        callback: function(value, index, values) {
                            // Only show multiples of 5 for time labels
                            // But use the actual time values
                            if (Math.round(timeData[index]) % 5 === 0 && 
                                (index === 0 || Math.round(timeData[index]) !== Math.round(timeData[index-1]))) {
                                return Math.round(timeData[index]);
                            }
                            return '';
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Altitude (m)'
                    },
                    min: 0,
                    max: maxAltitude,
                    ticks: {
                        // Align ticks with the altitude markers in the simulation
                        callback: function(value, index, values) {
                            if (value % 10 === 0) {
                                return value + 'm';
                            }
                            return '';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return 'Time: ' + tooltipItems[0].raw.toFixed(1) + 's';
                        }
                    }
                }
            }
        }
    });
}

// Update chart with new data
function updateChart() {
    if (altitudeChart) {
        altitudeChart.data.labels = timeData;
        altitudeChart.data.datasets[0].data = positionData;
        altitudeChart.data.datasets[1].data = Array(timeData.length).fill(targetAltitude);
        
        // Only update ticks when needed
        altitudeChart.options.scales.x.ticks.callback = function(value, index, values) {
            // Only show multiples of 5 for time labels
            if (Math.round(timeData[index]) % 5 === 0 && 
                (index === 0 || Math.round(timeData[index]) !== Math.round(timeData[index-1]))) {
                return Math.round(timeData[index]);
            }
            return '';
        };
        
        // Keep the y-axis fixed to match the altitude markers
        altitudeChart.options.scales.y.max = 60;
        altitudeChart.options.scales.y.min = 0;
        
        altitudeChart.update('none'); // Update without animation for performance
    }
}

// Event Listeners
startButton.addEventListener('click', () => {
    if (simulationRunning) {
        simulationRunning = false;
        startButton.textContent = 'Start';
        cancelAnimationFrame(animationFrameId);
    } else {
        updateParameters();
        simulationRunning = true;
        startButton.textContent = 'Pause';
        animate();
    }
});

resetButton.addEventListener('click', () => {
    simulationRunning = false;
    startButton.textContent = 'Start';
    cancelAnimationFrame(animationFrameId);
    initSimulation();
});

// Attach input change listeners
targetAltitudeInput.addEventListener('change', updateParameters);
kPInput.addEventListener('change', updateParameters);

// Initialize the simulation when page loads
window.addEventListener('load', initSimulation);