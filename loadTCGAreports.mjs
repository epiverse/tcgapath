console.log(`import loadTCGAreports.mjs\n${Date()}`);

const JSZip = (await import('https://esm.sh/jszip@3.10.1'))
console.log(`0/4. Load key dependency, JSZip`)

// const url = 'https://epiverse.github.io/tcgapath/TCGA_Reports.csv.zip' // default file url

async function loadTCGAreports(url='https://epiverse.github.io/tcgapath/TCGA_Reports.csv.zip'){
    // 1. load pathology reports
    console.log(`1/4. Load pathology reports from ${url}`)
    let response = await fetch(url)
    let data = response.arrayBuffer()
    let zip = await JSZip.loadAsync(data);
    let filename='TCGA_Reports.csv'
    let file = zip.file(filename)
    let content = await file.async('string')
    content = content.split('\n').slice(1,-1) // cut column headers and blank tail
    // 2. parse ids and text for individual reports
    console.log(`2/4. Parse individual reports into a object array structure`)
    let reps=content.map(function(row,i){ // map individual reports
        let id=row.match(/(^[^\,]+)/)[0] // patient id
        return {
            i:i,
            id:id,
            text:row.slice(id.length+1).slice(1,-1) // removing non standard start and end whitespace
        }
    })
    console.log(`3/4. Load and parse individual embeddings ... wait for 4/4 ...`)
    // 3. load embeddings reports
    // note variable names being reused, no need to re-decale them
    response = await fetch('https://epiverse.github.io/tcgapath/embeddings.tsv.zip')
    data = response.arrayBuffer()
    zip = await JSZip.loadAsync(data)
    file = zip.file('embeddings.tsv')
    content = await file.async('string')
    content = content.split('\n')
    content.forEach(function(row,i){
        reps[i].embeddings=row.split('\t').map(JSON.parse)
    })
    console.log(`4/4. ... Done, wrapping up report structure`)
    return reps
}

export{
    loadTCGAreports
}

// reps = (await ((await import('http://localhost:8000/tcgapath/loadTCGAreports.mjs')).loadTCGAreports)())
// reps = (await ((await import('https://epiverse.github.io/tcgapath/loadTCGAreports.mjs')).loadTCGAreports)())