console.log(`import loadTCGAreports.mjs\n${Date()}`);

function saveFile(txt=':-)',fileName="hello.txt") { // x is the content of the file
	var bb = new Blob([txt]);
   	var url = URL.createObjectURL(bb);
	var a = document.createElement('a')
   	a.href=url;
	if (fileName){
		if(typeof(fileName)=="string"){ // otherwise this is just a boolean toggle or something of the sort
			a.download=fileName;
		}
		a.click() // then download it automatically 
	} 
	return a
}

const JSZip = (await import('https://esm.sh/jszip@3.10.1'))
console.log(`0/4. Load key dependency, JSZip`)

// const url = 'https://epiverse.github.io/tcgapath/TCGA_Reports.csv.zip' // default file url
// https://raw.githubusercontent.com/jkefeli/tcga-path-reports/refs/heads/main/TCGA_Reports.csv.zip
// https://epiverse.github.io/tcgapath/TCGA_Reports.csv.zip
async function loadTCGAreports(url='https://raw.githubusercontent.com/jkefeli/tcga-path-reports/refs/heads/main/TCGA_Reports.csv.zip'){
    let tic = Date.now()
    // 1. load pathology reports
    console.log(`1/5. Load pathology reports from ${url} ...`)
    let response = await fetch(url)
    let data = response.arrayBuffer()
    let zip = await JSZip.loadAsync(data);
    let filename='TCGA_Reports.csv'
    let file = zip.file(filename)
    let content = await file.async('string')
    content = content.split('\n').slice(1,-1) // cut column headers and blank tail
    // 2. parse ids and text for individual reports
    console.log(`2/5. Parse individual reports into a object array structure ...`)
    let reps=content.map(function(row,i){ // map individual reports
        let id=row.match(/(^[^\,]+)/)[0] // patient id
        return {
            i:i,
            id:id,
            text:row.slice(id.length+1).slice(1,-1) // removing non standard start and end whitespace
        }
    })
    console.log(`3/5. Load and parse individual embeddings ...`)
    // 3. load embeddings reports
    // note variable names being reused, no need to re-declare them
    response = await fetch('https://epiverse.github.io/tcgapath/embeddings.tsv.zip')
    data = response.arrayBuffer()
    zip = await JSZip.loadAsync(data)
    file = zip.file('embeddings.tsv')
    let rows = await file.async('string')
    //rows = content.split('\n')
    rows.forEach(function(row,i){
        reps[i].embeddings=row.split('\t').map(JSON.parse)
    })
    console.log(`4/5. Load and assign pathology slide ids to patients ... wait for 5/5 ...`)
    // 4. load whole slide images (wsi)
    response = await fetch('https://epiverse.github.io/tcgapath/wsi.json.zip')
    data = response.arrayBuffer()
    zip = await JSZip.loadAsync(data)
    file = zip.file('wsi.json')
    content = await file.async('string')
    let wsis = JSON.parse(content).dataset
    wsis.forEach(function(wsi,i){
        let patient = wsi.file_name.match(/TCGA-[^-]+-[^-\.]+/)[0]
        // find this patient in the reports (var reps)
        reps.forEach(function(repj,j){
            if(repj.id.match(/TCGA-[^-]+-[^-\.]+/)[0]==patient){ // match patient
                if(!reps[j].svs){reps[j].svs=[]} // make sure there is a svs array for images
                reps[j].svs.push({
                    uuid:wsi.id,
                    file_name:wsi.file_name,
                    cancer_type:wsi.class // should match the pateint metadata
                })
            }
        })
    })
    // QAQC
    let multipleImages=[]
    reps.forEach(function(repj,j){
        if(reps[j].svs){
            if(reps[j].svs.length>4){
                multipleImages.push(j)
            }
        }
    })
    console.log(`... 5/5 done, TCGA reports assembled in (${(Date.now()-tic)/1000} secs)`)
    console.log('QAQC: reports with 5+ svs images',multipleImages)
    return reps
}

async function saveFullDataJSON(reps=false,fname='tcgaPathReports.json'){
    if(!reps){
        console.log(`assembling reports, tipically under a minute`)
        reps = await loadTCGAreports()
    }else if(typeof(reps)=='string'){
        reps = JSON.parse(reps)
    }
    saveFile(JSON.stringify(reps),fname)
}

export{
    loadTCGAreports,
    saveFullDataJSON
}

// reps = (await ((await import('http://localhost:8000/tcgapath/loadTCGAreports.mjs')).loadTCGAreports)())
// reps = (await ((await import('https://epiverse.github.io/tcgapath/loadTCGAreports.mjs')).loadTCGAreports)())