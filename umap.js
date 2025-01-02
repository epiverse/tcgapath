//const JSON_URL = "https://raw.githubusercontent.com/episphere/ese/main/data/tcga_reports.json.zip"; // Updated to the raw file URL

// Function to fetch and unzip the JSON file
async function fetchJSONData() {
    try {
        const response = await fetch(JSON_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch JSON file. HTTP Status: ${response.status}`);
        }
        console.log("Successfully fetched JSON file.");

        const data = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(data);
        console.log("Successfully loaded ZIP file.");

        const file = zip.file('tcga_reports.json');
        if (!file) {
            throw new Error("JSON file not found in the ZIP archive.");
        }

        const content = await file.async('string');
        const jsonData = JSON.parse(content);

        return jsonData;
    } catch (error) {
        console.error("Error fetching and unzipping file:", error);
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
        // Fetch and parse the JSON data
        const jsonData = await fetchJSONData();

        // Extract embeddings and cancer types from JSON data
        const embeddings = jsonData.map(record => record.embedding);
        const cancerTypes = jsonData.map(record => record.properties.cancer_type);

        // Compute UMAP
        const umapResult = await computeUMAP(embeddings, nComponents);

        // Create 3D UMAP plot with color coding
        create3DUMAPPlot(umapResult, cancerTypes);

    } catch (error) {
        console.error("Error performing UMAP:", error);
    }
}

// Run UMAP main function with 3D UMAP
window.addEventListener("load", () => mainUMAP(3));
