const fetch = require("node-fetch");

// Nahraď svou funkční Google Apps Script URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyGn2TAzvn4y0xd7I1fSluPxT5oBXVNgQ30Ln1Y2sdxdzpBjGvWKRw92SodvgwDZBXL/exec";

exports.handler = async function(event, context) {
    const params = event.rawQuery ? "?" + event.rawQuery : "";
    const targetUrl = APPS_SCRIPT_URL + params;

    try {
        const response = await fetch(targetUrl);
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const json = await response.json();
            return {
                statusCode: 200,
                body: JSON.stringify(json),
                headers: {
                    "Content-Type": "application/json"
                }
            };
        } else {
            const text = await response.text();
            return {
                statusCode: 200,
                body: text,
                headers: {
                    "Content-Type": "text/plain"
                }
            };
        }

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
            headers: {
                "Content-Type": "application/json"
            }
        };
    }
};
