const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

export default async function handler(req, res) {
    const { number } = req.query;

    if (!number) {
        return res.status(400).json({ error: "Number missing! Example: ?number=923104882921" });
    }

    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36');

        // Website par jana
        await page.goto('https://xupdates.gt.tc/whatsapp-dp/?i=1', {
            waitUntil: 'networkidle2',
        });

        // Browser ke andar fetch execute karna taki cookies bypass ho jayein
        const result = await page.evaluate(async (targetNumber) => {
            const response = await fetch('https://xupdates.gt.tc/whatsapp-dp/api.php?action=fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: targetNumber })
            });
            return await response.json();
        }, number);

        if (result && result.success) {
            const baseUrl = "https://xupdates.gt.tc";
            res.status(200).json({
                success: true,
                image_url: baseUrl + result.imageUrl,
                download_url: baseUrl + result.downloadUrl
            });
        } else {
            res.status(404).json({ success: false, message: "DP not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (browser !== null) await browser.close();
    }
    }
