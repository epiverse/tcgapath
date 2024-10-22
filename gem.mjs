console.log(`gem.mjs (gemini SDK) imported\n${Date()}`);

function validKey(key) {
    let vKey = key || localStorage.gemKey || localStorage._gemApiKey
    if (typeof (vKey) == 'undefined') {
        vKey = false
    } else {
        if (vKey.length < 10) {
            vKey = false
        }
    }
    if (!vKey) {
        vKey = prompt(`please provide your API key, you can find it at https://aistudio.google.com/app/apikey`)
        localStorage.gemKey = vKey
    }
    return vKey
}
class GEM {
    constructor(key) {
        this.loadedAt = Date()
        this.key = validKey(key)
        let thisKey=this.key
        this.post = async function(txt="how to best grill sardines") {
            let res = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': `${thisKey}`
                },
                body: JSON.stringify({
                    "contents": [{
                        "parts": [{
                            "text": txt
                        }]
                    }]
                })
            })).json()
            console.log('res:', res.candidates[0].content.parts[0].text)
            return res
        }
        this.embed = async function(txt="how to best grill sardines", dim=768) {
            let res = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': `${thisKey}`
                },
                body: JSON.stringify({
                    "model": "models/text-embedding-004",
                    "output_dimensionality": dim,
                    "content": {
                        "parts": [{
                            "text": txt
                        }]
                    }
                })
            })).json()
            console.log(res)
            return res.embedding.values
        }
    }
}

export {GEM,validKey}