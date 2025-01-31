const CANCER_TYPE_META_URL = "https://raw.githubusercontent.com/epiverse/tcgapath/main/cancer_type_meta.tsv";
const EMBEDDINGS_URL = "https://raw.githubusercontent.com/epiverse/tcgapath/main/embeddings.tsv.zip";
const PCA_EUCLIDEAN_JSON_URL = "https://raw.githubusercontent.com/epiverse/tcgapath/main/pca_euclidean.json";
const UMAP_JSON_URL = "https://raw.githubusercontent.com/epiverse/tcgapath/main/umap_points.json";
const TSNE_JSON_URL = "https://raw.githubusercontent.com/epiverse/tcgapath/main/tsne_points.json";

// Function to fetch data from a JSON file
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file. HTTP Status: ${response.status}`);
        }
        console.log(`Successfully fetched file from ${url}.`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching file from ${url}:`, error);
        return null;
    }
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
        return content.trim().split("\n").map(line => line.split("\t").map(Number));
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
        return lines.slice(1).map(line => line.split("\t")[1]); // Extract cancer types
    } catch (error) {
        console.error("Error fetching cancer type meta file:", error);
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

// Function to perform t-SNE using the TSNE class
async function performTSNE(vectors, dim) {
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
function create3DPlot(data, cancerTypes, containerId, plotSize, plotTitle) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID '${containerId}' not found.`);
        return;
    }

    container.innerHTML = `<h3>${plotTitle}</h3>`;

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

    data.forEach((point, index) => {
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

// Main function to execute the PCA, UMAP, t-SNE and plotting
async function main() {
    try {
        console.log("Starting main process...");

        // Fetch embeddings and cancer type metadata
        const [embeddings, cancerTypes] = await Promise.all([fetchEmbeddings(), fetchCancerTypeMeta()]);

        // Fetch data from JSON files
        const [pcaEuclidean, umapData, tsneData] = await Promise.all([
            fetchData(PCA_EUCLIDEAN_JSON_URL),
            fetchData(UMAP_JSON_URL),
            fetchData(TSNE_JSON_URL)
        ]);

        // Initialize Pyodide for PCA
        const pyodide = await initializePyodide3D();

        // Compute or fetch PCA result
        const pcaResult = pcaEuclidean ? pcaEuclidean : await pcaTransform3D(pyodide, embeddings, 3);

        // Compute or fetch UMAP result
        const umapResult = umapData ? umapData : await computeUMAP(embeddings, 3);

        // Compute or fetch t-SNE result
        const tsneResult = tsneData ? tsneData : await performTSNE(embeddings, 3);

        // Validate results
        if (!pcaResult || !umapResult || !tsneResult) {
            throw new Error("Error in computing PCA, UMAP, or t-SNE result.");
        }

        // Visualize the results with color coding
        create3DPlot(pcaResult, cancerTypes, 'pcaPlot', 700, '');
        create3DPlot(umapResult, cancerTypes, 'umapPlot', 700, '');
        create3DPlot(tsneResult, cancerTypes, 'tsnePlot', 700, '');

    } catch (error) {
        console.error("Error:", error);
    }
}

// Run the main function
main();
