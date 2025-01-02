const JSON_URL = "https://raw.githubusercontent.com/episphere/ese/main/data/tcga_reports.json.zip"; // Updated to the raw file URL

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

// Function to initialize Pyodide for 3D PCA
async function initializePyodide3D() {
    if (typeof loadPyodide === "undefined") {
        throw new Error("Pyodide is not loaded. Check if the script is correctly included.");
    }

    const pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/",
    });
    await pyodide.loadPackage("scikit-learn");
    console.log("Pyodide initialized successfully for 3D PCA.");
    return pyodide;
}

// Function to perform 3D PCA transformation using Pyodide
async function pcaTransform3D(pyodide, data, nComponents = 3) {
    const jsonData = JSON.stringify(data);
    pyodide.globals.set("X_json", jsonData);
    pyodide.globals.set("n_components", nComponents);

    const transformedData = pyodide.runPython(`
        import json
        import numpy as np
        from sklearn.decomposition import PCA

        X = np.array(json.loads(X_json))
        if X.ndim != 2:
            raise ValueError('Input data must be a 2D array.')
        del X_json

        pca = PCA(n_components=n_components)
        X_transformed = pca.fit_transform(X).tolist()
        X_transformed
    `);

    console.log("3D PCA transformation completed:", transformedData);
    return transformedData.toJs();
}

// Function to create a 3D plot with points colored by cancer type
function create3DPlot(pcaResult, cancerTypes, containerId = 'plot', plotSize = 800) {
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
        const color = new THREE.Color().setHSL(index / uniqueCancerTypes.length, 0.5, 0.5); // Generate distinct colors
        colorMap[type] = color;
    });

    pcaResult.forEach((point, index) => {
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

// Main function to execute the PCA and plotting
async function main() {
    try {
        console.log("Starting main process...");

        // Fetch and parse the JSON data
        const jsonData = await fetchJSONData();

        // Extract embeddings and cancer types from JSON data
        const embeddings = jsonData.map(record => record.embedding);
        const cancerTypes = jsonData.map(record => record.properties.cancer_type);

        // Initialize Pyodide
        const pyodide = await initializePyodide3D();

        // Perform PCA
        const pcaResult = await pcaTransform3D(pyodide, embeddings, 3);

        // Check if PCA result is valid
        if (!pcaResult || pcaResult.length === 0) {
            throw new Error("PCA computation returned no valid data.");
        }

        console.log("PCA result:", pcaResult);

        // Visualize the result with color coding
        create3DPlot(pcaResult, cancerTypes);
    } catch (error) {
        console.error("Error:", error);
    }
}

// Run the main function
main();
