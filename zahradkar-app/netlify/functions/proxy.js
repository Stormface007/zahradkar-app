// netlify/functions/proxy.js
const fetch = require("node-fetch");

// Základní adresa vašeho GAS webappu
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxqNqvm7OXgo2E5HYbusxM4ZBn10zwV5ZkfTEnB4zepGI8w_DdLZanDgLyWexwvAI71/exec";

// Pokud není GAS_URL v env, použijeme tuhle konstantu
const GAS_URL = process.env.GAS_URL || APPS_SCRIPT_URL;

exports.handler = async (event, context) => {
  const { httpMethod, queryStringParameters = {}, body } = event;

  // CORS preflight
  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: ""
    };
  }

  try {
    // Přeposlání GET
    if (httpMethod === "GET") {
      const qs = new URLSearchParams(queryStringParameters).toString();
      const resp = await fetch(`${GAS_URL}?${qs}`);
      const text = await resp.text();
      return {
        statusCode: resp.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": resp.headers.get("Content-Type") || "application/json"
        },
        body: text
      };
    }

    // Přeposlání POST (form data)
    if (httpMethod === "POST") {
      const resp = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body
      });
      const text = await resp.text();
      return {
        statusCode: resp.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/plain"
        },
        body: text
      };
    }

    // Jiná než GET/POST/OPTIONS → Method Not Allowed
    return {
      statusCode: 405,
      headers: { Allow: "GET,POST,OPTIONS" },
      body: "Method Not Allowed"
    };

  } catch (err) {
    console.error("Proxy error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "Internal Server Error"
    };
  }
};
