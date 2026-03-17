const axios = require('axios');
const CryptoJS = require('crypto-js');

export default async function handler(req, res) {
    const { number } = req.query;

    if (!number) {
        return res.status(400).json({ error: "Please provide a number in query. Example: ?number=923104882921" });
    }

    const targetUrl = "https://xupdates.gt.tc/whatsapp-dp/";
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://xupdates.gt.tc/'
    };

    try {
        // 1. Pehle page par jana security challenge dekhne ke liye
        const initialResponse = await axios.get(targetUrl, { headers, timeout: 5000 });
        const html = initialResponse.data;

        let testCookie = "";

        // Agar JavaScript challenge maujood hai
        if (typeof html === 'string' && html.includes('toNumbers')) {
            try {
                const aVal = html.match(/a=toNumbers\("([a-f0-9]+)"\)/)[1];
                const bVal = html.match(/b=toNumbers\("([a-f0-9]+)"\)/)[1];
                const cVal = html.match(/c=toNumbers\("([a-f0-9]+)"\)/)[1];

                const key = CryptoJS.enc.Hex.parse(aVal);
                const iv = CryptoJS.enc.Hex.parse(bVal);
                const ciphertext = CryptoJS.enc.Hex.parse(cVal);

                const decrypted = CryptoJS.AES.decrypt(
                    { ciphertext: ciphertext },
                    key,
                    { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.NoPadding }
                );

                testCookie = decrypted.toString(CryptoJS.enc.Hex);
            } catch (err) {
                return res.status(500).json({ error: "Failed to solve JS challenge", details: err.message });
            }
        }

        // 2. Ab asli API ko hit karna
        const apiHeaders = {
            ...headers,
            'Cookie': testCookie ? `__test=${testCookie}` : '',
            'Content-Type': 'application/json',
            'Referer': 'https://xupdates.gt.tc/whatsapp-dp/?i=1'
        };

        const apiResponse = await axios.post('https://xupdates.gt.tc/whatsapp-dp/api.php?action=fetch', 
        { number: number }, 
        { headers: apiHeaders, timeout: 10000 });

        if (apiResponse.data && apiResponse.data.success) {
            const base = "https://xupdates.gt.tc";
            return res.status(200).json({
                success: true,
                image_url: base + apiResponse.data.imageUrl,
                download_url: base + apiResponse.data.downloadUrl
            });
        } else {
            return res.status(404).json({ 
                success: false, 
                message: "DP not found or private.",
                raw: apiResponse.data 
            });
        }

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: "Request Failed", 
            message: error.message 
        });
    }
                }
