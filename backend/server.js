import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";
import { db } from "./database.js";

Deno.serve({ port: 8000 }, async (req) => {
  const url = new URL(req.url);

  // --- API ROUTES ---
  if (url.pathname === "/api/inventory" && req.method === "GET") {
    // Use .prepare().all() to fetch all rows from @db/sqlite
    const ingredients = db.prepare("SELECT * FROM Ingredients").all();
    
    return new Response(JSON.stringify(ingredients), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- FRONTEND ROUTING ---
  // If it's not an API call, serve the HTML/CSS/JS files from the frontend folder
  return serveDir(req, {
    fsRoot: "./frontend",
    showDirListing: true,
  });
});

console.log("🚀 Server running on http://localhost:8000");