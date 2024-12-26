// Function to fetch and unzip the ZIP file
async function fetchTCGAReports() {
    try {
        const response = await fetch(GITHUB_ZIP_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch ZIP file. HTTP Status: ${response.status}`);
        }
        console.log("Successfully fetched ZIP file.");

        const data = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(data);
        console.log("Successfully loaded ZIP file.");

        const file = zip.file('embeddings.tsv');
        if (!file) {
            throw new Error("TSV file not found in the ZIP archive.");
        }

        const content = await file.async('string');
        return content;
    } catch (error) {
        console.error("Error fetching and unzipping file:", error);
        throw error;
    }
}

// Function to parse TSV data into a 2D array
function parseTSV(tsvContent) {
    const data = tsvContent.trim().split("\n").map(line => line.split("\t").map(parseFloat));
    console.log("Parsed TSV data. Rows:", data.length, "Columns per row:", data[0]?.length || 0);
    return data;
}

// Function to perform t-SNE transformation using the tsnejs library
async function tsneTransform(embeddings, nComponents = 3, perplexity = 30) {
    console.log("Starting t-SNE transformation...");

    const opt = {
        epsilon: 10, // Learning rate
        perplexity: perplexity, // Neighbors each point influences
        dim: nComponents // Dimensionality of the embedding
    };

    const tsne = new tsnejs.tSNE(opt); // Create t-SNE instance

    // Initialize data
    tsne.initDataRaw(embeddings);

    // Perform iterations
    for (let i = 0; i < 500; i++) {
        tsne.step();
    }

    // Get the result
    const tsneResult = tsne.getSolution();
    console.log("t-SNE embedding computation completed.");
    return tsneResult;
}

// Function to create a 3D t-SNE plot using Three.js
function createTSNEPlot(tsneResult, containerId = 'tsnePlot', plotSize = 1000) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID '${containerId}' not found.`);
        return;
    }

    container.innerHTML = '';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 50;

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(plotSize, plotSize);
    renderer.setClearColor(0xffffff, 1); // Set background color to white
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const points = tsneResult.flat();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

    const material = new THREE.PointsMaterial({
        size: 0.01,
        color: 0x0077ff,
        transparent: false,
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
}

// Main function to execute the t-SNE and plotting
async function mainTSNE() {
    try {
        console.log("Starting main process...");

        const reports = await fetchTCGAReports();
        const embeddings = parseTSV(reports);

        console.log("Performing t-SNE transformation...");
        const tsneResult = await tsneTransform(embeddings);

        if (!tsneResult || tsneResult.length === 0) {
            throw new Error("t-SNE computation returned no valid data.");
        }

        console.log("t-SNE result:", tsneResult);

        createTSNEPlot(tsneResult);
    } catch (error) {
        console.error("Error:", error);
    }
}

mainTSNE();
