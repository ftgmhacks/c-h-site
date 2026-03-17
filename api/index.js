const axios = require('axios');
const CryptoJS = require('crypto-js');

export default async function handler(req, res) {
    const { number } = req.query;

    if (!number) {
        return res.status(400).json({ error: "Number missing. Use ?number=923xxxx" });
    }

    const targetUrl = "https://xupdates.gt.tc/whatsapp-dp/";
    const commonHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    };

    try {
        // Step 1: Get the Challenge Page
        const response = await axios.get(targetUrl, { 
            headers: commonHeaders,
            timeout: 8000 
        });

        const html = response.data;
        let testCookie = "";

        // Step 2: Extract AES values with extreme caution (No more crashes)
        const hexValues = html.match(/toNumbers\("([a-f0-9]+)"\)/g);

        if (hexValues && hexValues.length >= 3) {
            const a = hexValues[0].match(/"([a-f0-9]+)"/)[1];
            const b = hexValues[1].match(/"([a-f0-9]+)"/)[1];
            const c = hexValues[2].match(/"([a-f0-9]+)"/)[1];

            const key = CryptoJS.enc.Hex.parse(a);
            const iv = CryptoJS.enc.Hex.parse(b);
            const cipher = CryptoJS.enc.Hex.parse(c);

            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: cipher },
                key,
                { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.NoPadding }
            );

            testCookie = decrypted.toString(CryptoJS.enc.Hex);
        } else {
            // Agar challenge nahi mila, shayad cookie pehle se set ho ya IP block ho
            console.log("No challenge found in HTML");
        }

        // Step 3: Call the Actual API
        const apiResponse = await axios.post('https://xupdates.gt.tc/whatsapp-dp/api.php?action=fetch', 
            { number: number },
            {
                headers: {
                    ...commonHeaders,
                    'Cookie': testCookie ? `__test=${testCookie}` : '',
                    'Content-Type': 'application/json',
                    'Referer': 'https://xupdates.gt.tc/whatsapp-dp/?i=1',
                    'Origin': 'https://xupdates.gt.tc'
                },
                timeout: 10000
            }
        );

        if (apiResponse.data && apiResponse.data.success) {
            return res.status(200).json({
                success: true,
                image: "https://xupdates.gt.tc" + apiResponse.data.imageUrl,
                download: "https://xupdates.gt.tc" + apiResponse.data.downloadUrl
            });
        } else {
            return res.status(200).json({ 
                success: false, 
                message: "Website returned error or number not found.",
                debug: apiResponse.data 
            });
        }

    } catch (error) {
        // Return error as JSON instead of crashing with 500
        return res.status(200).json({
            success: false,
            error: "Connection Problem",
            message: error.message,
            hint: "The website might be blocking Vercel IP or the number is invalid."
        });
    }
                                         }
