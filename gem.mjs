console.log(`gem.mjs (gemini SDK) imported\n${Date()}`);

class GEM {
    constructor(key) {
        this.loadedAt = Date()
        this.key = key || localStorage.gemKey
        if (!this.key) {
            this.key = prompt(`please provide your API key, you can find it at https://aistudio.google.com/app/apikey`)
            localStorage.gemKey = this.key
        }
        this.post = async function(txt="how to best grill sardines") {
            let res = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': `${this.key}`
                },
                body: JSON.stringify({
                    "contents": [{
                        "parts": [{
                            "text": txt
                        }]
                    }]
                })
            })).json()
            console.log('res:',res.candidates[0].content.parts[0].text)
            return res
        }
        this.embed=async function(txt="how to best grill sardines"){
            let res = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': `${this.key}`
                },
                body: JSON.stringify({
                    "model": "models/text-embedding-004",
                    "content": {
                        "parts": [{
                            "text": txt
                        }]
                    }
                })
            })).json()
            return res.embedding.values
        }
    }
}

export {GEM}