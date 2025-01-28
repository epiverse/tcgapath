const UMAP_JSON_URL = "https://raw.githubusercontent.com/epiverse/tcgapath/main/umap_points.json";


// Function to fetch umap data from the umap_points.json file
async function fetchumap() {
    try {
        const response = await fetch(UMAP_JSON_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch umap file. HTTP Status: ${response.status}`);
        }
        console.log("Successfully fetched umap file.");

        const content = await response.json();
        return content;
    } catch (error) {
        console.error("Error fetching umap file:", error);
        return null;
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

// Function to compute UMAP on the embeddings
async function computeUMAP(embeddings, nComponents = 3) {
    const umap = new UMAP.UMAP({
        nComponents: nComponents,
        nNeighbors: 15,
        minDist: 0.1
    });

    console.log("Computing UMAP embeddings...");
    const umapEmbedding = await umap.fit(embeddings);
    console.log("UMAP embedding computation completed.");
    return umapEmbedding;
}

// Function to create a 3D UMAP plot using Three.js with color coding
function create3DUMAPPlot(umapResult, cancerTypes, containerId = 'umapPlot', plotSize = 800) {
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
    renderer.setClearColor(0xffffff, 1);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const points = [];
    const colors = [];

    // Create a map for assigning colors to each unique cancer type
    const uniqueCancerTypes = [...new Set(cancerTypes)];
    const colorMap = {};
    uniqueCancerTypes.forEach((type, index) => {
        const color = new THREE.Color().setHSL(index / uniqueCancerTypes.length, 0.5, 0.5); // Generate distinct colors
        colorMap[type] = color;
    });

    umapResult.forEach((point, index) => {
        points.push(...point);
        const color = colorMap[cancerTypes[index]] || new THREE.Color(0x999999); // Default gray for unknown types
        colors.push(color.r, color.g, color.b);
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.03,
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

// Main function to load embeddings, compute UMAP, and plot
async function mainUMAP(nComponents = 3) {
    try {
        console.log("Starting main process...");

        // Fetch embeddings and cancer type metadata
        const [embeddings, cancerTypes] = await Promise.all([fetchEmbeddings(), fetchCancerTypeMeta()]);

        // Check if PCA Euclidean data is available
        const umappoints = await fetchumap();

        let umapResult;

        if (umappoints) {
            console.log("Using UMAP data from JSON file.");
            umapResult = umappoints;
        } else {
            console.log("UMAP data not found. Calculating PCA.");
            umapResult = await computeUMAP(embeddings, nComponents);
        }

        // Check if UMAP result is valid
        if (!umapResult || umapResult.length === 0) {
            throw new Error("UMAP computation returned no valid data.");
        }

        console.log("UMAP result:", umapResult);

        // Visualize the result with color coding
        create3DPlot(umapResult, cancerTypes);
    } catch (error) {
        console.error("Error:", error);
    }
}

// Run UMAP main function with 3D UMAP
window.addEventListener("load", () => mainUMAP(3));
