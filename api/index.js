const axios = require('axios');
const CryptoJS = require('crypto-js');

export default async function handler(req, res) {
    const { number } = req.query;

    if (!number) {
        return res.status(400).json({ error: "Please provide a number." });
    }

    try {
        const url = "https://xupdates.gt.tc/whatsapp-dp/";
        
        // 1. Pehle page se security tokens nikalna
        const firstResponse = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0 Safari/537.36' }
        });

        const html = firstResponse.data;

        // Security values (a, b, c) extract karna
        const aVal = html.match(/toNumbers\("([a-f0-9]+)"\)/g)[0].match(/"([a-f0-9]+)"/)[1];
        const bVal = html.match(/toNumbers\("([a-f0-9]+)"\)/g)[1].match(/"([a-f0-9]+)"/)[1];
        const cVal = html.match(/toNumbers\("([a-f0-9]+)"\)/g)[2].match(/"([a-f0-9]+)"/)[1];

        // AES Challenge solve karke __test cookie banana
        const key = CryptoJS.enc.Hex.parse(aVal);
        const iv = CryptoJS.enc.Hex.parse(bVal);
        const ciphertext = CryptoJS.enc.Hex.parse(cVal);

        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            key,
            { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.NoPadding }
        );

        const testCookie = decrypted.toString(CryptoJS.enc.Hex);

        // 2. Main API request bhejna Cookie ke saath
        const apiResponse = await axios.post('https://xupdates.gt.tc/whatsapp-dp/api.php?action=fetch', 
        { number: number }, 
        {
            headers: {
                'Cookie': `__test=${testCookie}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0 Safari/537.36',
                'Referer': 'https://xupdates.gt.tc/whatsapp-dp/?i=1'
            }
        });

        if (apiResponse.data && apiResponse.data.success) {
            const base = "https://xupdates.gt.tc";
            res.status(200).json({
                success: true,
                image_url: base + apiResponse.data.imageUrl,
                download_url: base + apiResponse.data.downloadUrl
            });
        } else {
            res.status(404).json({ success: false, message: "Profile data not found." });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
