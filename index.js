console.log(`index.js loaded\n${Date()}`);

// dependencies

//saveFile = (await import('https://jonasalmeida.github.io/jmat/jmat.mjs')).saveFile

// application

(async function() {
    const saveFile = (await import('https://jonasalmeida.github.io/jmat/jmat.mjs')).saveFile
    let conversation = []
    // system prompt?
    console.log(`async runtime\n${Date()}`);
    const shdown = new ((await import('https://esm.sh/showdown@2.1.0')).default).Converter
    GEM = (await import(`${location.href}gem.mjs`)).GEM
    g1 = new GEM

    provideKey.onclick = function() {
        localStorage.gemKey = prompt(`please provide your API key, you can find it at https://aistudio.google.com/app/apikey`)
    }

    showInfo.onchange = function() {
        if (showInfo.checked) {
            divList.hidden = false
        } else {
            divList.hidden = true
        }
    }

    embed.onclick = async function() {
        let n = conversation.length
        promptTextArea.value = '...'
        if (embedQ.checked) {
            let ebs = await g1.embed(conversation[n - 2]);
            promptTextArea.value = JSON.stringify(ebs)
            console.log('Q', conversation[n - 2])
        }
        if (embedA.checked) {
            let ebs = await g1.embed(conversation[n - 1]);
            promptTextArea.value = JSON.stringify(ebs)
            console.log('A', conversation[n - 1])
        }
        if (embedQA.checked) {
            let ebs = await g1.embed(conversation.slice(n - 2, n).join(' , '));
            promptTextArea.value = JSON.stringify(ebs)
            console.log('QA', conversation.slice(n - 2, n))
        }
        if (embedQAs.checked) {
            let ebs = await g1.embed(conversation.join(' , '));
            promptTextArea.value = JSON.stringify(ebs)
            console.log('QAs', conversation)
        }
    }

    toFile.onclick = function() {
        saveFile(promptTextArea.value, [...document.getElementsByName('embedTarget')].filter(x => x.checked)[0].id + '.json')
    }

    toMemory.onclick = function() {
        let txt = promptTextArea.value
        navigator.clipboard.writeText(txt)
        toMemory.style.backgroundColor = 'lime'
        setTimeout(function() {
            toMemory.style.backgroundColor = ''
        }, 300)
    }

    reset.onclick = function() {
        location.href = location.href
    }

    clear.onclick=function(){
        promptTextArea.value=''
    }

    promptTextArea.onkeydown = async function(ev) {
        //promptTextArea.focus()
        if ((ev.key == 'Enter') & (!ev.shiftKey)) {
            //console.log(`Enter at ${Date()}`,ev)
            let div = document.createElement('div')
            responseDiv.appendChild(div)
            conversation.push(promptTextArea.value)
            div.innerHTML = `<span style="color:DarkGreen">${promptTextArea.value}</span>`
            //let res = await g1.post(promptTextArea.value);
            let res = await g1.post(conversation.join(' ; '));
            promptTextArea.value = '...'
            div.innerHTML += `<p style="color:blue">${shdown.makeHtml(res.candidates[0].content.parts[0].text)}</p><hr>`
            conversation.push(res.candidates[0].content.parts[0].text)
            promptTextArea.value = ''
            promptTextArea.focus()
            console.log(res.candidates, conversation)
        }
    }
}
)();

// Function to get embedding using Gemini API
// async function getEmbedding(text) {
//     try {
//         const gemini = new (await import('https://episphere.github.io/gemini/gem.mjs')).GEM();
//         const embedding = await gemini.embed(text);
//         return embedding;
//     } catch (error) {
//         console.error('Error retrieving embedding:', error);
//         return null;  // Return null in case of an error
//     }
// }

// // Function to display the single embedding result on the webpage
// function displaySingleEmbedding(embedding) {
//     if (embedding) {
//         document.getElementById('singleEmbedding').textContent = JSON.stringify(embedding, null, 2);
//     } else {
//         document.getElementById('singleEmbedding').textContent = 'Error generating embedding.';
//     }
// }

// Function to get embedding using Gemini API
async function getEmbedding(text) {
    try {
        //const gemini = new (await import('https://episphere.github.io/gemini/gem.mjs')).GEM();
        const embedding = await g1.embed(text);
        return embedding;
    } catch (error) {
        console.error('Error retrieving embedding:', error);
        return null;  // Return null in case of an error
    }
}

// Function to display the single embedding result on the webpage
function displaySingleEmbedding(embedding) {
    if (embedding) {
        document.getElementById('singleEmbedding').textContent = JSON.stringify(embedding, null, 2);
    } else {
        document.getElementById('singleEmbedding').textContent = 'Error generating embedding.';
    }
}

// Function to get batch embeddings using Gemini API
async function getBatchEmbeddings(texts) {
    try {
        const gemini = new (await import('https://episphere.github.io/gemini/gem.mjs')).GEM();
        // Map the texts to the required format for the Gemini API
        const formattedTexts = texts.map(text => ({ "text": text }));
        const embeddings = await gemini.embed(formattedTexts);
        console.log("Batch embeddings retrieved successfully:", embeddings);
        return embeddings;  // Don't forget to return the embeddings
    } catch (error) {
        console.error('Error retrieving batch embeddings:', error);
        return null; // Return null in case of an error
    }
}

// Function to display the batch embedding results on the webpage
function displayBatchEmbeddings(embeddings) {
    if (embeddings) {
        document.getElementById('batchEmbeddings').textContent = JSON.stringify(embeddings, null, 2);
    } else {
        document.getElementById('batchEmbeddings').textContent = 'Error generating batch embeddings. Check console for details.';
    }
}

// On page load, first get the embedding for a specific text
document.addEventListener('DOMContentLoaded', async () => {
    const specificText = 'TCGA-BP-5195.25c0b433-5557-4165-922e-2c1eac9c26f0, Date of Receipt: Clinical Diagnosis & History: Incidental 3 cm left upper pole renal mass. Specimens Submitted: 1: Kidney, Left Upper Pole';

    // Display a loading message while fetching the single embedding
    document.getElementById('singleEmbedding').textContent = 'Fetching embedding for specific text...';

    // Get the embedding for the specific text
    const singleEmbedding = await getEmbedding(specificText);
    displaySingleEmbedding(singleEmbedding);

    // After displaying the single embedding, fetch batch embeddings
    const texts = [
        "What is the meaning of life?",
        "How much wood would a woodchuck chuck?",
        "How does the brain work?"
    ];

    // Display a loading message while fetching batch embeddings
    document.getElementById('batchEmbeddings').textContent = 'Fetching batch embeddings...';

    // Get batch embeddings for the texts
    const batchEmbeddings = await getBatchEmbeddings(texts);
    displayBatchEmbeddings(batchEmbeddings);
});
