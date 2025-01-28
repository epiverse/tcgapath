// Function to fetch and unzip the embeddings file
async function fetchEmbeddings() {
    const EMBEDDINGS_URL = "https://raw.githubusercontent.com/epiverse/tcgapath/main/embeddings.tsv.zip";
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

// Function to download data as a JSON file
function downloadJSON(data, filename) {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

// Function to fetch the cancer type metadata
async function fetchCancerTypeMeta() {
    const CANCER_TYPE_META_URL = "https://raw.githubusercontent.com/epiverse/tcgapath/main/cancer_type_meta.tsv";
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

// Function to perform t-SNE using the TSNE class
export function performTSNE(vectors, dim) {
    // Access the tSNE constructor from window.tsnejs.tSNE
    const tsne = new window.tsnejs.tSNE({
        dim: dim, // Dimensionality of the output (2D or 3D)
        perplexity: vectors.length < 10 ? vectors.length - 1 : 10, // Set perplexity based on input size
        theta: 0.5,  // Speed vs. accuracy trade-off
        iterations: 300,  // Number of iterations
        eta: 200 // Learning rate
    });

    // Initialize tSNE with the input vectors
    tsne.initDataRaw(vectors);

    // Perform t-SNE steps for the given number of iterations
    for (let k = 0; k < 300; k++) {
        tsne.step(); // Each step improves the solution
    }

    // Return the t-SNE output (reduced dimensionality)
    return tsne.getSolution();
}


// Function to create a 3D plot with points colored by cancer type
export function create3DPlot(tsneResult, cancerTypes, containerId = 'tsnePlot', plotSize = 800) {
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
        const tsneResult = performTSNE(embeddings, 3);

        // Check if t-SNE result is valid
        if (!tsneResult || tsneResult.length === 0) {
            throw new Error("t-SNE computation returned no valid data.");
        }

        console.log("t-SNE result:", tsneResult);

        // Visualize the result with color coding
        create3DPlot(tsneResult, cancerTypes);

        // Download tsne points as JSON (if needed)
        downloadJSON(tsneResult, 'tsne_points.json');

    } catch (error) {
        console.error("Error:", error);
    }
}

// Run the main function
main();
