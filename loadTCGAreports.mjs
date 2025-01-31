console.log(`import loadTCGAreports.mjs\n${Date()}`);
const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default
console.log(`0/7. Load key dependency, JSZip`)

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

// const url = 'https://epiverse.github.io/tcgapath/TCGA_Reports.csv.zip' // default file url
// https://raw.githubusercontent.com/jkefeli/tcga-path-reports/refs/heads/main/TCGA_Reports.csv.zip
// https://epiverse.github.io/tcgapath/TCGA_Reports.csv.zip
async function loadTCGAreports(url='https://raw.githubusercontent.com/jkefeli/tcga-path-reports/refs/heads/main/TCGA_Reports.csv.zip'){
    let tic = Date.now()
	// 1. load pathology reports
    console.log(`1/7. Load pathology reports from ${url} ...`);
    let response = await fetch(url)
    let data = await response.arrayBuffer()
    let zip = await JSZip.loadAsync(data);
    let filename='TCGA_Reports.csv'
    let file = zip.file(filename)
    let content = await file.async('string')
    content = content.split('\n').slice(1,-1) // cut column headers and blank tail
    // 2. parse ids and text for individual reports
    console.log(`2/7. Parse individual reports into a object array structure ...`)
    let reps=content.map(function(row,i){ // map individual reports
        let id=row.match(/(^[^\,]+)/)[0] // patient id
        return {
            i:i,
            id:id,
            text:row.slice(id.length+1).slice(1,-1) // removing non standard start and end whitespace
        }
    })
    console.log(`3/7. Load and parse individual embeddings ...`)
    // 3. load embeddings reports
    // note variable names being reused, no need to re-declare them
    response = await fetch('https://epiverse.github.io/tcgapath/embeddings.tsv.zip')
    data = response.arrayBuffer()
    zip = await JSZip.loadAsync(data)
    file = zip.file('embeddings.tsv')
    content = await file.async('string')
    let rows = content.split('\n')
    rows.forEach(function(row,i){
        reps[i].embeddings=row.split('\t').map(JSON.parse)
    })
    console.log(`4/7. Load and assign pathology slide ids to patients ... almost there, wait for 6/7 ...`)
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
    console.log(`... 5/7 done, TCGA reports assembled in (${(Date.now()-tic)/1000} secs)`)
    console.log('QAQC: reports with 5+ svs images',multipleImages)


    console.log(`metadata loaded ${Date()}`)
	// load cancer type metadata
	let metadata = (await (await fetch('https://raw.githubusercontent.com/jkefeli/tcga-path-reports/refs/heads/main/data/tcga_metadata/tcga_patient_to_cancer_type.csv')).text()).split('\r\n').map(row => row.split(',')).slice(1)
	// match reps to metadata
    reps.forEach((rep,i)=>{
        // match for each metadata id
        let repId = rep.id.match(/^[^/.]*/)[0]
		let metaMatch=false
		metadata.forEach((meta,j)=>{
			if(repId==meta[0]){
	            reps[i].patient_id=repId
	            reps[i].cancer_type=meta[1]
	            metaMatch=repId
	        }
	    })
    if(!metaMatch){
        console.log(repId,`no metadata match`)
    }
        //console.log(`match:`,repId)
    })

	console.log(`6/7 validated with TCGA Metadata`)
	let dtLee = (await (await fetch('https://raw.githubusercontent.com/epiverse/tcgapath/refs/heads/main/gdc_tcga_reports_verbose.json')).json()).data.hits
	let idLee = dtLee.map(function(x){
    let checkFileName = x.file_name.match(/^TCGA-[\w]+-\w+/)
       if(checkFileName){
            return checkFileName[0]
       }else{
            return false
       }
    })

	// populate individual reports with Lee's digest
	
	reps.forEach((ri,i)=>{ // for each TCGA Report
		// check id match
		if((idLee.filter((id,j)=>(id==ri.patient_id))).length==1){
			reps[i].catalog=dtLee[idLee.indexOf(ri.patient_id)] // unfinished
		}else{
			console.log(`${ri.patient_id} missaligned`)
		}
	})
	console.log(`7/7 Demographic and other data extracted from Lee's catalog digest, we're done here :-)`)
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
    saveFullDataJSON,
	saveFile
}

// reps = (await ((await import('http://localhost:8000/tcgapath/loadTCGAreports.mjs')).loadTCGAreports)())
// reps = (await ((await import('https://epiverse.github.io/tcgapath/loadTCGAreports.mjs')).loadTCGAreports)())
