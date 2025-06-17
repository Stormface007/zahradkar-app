const fetch = require("node-fetch");

// ZDE vlož svojí vlastní Apps Script URL, kterou už máš vytvořenou:
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyQ8W0o7Kb_BR-umdOYho6DG4h4f7UXle3wsDOy6DbZMA6IwXaZ2bXKMui5VcwFQIn9/exec";

exports.handler = async function(event, context) {
    const params = event.rawQuery ? "?" + event.rawQuery : "";
    const targetUrl = APPS_SCRIPT_URL + params;

    try {
        const response = await fetch(targetUrl);
        const data = await response.text();

        return {
            statusCode: 200,
            body: data
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
