const fetch = require("node-fetch");

exports.handler = async function(event, context) {
    const url = "https://script.google.com/macros/s/AKfycbyQ8W0o7Kb_BR-umdOYho6DG4h4f7UXle3wsDOy6DbZMA6IwXaZ2bXKMui5VcwFQIn9/exec";
    
    const params = event.rawQuery ? "?" + event.rawQuery : "";
    const targetUrl = url + params;

    const response = await fetch(targetUrl);
    const data = await response.text();

    return {
        statusCode: 200,
        body: data
    };
};
