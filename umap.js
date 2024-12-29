async function fetchTCGAReports() {
    const GITHUB_ZIP_URL = "https://epiverse.github.io/tcgapath/embeddings.tsv.zip";
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

function parseTSV(tsvContent) {
    const data = tsvContent.trim().split("\n").map(line => line.split("\t").map(parseFloat));
    console.log("Parsed TSV data. Rows:", data.length, "Columns per row:", data[0]?.length || 0);
    return data;
}

// Function to compute UMAP on the embeddings
async function computeUMAP(embeddings, nComponents = 3) {
    // Initialize UMAP
    const umap = new UMAP.UMAP({
        nComponents: nComponents,
        nNeighbors: 15,
        minDist: 0.1
    });

    console.log("Computing UMAP embeddings...");
    const umapEmbedding = await umap.fit(embeddings); // use fit method
    console.log("UMAP embedding computation completed.");
    return umapEmbedding;
}

// Function to create a 3D UMAP plot using Three.js
function create3DUMAPPlot(umapResult, containerId = 'umapPlot', plotSize = 600) {
    // Prepare container
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID '${containerId}' not found.`);
        return;
    }

    // Clean container if there's already content
    container.innerHTML = '';

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 50;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(plotSize, plotSize);
    renderer.setClearColor(0xffffff, 1);
    container.appendChild(renderer.domElement);

    // Add points
    const geometry = new THREE.BufferGeometry();
    const points = umapResult.flat(); // Flatten UMAP result for position attribute
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

    const material = new THREE.PointsMaterial({
        size: 0.01,           // Adjust the size of each point
        color: 0x0077ff,     // Blue color for the points
        transparent: false,   // Enable transparency
        opacity: 0.8         // Slightly transparent for a better effect
    });
    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    // Add X, Y, Z axes to the scene
    const axesHelper = new THREE.AxesHelper(20); // 20 is the length of the axes
    scene.add(axesHelper);

    // Controls for interactivity
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth interaction
    controls.dampingFactor = 0.1;
    controls.enableZoom = true;

    // Resize plot dynamically
    window.addEventListener('resize', () => {
        const size = Math.min(container.offsetWidth, container.offsetHeight);
        renderer.setSize(size, size);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

// Main function to load embeddings, compute UMAP, and plot
async function mainUMAP(nComponents = 3) {
    try {
        const reports = await fetchTCGAReports();
        const embeddings = parseTSV(reports);

        if (embeddings.length === 0) {
            console.error("No embeddings data available for UMAP.");
            return;
        }

        const umapData = await computeUMAP(embeddings, nComponents);

        // Create 3D UMAP plot
        create3DUMAPPlot(umapData);

    } catch (error) {
        console.error("Error performing UMAP:", error);
    }
}

// Run UMAP main function with 3D UMAP
window.addEventListener("load", () => mainUMAP(3));
