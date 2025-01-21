// Define the TSNE class based on the provided package
class TSNE {
    constructor(config) {
        config = config || {};
        this.dim = config.dim || 2;
        this.perplexity = config.perplexity || 30.0;
        this.earlyExaggeration = config.earlyExaggeration || 4.0;
        this.learningRate = config.learningRate || 1000.0;
        this.nIter = config.nIter || 1000;
        this.metric = config.metric || 'euclidean';
        this.barneshut = config.barneshut || false;
        this.inputData = null;
        this.outputEmbedding = null;
    }

    init(opts) {
        opts = opts || {};
        const inputData = opts.data || [];
        const type = opts.type || 'dense';

        if (type === 'dense') {
            this.inputData = inputData;
        } else if (type === 'sparse') {
            const shape = [];
            let size = 1;

            for (let d = 0; d < inputData[0].length; d++) {
                const dimShape = Math.max(...inputData.map(coord => coord[d])) + 1;
                shape.push(dimShape);
                size *= dimShape;
            }
            this.inputData = new Float64Array(size);
            for (const coord of inputData) {
                this.inputData[coord.join(',')] = 1;
            }
        } else {
            throw new Error('input data type must be dense or sparse');
        }
        this.outputEmbedding = Array.from({ length: this.inputData.length }, () => Array(this.dim).fill(0).map(() => Math.random()));
    }

    run() {
        console.log('Calculating pairwise distances');
        // Calculate distances, joint probabilities, and run gradient descent
        // Placeholder for actual implementation

        return [0, this.nIter];
    }

    getOutput() {
        return this.outputEmbedding;
    }

    // Placeholder for _gradDesc function
    _gradDesc(iter, nIter, momentum, minGradNorm = 1e-6, minErrorDiff = 1e-6) {
        // Simplified example, add your own gradient descent logic
        // For now, returning dummy values
        return [0, nIter];
    }
}

// Log to verify TSNE class definition
console.log(typeof TSNE); // Should output 'function' if TSNE is loaded correctly

// Function to fetch and unzip the embeddings file
async function fetchEmbeddings() {
    try {
        const response = await fetch(EMBEDDINGS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch embeddings file. HTTP Status: ${response.status}`);
        }
        console.log("Successfully fetched embeddings file.");

        const data = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(data);
        console.log("Successfully loaded ZIP file.");

        const file = zip.file('embeddings.tsv');
        if (!file) {
            throw new Error("Embeddings file not found in the ZIP archive.");
        }

        const content = await file.async('string');
        const embeddings = content.trim().split("\n").map(line => line.split("\t").map(Number));

        return embeddings;
    } catch (error) {
        console.error("Error fetching and unzipping embeddings file:", error);
        throw error;
    }
}

// Function to fetch the cancer type metadata
async function fetchCancerTypeMeta() {
    try {
        const response = await fetch(CANCER_TYPE_META_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch cancer type meta file. HTTP Status: ${response.status}`);
        }
        console.log("Successfully fetched cancer type meta file.");

        const content = await response.text();
        const lines = content.trim().split("\n");
        const cancerTypes = lines.slice(1).map(line => line.split("\t")[1]); // Extract cancer types

        return cancerTypes;
    } catch (error) {
        console.error("Error fetching cancer type meta file:", error);
        throw error;
    }
}

// Function to perform t-SNE using the redefined TSNE class
function tsne(vectors, dim) {
    const model = new TSNE({
        dim: dim,
        perplexity: vectors.length < 10 ? vectors.length - 1 : 30 // Adjust perplexity as needed
    });

    model.init({ data: vectors });
    model.run();
    return model.getOutput();
}

// Function to create a 3D plot with points colored by cancer type
function create3DPlot(tsneResult, cancerTypes, containerId = 'tsnePlot', plotSize = 800) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID '${containerId}' not found.`);
        return;
    }

    container.innerHTML = '';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(plotSize, plotSize);
    renderer.setClearColor(0xffffff, 1); // Set background color to white
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const points = [];
    const colors = [];

    // Create a map for assigning colors to each unique cancer type
    const uniqueCancerTypes = [...new Set(cancerTypes)];
    const colorMap = {};
    uniqueCancerTypes.forEach((type, index) => {
        const color = new THREE.Color().setHSL(index / uniqueCancerTypes.length, 1, 0.5); // Generate distinct colors
        colorMap[type] = color;
    });

    tsneResult.forEach((point, index) => {
        points.push(...point);
        const color = colorMap[cancerTypes[index]] || new THREE.Color(0x999999); // Default gray for unknown types
        colors.push(color.r, color.g, color.b);
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.005,
        vertexColors: true,
        opacity: 0.8
    });

    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    const axesHelper = new THREE.AxesHelper(20);
    scene.add(axesHelper);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enableZoom = true;

    window.addEventListener('resize', () => {
        const size = Math.min(container.offsetWidth, container.offsetHeight);
        renderer.setSize(size, size);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
    });

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Create legend
    const legend = document.getElementById('legend');
    const legendContent = uniqueCancerTypes.map(
        type => `<li><span style="color: ${colorMap[type].getStyle()};">&#9679;</span> ${type}</li>`
    ).join('');
    legend.innerHTML = `<ul>${legendContent}</ul>`;
}

// Main function to execute the t-SNE and plotting
async function main() {
    try {
        console.log("Starting main process...");

        // Fetch embeddings and cancer type metadata
        const [embeddings, cancerTypes] = await Promise.all([fetchEmbeddings(), fetchCancerTypeMeta()]);

        console.log("Embeddings fetched:", embeddings.length);
        console.log("Cancer types fetched:", cancerTypes.length);

        // Perform t-SNE
        const tsneResult = tsne(embeddings, 3);

        // Check if t-SNE result is valid
        if (!tsneResult || tsneResult.length === 0) {
            throw new Error("t-SNE computation returned no valid data.");
        }

        console.log("t-SNE result:", tsneResult);

        // Visualize the result with color coding
        create3DPlot(tsneResult, cancerTypes);
    } catch (error) {
        console.error("Error:", error);
    }
}

// Run the main function
main();
