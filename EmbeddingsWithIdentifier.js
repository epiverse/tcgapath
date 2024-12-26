const GITHUB_ZIP_URL = "https://raw.githubusercontent.com/epiverse/tcgapath/main/TCGA_Reports.csv.zip";

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

        const csvFileName = fileNames.find(name => name.endsWith(".csv"));
        if (!csvFileName) {
            throw new Error("No CSV file found in the ZIP archive");
        }

        return zip.files[csvFileName].async("string");
    } catch (error) {
        console.error("Error fetching and unzipping file:", error);
        throw error;
    }
}

// Function to parse the CSV and prepare data for embeddings
function parseCSVAndPrepareData(csvData) {
    const lines = csvData.split("\n").slice(1); // Skip the header
    const data = [];

    // Regular expression to extract identifier and text between the first comma and first occurrence of ;;
    const regex = /([^,]+),([^,]+);{2}/;  // Updated regex to capture the identifier

    for (const line of lines) {
        const match = line.match(regex); // Match identifier and text between the comma and ';;'
        if (match) {
            const identifier = match[1].trim(); // Extracted identifier
            const text = match[2].trim(); // Extracted text
            data.push({ identifier, text });
        }
    }

    return data;
}

// Function to save embeddings with identifiers as a TSV file
function saveEmbeddingsWithIdentifiers(embeddings, data) {
    if (embeddings.length !== data.length) {
        console.error("Mismatch between number of texts and embeddings.");
        return;
    }

    try {
        const tsvData = embeddings.map((embedding, index) => {
            return `${data[index].identifier}\t${embedding.join('\t')}`;  // Use identifier in TSV
        }).join('\n');

        const blob = new Blob([tsvData], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'embeddings_with_identifiers.tsv';
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log("TSV file has been downloaded successfully.");
    } catch (error) {
        console.error("Error saving TSV file:", error);
    }
}

// Function to fetch and process embeddings
async function initializeEmbeddings() {
    console.log("Fetching ZIP file and extracting CSV data...");

    try {
        const csvData = await fetchAndUnzipFile();
        const data = parseCSVAndPrepareData(csvData);

        console.log(`Parsed ${data.length} entries for embeddings.`);

        const texts = data.map(entry => entry.text);
        const embeddings = await getBatchEmbeddings(texts, 50);

        if (embeddings) {
            console.log("Successfully retrieved embeddings.");
            saveEmbeddingsWithIdentifiers(embeddings, data);

            // Output the first element (identifier and embedding)
            outputFirstElement(data, embeddings);
        } else {
            console.error("Failed to retrieve embeddings.");
        }
    } catch (error) {
        console.error("Error initializing embeddings:", error);
    }
}

// Function to output the first element (identifier and embedding)
function outputFirstElement(data, embeddings) {
    if (data.length > 0 && embeddings.length > 0) {
        const firstEntry = data[0];
        const firstEmbedding = embeddings[0];

        console.log("First Identifier:", firstEntry.identifier);
        console.log("First Embedding:", firstEmbedding);
    } else {
        console.error("No data or embeddings available.");
    }
}

// Function to get batch embeddings with chunking
async function getBatchEmbeddings(texts, chunkSize = 50) {
    const allEmbeddings = []; // Store embeddings from all chunks

    try {
        // Split the texts array into smaller chunks
        for (let i = 0; i < texts.length; i += chunkSize) {
            const chunk = texts.slice(i, i + chunkSize);

            // Log the current chunk size and position
            console.log(`Requesting embeddings for chunk ${i / chunkSize + 1} (Size: ${chunk.length})`);

            // Prepare requests for this chunk
            const requests = chunk.map(text => ({
                model: "models/text-embedding-004",
                content: {
                    parts: [{
                        text: text
                    }]
                }
            }));

            // Make the API call with the current chunk
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${localStorage.gemKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requests: requests })
            });

            // Parse the JSON response for this chunk
            const embeddingsData = await response.json();

            // Log the response for debugging
            console.log(`Chunk ${i / chunkSize + 1} API Response:`, embeddingsData);

            // Check for errors in the response
            if (embeddingsData.error) {
                throw new Error(`API error: ${embeddingsData.error.message}`);
            }

            // Check if 'embeddings' exists in the response
            if (embeddingsData.embeddings && embeddingsData.embeddings.length > 0) {
                // Extract and add the embeddings from this chunk to allEmbeddings
                allEmbeddings.push(...embeddingsData.embeddings.map(embedding => embedding.values));
            } else {
                console.warn("No embeddings found in this chunk response.");
            }
        }

        console.log("All embeddings retrieved successfully:", allEmbeddings);
        return allEmbeddings;  // Return all retrieved embeddings
    } catch (error) {
        console.error('Error retrieving batch embeddings:', error);
        return null;
    }
}


// Call the main function
initializeEmbeddings();
