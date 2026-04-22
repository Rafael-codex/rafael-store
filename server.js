const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ========== ARCHIVOS ==========
let archivos = [];
const DATA_FILE = "data.json";

// Cargar datos existentes
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = fs.readFileSync(DATA_FILE, "utf8");
        archivos = data ? JSON.parse(data) : [];
        console.log(`📁 Cargados ${archivos.length} archivos previos`);
    } catch (e) {
        console.log("⚠️ Error leyendo data.json:", e.message);
        archivos = [];
    }
}

// ========== ENDPOINTS ==========

// Listar todos los archivos (sin el contenido pesado)
app.get("/api/archivos", (req, res) => {
    const lista = archivos.map(a => ({
        id: a.id,
        nombre: a.nombre,
        descripcion: a.descripcion,
        imagen: a.imagen,
        fecha: a.fecha
    }));
    res.json(lista);
});

// Subir nuevo archivo
app.post("/api/subir", (req, res) => {
    const { nombre, descripcion, contenido, imagen } = req.body;
    
    if (!nombre || !contenido) {
        return res.status(400).json({ error: "Faltan nombre o contenido" });
    }
    
    const nuevoArchivo = {
        id: Date.now(),
        nombre: nombre.trim(),
        descripcion: descripcion || "",
        contenido: contenido,
        imagen: imagen || null,
        fecha: new Date().toISOString()
    };
    
    archivos.push(nuevoArchivo);
    
    // Guardar en disco
    fs.writeFileSync(DATA_FILE, JSON.stringify(archivos, null, 2));
    
    console.log(`✅ Subido: ${nombre} (ID: ${nuevoArchivo.id})`);
    
    res.json({
        success: true,
        mensaje: "Archivo subido correctamente",
        id: nuevoArchivo.id,
        url: `/ver/${nuevoArchivo.id}`
    });
});

// Ver un archivo (página completa con visor funcional)
app.get("/ver/:id", (req, res) => {
    const archivo = archivos.find(a => a.id == req.params.id);
    
    if (!archivo) {
        return res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><title>No encontrado</title></head>
            <body style="background:#0a0f1e;color:white;text-align:center;padding:50px;">
                <h2>❌ Archivo no encontrado</h2>
                <a href="/" style="color:cyan;">Volver al inicio</a>
            </body>
            </html>
        `);
    }
    
    // Generar página HTML con el visor
    const htmlContent = generarPaginaVisor(archivo);
    res.send(htmlContent);
});

// Endpoint para obtener el contenido raw de un archivo (para el iframe)
app.get("/raw/:id", (req, res) => {
    const archivo = archivos.find(a => a.id == req.params.id);
    
    if (!archivo || !archivo.contenido) {
        return res.status(404).send("Archivo no encontrado");
    }
    
    res.setHeader("Content-Type", "text/html");
    res.send(archivo.contenido);
});

// Página principal (opcional)
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>Rafael-Codex Server</title></head>
        <body style="background:#0a0f1e;color:white;text-align:center;padding:50px;">
            <h1>🔥 Rafael-Codex Server Activo 🔥</h1>
            <p>Usa tu interfaz HTML para subir archivos</p>
            <p>📁 Archivos guardados: ${archivos.length}</p>
        </body>
        </html>
    `);
});

// ========== FUNCIÓN PARA GENERAR PÁGINA VISOR ==========
function generarPaginaVisor(archivo) {
    const id = archivo.id;
    const rawUrl = `/raw/${id}`;
    const downloadUrl = `/descargar/${id}`;
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(archivo.nombre)} - Rafael Codex</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: radial-gradient(circle at 10% 20%, #0a0f1e, #03050b);
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            color: #eef5ff;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1300px;
            margin: 0 auto;
        }
        .header {
            background: rgba(15, 25, 45, 0.8);
            backdrop-filter: blur(12px);
            border-radius: 24px;
            padding: 25px;
            margin-bottom: 25px;
            text-align: center;
            border: 1px solid rgba(0, 255, 255, 0.3);
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }
        h1 {
            font-family: 'Courier New', monospace;
            font-size: 2rem;
            background: linear-gradient(135deg, #aaffff, #7a2eff);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            margin-bottom: 10px;
        }
        .preview-img {
            max-width: 100%;
            max-height: 300px;
            border-radius: 20px;
            margin: 20px auto;
            display: block;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.2);
            object-fit: contain;
        }
        .desc-box {
            background: rgba(0,0,0,0.4);
            padding: 15px 20px;
            border-radius: 16px;
            margin: 15px 0;
            text-align: center;
        }
        .button-group {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
            margin: 20px 0;
        }
        .btn {
            padding: 12px 28px;
            border: none;
            border-radius: 40px;
            font-weight: bold;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-family: inherit;
        }
        .btn:hover {
            transform: translateY(-2px);
            filter: brightness(1.05);
        }
        .btn-primary {
            background: linear-gradient(95deg, #2b6eff, #9f4dff);
            color: white;
            box-shadow: 0 4px 12px rgba(155, 77, 255, 0.3);
        }
        .btn-secondary {
            background: #ff3366;
            color: white;
            box-shadow: 0 4px 12px rgba(255, 51, 102, 0.3);
        }
        .btn-outline {
            background: transparent;
            border: 1px solid cyan;
            color: cyan;
        }
        .visor-wrapper {
            background: #00000055;
            border-radius: 24px;
            padding: 10px;
            margin-top: 20px;
            border: 1px solid rgba(0, 255, 255, 0.2);
        }
        iframe {
            width: 100%;
            height: 550px;
            border-radius: 16px;
            border: none;
            background: white;
        }
        .status {
            text-align: center;
            margin-top: 15px;
            font-size: 0.85rem;
            color: #8aa2d4;
        }
        footer {
            text-align: center;
            margin-top: 30px;
            font-size: 0.75rem;
            opacity: 0.6;
        }
        @media (max-width: 768px) {
            iframe { height: 400px; }
            .btn { padding: 8px 18px; font-size: 0.85rem; }
            h1 { font-size: 1.5rem; }
        }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>✨ ${escapeHtml(archivo.nombre)} ✨</h1>
        <p><i>📁 Publicado el ${new Date(archivo.fecha).toLocaleDateString()}</i></p>
    </div>
    
    ${archivo.imagen ? `<img src="${archivo.imagen}" class="preview-img" alt="Vista previa del archivo" onerror="this.style.display='none'">` : ""}
    
    ${archivo.descripcion ? `<div class="desc-box">📝 ${escapeHtml(archivo.descripcion)}</div>` : ""}
    
    <div class="button-group">
        <button class="btn btn-primary" id="btnDescargar">
            ⬇️ Descargar HTML
        </button>
        <button class="btn btn-secondary" id="btnCompartir">
            🔗 Compartir enlace
        </button>
        <button class="btn btn-outline" id="btnNuevaPestana">
            🪟 Abrir en nueva pestaña
        </button>
    </div>
    
    <div class="visor-wrapper">
        <iframe id="visorFrame" src="${rawUrl}" title="Vista previa del archivo HTML"></iframe>
    </div>
    <div class="status">
        ✅ El archivo se muestra arriba · Puedes descargarlo o compartirlo
    </div>
    <footer>
        Rafael-Codex · Visor de archivos HTML
    </footer>
</div>

<script>
    const rawUrl = "${rawUrl}";
    const downloadUrl = "${downloadUrl}";
    
    // Botón descargar
    document.getElementById("btnDescargar").onclick = function() {
        fetch(rawUrl)
            .then(res => res.text())
            .then(html => {
                const blob = new Blob([html], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "${escapeHtml(archivo.nombre).replace(/[^a-z0-9]/gi, '_')}.html";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch(err => {
                alert("Error al descargar: " + err.message);
                window.open(rawUrl, "_blank");
            });
    };
    
    // Botón compartir
    document.getElementById("btnCompartir").onclick = function() {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: "${escapeHtml(archivo.nombre)}",
                text: "Mira este increíble archivo HTML en Rafael-Codex",
                url: url
            }).catch(() => copyToClipboard(url));
        } else {
            copyToClipboard(url);
        }
    };
    
    // Botón nueva pestaña
    document.getElementById("btnNuevaPestana").onclick = function() {
        window.open(rawUrl, "_blank");
    };
    
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert("✅ Enlace copiado al portapapeles\\n\\n" + text);
        }).catch(() => {
            prompt("❌ Copia manualmente este enlace:", text);
        });
    }
    
    // Recargar iframe si es necesario
    const iframe = document.getElementById("visorFrame");
    iframe.onerror = function() {
        console.log("Error cargando iframe");
    };
</script>
</body>
</html>`;
}

// Endpoint para descarga directa
app.get("/descargar/:id", (req, res) => {
    const archivo = archivos.find(a => a.id == req.params.id);
    
    if (!archivo || !archivo.contenido) {
        return res.status(404).send("Archivo no encontrado");
    }
    
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(archivo.nombre)}.html"`);
    res.send(archivo.contenido);
});

// Función auxiliar
function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ========== INICIAR SERVIDOR ==========
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`
    🚀 Servidor Rafael-Codex corriendo
    📡 Puerto: ${PORT}
    🌐 URL: http://localhost:${PORT}
    📁 Archivos guardados: ${archivos.length}
    `);
});