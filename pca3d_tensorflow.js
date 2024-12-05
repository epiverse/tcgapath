const GITHUB_ZIP_URL = "https://raw.githubusercontent.com/epiverse/tcgapath/main/embeddings.tsv.zip";

// Function to fetch and unzip the ZIP file
async function fetchAndUnzipFile() {
    try {
        const response = await fetch(GITHUB_ZIP_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch ZIP file. HTTP Status: ${response.status}`);
        }
        console.log("Successfully fetched ZIP file.");

        const blob = await response.blob();
        const zip = await JSZip.loadAsync(blob);
        console.log("Successfully loaded ZIP file.");

        const fileNames = Object.keys(zip.files);
        console.log("Files in ZIP:", fileNames);

        const tsvFileName = fileNames.find(name => name.endsWith(".tsv"));
        if (!tsvFileName) {
            throw new Error("No TSV file found in the ZIP archive");
        }

        return zip.files[tsvFileName].async("string");
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

// Perform PCA manually using ml-matrix
function performPCAUsingMlMatrix(data, numComponents = 3) {
    try {
        console.log("Starting PCA computation using ml-matrix with SVD...");

        // Convert data into a matrix object
        const Matrix = mlMatrix.Matrix;
        const inputMatrix = new Matrix(data);

        // Center the data (subtract the mean of each column)
        const means = inputMatrix.mean('column');
        const centeredMatrix = inputMatrix.clone().subRowVector(means);

        console.log("Centered matrix dimensions:", centeredMatrix.rows, "x", centeredMatrix.columns);

        // Perform SVD on the centered data
        const svd = new mlMatrix.SVD(centeredMatrix, { autoTranspose: true });
        console.log("SVD results - U dimensions:", svd.leftSingularVectors.rows, "x", svd.leftSingularVectors.columns);
        console.log("SVD results - S dimensions:", svd.diagonal.length);
        console.log("SVD results - V dimensions:", svd.rightSingularVectors.rows, "x", svd.rightSingularVectors.columns);

        // Extract the top `numComponents` principal components
        const topComponents = svd.rightSingularVectors.subMatrix(0, svd.rightSingularVectors.rows - 1, 0, numComponents - 1);

        console.log("Top components dimensions:", topComponents.rows, "x", topComponents.columns);

        // Project the data onto the top components
        const reducedData = centeredMatrix.mmul(topComponents);
        console.log("PCA reduced data dimensions:", reducedData.rows, "x", reducedData.columns);

        // Return reduced data as a 2D array
        return reducedData.to2DArray();
    } catch (error) {
        console.error("Error during PCA computation using ml-matrix with SVD:", error);
        return null;
    }
}

function create3DPlot(pcaResult, containerId = 'plot', plotSize = 1000) {
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
    container.appendChild(renderer.domElement);

    // Add points
    const geometry = new THREE.BufferGeometry();
    const points = pcaResult.flat(); // Flatten PCA result for position attribute
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

// Main function to execute the PCA and plotting
async function main() {
    try {
        console.log("Starting main process...");

        // Fetch and parse the TSV file
        const tsvContent = await fetchAndUnzipFile();
        const embeddings = parseTSV(tsvContent);

        // Perform PCA
        const pcaResult = await performPCAUsingMlMatrix(embeddings, 3);

        // Check if PCA result is valid
        if (!pcaResult || pcaResult.length === 0) {
            throw new Error("PCA computation returned no valid data.");
        }

        console.log("PCA result:", pcaResult);

        // Visualize the result
        create3DPlot(pcaResult);
    } catch (error) {
        console.error("Error:", error);
    }
}

// Run the main function
main();
