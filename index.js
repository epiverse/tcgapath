console.log(`index.js loaded\n${Date()}`);

(async function() {
    const saveFile = (await import('https://jonasalmeida.github.io/jmat/jmat.mjs')).saveFile;
    let conversation = [];
    console.log(`async runtime\n${Date()}`);
    const shdown = new ((await import('https://esm.sh/showdown@2.1.0')).default).Converter;

    // Import GEM and instantiate it
    const { GEM } = await import(`./gem.mjs`);
    g1 = new GEM(); // Initialize g1 here

    // Now that g1 is initialized, call the functions
    await initializeEmbeddings(); // Call the function to initialize embeddings
})();

// Function to initialize embeddings after g1 is set up
async function initializeEmbeddings() {
    // Fetch batch embeddings from the JSON file
    const texts = await fetchTextsFromJson('tcgareports.json');

    // Display a loading message while fetching batch embeddings
    document.getElementById('batchEmbeddings').textContent = 'Fetching batch embeddings...';

    // Get batch embeddings for the texts
    const batchEmbeddings = await getBatchEmbeddings(texts);
    displayBatchEmbeddings(batchEmbeddings);
}

// Function to fetch texts from the JSON file
async function fetchTextsFromJson(filePath) {
    try {
        const response = await fetch(filePath);

        // Check if the response is ok
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        // Parse and return the JSON data
        return await response.json();
    } catch (error) {
        console.error('Error fetching the JSON file:', error);
        return []; // Return an empty array in case of an error
    }
}

// Function to get batch embeddings with chunking to stay within payload limits
async function getBatchEmbeddings(texts, chunkSize = 50) {
    const allEmbeddings = []; // Store embeddings from all chunks

    try {
        // Split the texts array into smaller chunks
        for (let i = 0; i < texts.length; i += chunkSize) {
            const chunk = texts.slice(i, i + chunkSize);

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
            console.log(`Chunk API Response [${i / chunkSize + 1}]:`, embeddingsData);

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

// Function to display only the first embedding result on the webpage
function displayBatchEmbeddings(embeddings) {
    if (embeddings && Array.isArray(embeddings) && embeddings.length > 0) {
        // Display only the first embedding
        const firstEmbedding = embeddings[0];
        document.getElementById('batchEmbeddings').textContent = `First embedding: ${JSON.stringify(firstEmbedding, null, 2)}`;
    } else {
        document.getElementById('batchEmbeddings').textContent = 'Error generating batch embeddings. Check console for details.';
    }
}
