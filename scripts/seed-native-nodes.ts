import { PrismaClient } from "@prisma/client";

const nativeNodes = [
  {
    nodeId: "pdf_generate",
    name: "Генерація PDF",
    category: "Documents",
    replaces: ["pdfshift", "html2pdf", "wkhtmltopdf"],
    inputSchema: { type: "object", properties: { html: { type: "string" }, options: { type: "object" } } },
    outputSchema: { type: "object", properties: { buffer: { type: "string" }, size: { type: "number" } } },
    executorCode: `
      const PDFDocument = require("pdfkit");
      const chunks = [];
      const doc = new PDFDocument();
      doc.on("data", (chunk) => chunks.push(chunk));
      const text = input.html ? input.html.replace(/<[^>]*>/g, "") : input.text || "Empty document";
      doc.fontSize(12).text(text, 50, 50);
      doc.end();
      await new Promise((resolve) => doc.on("end", resolve));
      const buffer = Buffer.concat(chunks);
      return { buffer: buffer.toString("base64"), size: buffer.length };
    `,
    testCases: [{ input: { html: "<p>Hello</p>" }, config: {}, expected_output: { size: 0 } }],
  },
  {
    nodeId: "pdf_merge",
    name: "Об'єднання PDF",
    category: "Documents",
    replaces: ["ilovepdf"],
    inputSchema: { type: "object", properties: { pdfs: { type: "array", items: { type: "string" } } } },
    outputSchema: { type: "object", properties: { buffer: { type: "string" }, pageCount: { type: "number" } } },
    executorCode: `
      const { PDFDocument } = require("pdf-lib");
      const merged = await PDFDocument.create();
      const pdfs = input.pdfs || [];
      for (const pdfBase64 of pdfs) {
        const doc = await PDFDocument.load(Buffer.from(pdfBase64, "base64"));
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      const bytes = await merged.save();
      return { buffer: Buffer.from(bytes).toString("base64"), pageCount: merged.getPageCount() };
    `,
    testCases: [{ input: { pdfs: [] }, config: {}, expected_output: { pageCount: 0 } }],
  },
  {
    nodeId: "image_resize",
    name: "Зміна розміру зображення",
    category: "Media",
    replaces: ["cloudinary", "cloudinary_transforms"],
    inputSchema: { type: "object", properties: { image: { type: "string" }, width: { type: "number" }, height: { type: "number" } } },
    outputSchema: { type: "object", properties: { buffer: { type: "string" }, width: { type: "number" }, height: { type: "number" } } },
    executorCode: `
      const sharp = require("sharp");
      const buf = Buffer.from(input.image, "base64");
      const resized = await sharp(buf).resize(input.width || 800, input.height || 600).toBuffer();
      const meta = await sharp(resized).metadata();
      return { buffer: resized.toString("base64"), width: meta.width, height: meta.height };
    `,
    testCases: [{ input: { image: "", width: 100, height: 100 }, config: {}, expected_output: {} }],
  },
  {
    nodeId: "image_watermark",
    name: "Водяний знак",
    category: "Media",
    replaces: ["cloudinary_watermark"],
    inputSchema: { type: "object", properties: { image: { type: "string" }, text: { type: "string" }, opacity: { type: "number" } } },
    outputSchema: { type: "object", properties: { buffer: { type: "string" } } },
    executorCode: `
      const sharp = require("sharp");
      const buf = Buffer.from(input.image, "base64");
      const meta = await sharp(buf).metadata();
      const w = meta.width || 800;
      const h = meta.height || 600;
      const text = input.text || "Watermark";
      const svg = \`<svg width="\${w}" height="\${h}"><text x="50%" y="50%" font-size="48" fill="rgba(255,255,255,0.5)" text-anchor="middle" dominant-baseline="middle">\${text}</text></svg>\`;
      const result = await sharp(buf).composite([{ input: Buffer.from(svg), gravity: "center" }]).toBuffer();
      return { buffer: result.toString("base64") };
    `,
    testCases: [{ input: { image: "", text: "Test" }, config: {}, expected_output: {} }],
  },
  {
    nodeId: "html_to_image",
    name: "HTML в зображення",
    category: "Media",
    replaces: ["screenshotapi", "apiflash", "url2png"],
    inputSchema: { type: "object", properties: { html: { type: "string" }, width: { type: "number" }, height: { type: "number" } } },
    outputSchema: { type: "object", properties: { buffer: { type: "string" }, format: { type: "string" } } },
    executorCode: `
      const puppeteer = require("puppeteer");
      const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
      const page = await browser.newPage();
      await page.setViewport({ width: input.width || 1024, height: input.height || 768 });
      await page.setContent(input.html || "<html><body>Empty</body></html>");
      const screenshot = await page.screenshot({ type: "png" });
      await browser.close();
      return { buffer: screenshot.toString("base64"), format: "png" };
    `,
    testCases: [{ input: { html: "<p>Test</p>" }, config: {}, expected_output: { format: "png" } }],
  },
  {
    nodeId: "qr_code_generate",
    name: "Генерація QR коду",
    category: "Data",
    replaces: ["qr_tiger", "qr_code_api", "qrcode_monkey"],
    inputSchema: { type: "object", properties: { text: { type: "string" }, width: { type: "number" } } },
    outputSchema: { type: "object", properties: { dataUrl: { type: "string" } } },
    executorCode: `
      const QRCode = require("qrcode");
      const dataUrl = await QRCode.toDataURL(input.text || "https://example.com", { width: input.width || 256 });
      return { dataUrl };
    `,
    testCases: [{ input: { text: "hello" }, config: {}, expected_output: {} }],
  },
  {
    nodeId: "csv_parse",
    name: "Парсинг CSV",
    category: "Data",
    replaces: ["csv_parser_api", "csvjson_api"],
    inputSchema: { type: "object", properties: { csv: { type: "string" }, delimiter: { type: "string" } } },
    outputSchema: { type: "object", properties: { data: { type: "array" }, fields: { type: "array" }, rowCount: { type: "number" } } },
    executorCode: `
      const Papa = require("papaparse");
      const result = Papa.parse(input.csv || "", { header: true, delimiter: input.delimiter || "," });
      return { data: result.data, fields: result.meta.fields || [], rowCount: result.data.length };
    `,
    testCases: [{ input: { csv: "name,age\\nAlice,30\\nBob,25" }, config: {}, expected_output: { rowCount: 2 } }],
  },
  {
    nodeId: "xlsx_generate",
    name: "Генерація XLSX",
    category: "Documents",
    replaces: ["sheetmonkey", "sheet_api"],
    inputSchema: { type: "object", properties: { data: { type: "array" }, sheetName: { type: "string" } } },
    outputSchema: { type: "object", properties: { buffer: { type: "string" } } },
    executorCode: `
      const XLSX = require("xlsx");
      const ws = XLSX.utils.json_to_sheet(input.data || []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, input.sheetName || "Sheet1");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return { buffer: Buffer.from(buf).toString("base64") };
    `,
    testCases: [{ input: { data: [{ a: 1, b: 2 }] }, config: {}, expected_output: {} }],
  },
  {
    nodeId: "markdown_to_html",
    name: "Markdown в HTML",
    category: "Data",
    replaces: ["markdown_api", "markdownify"],
    inputSchema: { type: "object", properties: { markdown: { type: "string" } } },
    outputSchema: { type: "object", properties: { html: { type: "string" } } },
    executorCode: `
      const { marked } = require("marked");
      const html = marked.parse(input.markdown || "");
      return { html };
    `,
    testCases: [{ input: { markdown: "# Hello\\nWorld" }, config: {}, expected_output: {} }],
  },
  {
    nodeId: "json_transform",
    name: "Трансформація JSON",
    category: "Data",
    replaces: ["jq_api", "transform_api", "jsonata_api"],
    inputSchema: { type: "object", properties: { data: {}, expression: { type: "string" } } },
    outputSchema: { type: "object", properties: { result: {} } },
    executorCode: `
      const data = input.data;
      const expr = input.expression || "data";
      const fn = new Function("data", "return " + expr);
      const result = fn(data);
      return { result };
    `,
    testCases: [{ input: { data: { a: 1 }, expression: "data.a + 1" }, config: {}, expected_output: { result: 2 } }],
  },
  {
    nodeId: "html_template",
    name: "HTML шаблон",
    category: "Data",
    replaces: ["handlebars_api", "template_api"],
    inputSchema: { type: "object", properties: { template: { type: "string" }, data: { type: "object" } } },
    outputSchema: { type: "object", properties: { html: { type: "string" } } },
    executorCode: `
      const Handlebars = require("handlebars");
      const compiled = Handlebars.compile(input.template || "");
      const html = compiled(input.data || {});
      return { html };
    `,
    testCases: [{ input: { template: "Hello {{name}}", data: { name: "World" } }, config: {}, expected_output: { html: "Hello World" } }],
  },
  {
    nodeId: "text_extract_regex",
    name: "Regex витяг тексту",
    category: "Data",
    replaces: ["parse_api", "regex_api"],
    inputSchema: { type: "object", properties: { text: { type: "string" }, pattern: { type: "string" }, flags: { type: "string" } } },
    outputSchema: { type: "object", properties: { matches: { type: "array" }, found: { type: "boolean" } } },
    executorCode: `
      const regex = new RegExp(input.pattern || ".*", input.flags || "g");
      const matches = [...(input.text || "").matchAll(regex)].map((m) => m[0]);
      return { matches, found: matches.length > 0 };
    `,
    testCases: [{ input: { text: "hello 123 world 456", pattern: "\\\\d+", flags: "g" }, config: {}, expected_output: { found: true } }],
  },
  {
    nodeId: "data_validate",
    name: "Валідація даних",
    category: "Data",
    replaces: ["validation_api", "jsonschema_api"],
    inputSchema: { type: "object", properties: { data: {}, schema: { type: "object" } } },
    outputSchema: { type: "object", properties: { valid: { type: "boolean" }, errors: { type: "array" } } },
    executorCode: `
      const errors = [];
      const schema = input.schema || {};
      const data = input.data;
      if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
          if (data === null || data === undefined || !(field in data)) {
            errors.push("Missing required field: " + field);
          }
        }
      }
      if (schema.type && typeof data !== schema.type && schema.type !== "object") {
        errors.push("Expected type " + schema.type + ", got " + typeof data);
      }
      return { valid: errors.length === 0, errors };
    `,
    testCases: [{ input: { data: { name: "test" }, schema: { required: ["name"] } }, config: {}, expected_output: { valid: true } }],
  },
  {
    nodeId: "date_format",
    name: "Форматування дати",
    category: "Data",
    replaces: ["moment_api", "date_api"],
    inputSchema: { type: "object", properties: { date: { type: "string" }, format: { type: "string" }, timezone: { type: "string" } } },
    outputSchema: { type: "object", properties: { formatted: { type: "string" }, timestamp: { type: "number" } } },
    executorCode: `
      const d = input.date ? new Date(input.date) : new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const fmt = input.format || "YYYY-MM-DD HH:mm:ss";
      const formatted = fmt
        .replace("YYYY", String(d.getFullYear()))
        .replace("MM", pad(d.getMonth() + 1))
        .replace("DD", pad(d.getDate()))
        .replace("HH", pad(d.getHours()))
        .replace("mm", pad(d.getMinutes()))
        .replace("ss", pad(d.getSeconds()));
      return { formatted, timestamp: d.getTime() };
    `,
    testCases: [{ input: { date: "2024-01-15T10:30:00Z", format: "YYYY-MM-DD" }, config: {}, expected_output: { formatted: "2024-01-15" } }],
  },
  {
    nodeId: "email_send",
    name: "Відправка email (SMTP)",
    category: "Communication",
    replaces: ["sendgrid", "mailgun", "postmark", "ses"],
    inputSchema: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, html: { type: "string" }, from: { type: "string" } } },
    outputSchema: { type: "object", properties: { messageId: { type: "string" }, accepted: { type: "array" } } },
    executorCode: `
      const nodemailer = require("nodemailer");
      const transport = nodemailer.createTransport({
        host: config.smtp_host || process.env.SMTP_HOST || "localhost",
        port: parseInt(config.smtp_port || process.env.SMTP_PORT || "587"),
        secure: false,
        auth: config.smtp_user ? { user: config.smtp_user, pass: config.smtp_pass } : undefined,
      });
      const info = await transport.sendMail({
        from: input.from || config.from || "noreply@autoact.io",
        to: input.to,
        subject: input.subject || "No Subject",
        html: input.html || "",
      });
      return { messageId: info.messageId, accepted: info.accepted || [] };
    `,
    testCases: [{ input: { to: "test@test.com", subject: "Test" }, config: {}, expected_output: {} }],
  },
  {
    nodeId: "file_compress",
    name: "Компресія файлів",
    category: "Documents",
    replaces: ["compress_api", "zip_api"],
    inputSchema: { type: "object", properties: { files: { type: "array" } } },
    outputSchema: { type: "object", properties: { buffer: { type: "string" }, size: { type: "number" } } },
    executorCode: `
      const archiver = require("archiver");
      const { PassThrough } = require("stream");
      const chunks = [];
      const stream = new PassThrough();
      stream.on("data", (chunk) => chunks.push(chunk));
      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(stream);
      for (const file of (input.files || [])) {
        archive.append(Buffer.from(file.content || "", "base64"), { name: file.name || "file.txt" });
      }
      await archive.finalize();
      await new Promise((resolve) => stream.on("end", resolve));
      const buf = Buffer.concat(chunks);
      return { buffer: buf.toString("base64"), size: buf.length };
    `,
    testCases: [{ input: { files: [] }, config: {}, expected_output: {} }],
  },
  {
    nodeId: "base64_encode",
    name: "Base64 кодування/декодування",
    category: "Data",
    replaces: ["base64_api"],
    inputSchema: { type: "object", properties: { data: { type: "string" }, action: { type: "string" } } },
    outputSchema: { type: "object", properties: { result: { type: "string" } } },
    executorCode: `
      const action = input.action || "encode";
      if (action === "decode") {
        return { result: Buffer.from(input.data || "", "base64").toString("utf-8") };
      }
      return { result: Buffer.from(input.data || "").toString("base64") };
    `,
    testCases: [
      { input: { data: "Hello", action: "encode" }, config: {}, expected_output: { result: "SGVsbG8=" } },
      { input: { data: "SGVsbG8=", action: "decode" }, config: {}, expected_output: { result: "Hello" } },
    ],
  },
  {
    nodeId: "hash_generate",
    name: "Генерація хешу",
    category: "Data",
    replaces: ["hash_api", "crypto_api"],
    inputSchema: { type: "object", properties: { data: { type: "string" }, algorithm: { type: "string" } } },
    outputSchema: { type: "object", properties: { hash: { type: "string" }, algorithm: { type: "string" } } },
    executorCode: `
      const crypto = require("crypto");
      const algo = input.algorithm || "sha256";
      const hash = crypto.createHash(algo).update(input.data || "").digest("hex");
      return { hash, algorithm: algo };
    `,
    testCases: [{ input: { data: "hello", algorithm: "md5" }, config: {}, expected_output: { algorithm: "md5" } }],
  },
  {
    nodeId: "url_shorten",
    name: "Скорочення URL",
    category: "Communication",
    replaces: ["bitly", "tinyurl_api", "rebrandly"],
    inputSchema: { type: "object", properties: { url: { type: "string" } } },
    outputSchema: { type: "object", properties: { shortId: { type: "string" }, shortUrl: { type: "string" }, originalUrl: { type: "string" } } },
    executorCode: `
      const crypto = require("crypto");
      const shortId = crypto.createHash("sha256").update(input.url || "").digest("hex").slice(0, 8);
      const baseUrl = config.base_url || process.env.API_URL || "http://localhost:3001";
      return { shortId, shortUrl: baseUrl + "/s/" + shortId, originalUrl: input.url || "" };
    `,
    testCases: [{ input: { url: "https://example.com/very/long/url" }, config: {}, expected_output: {} }],
  },
  {
    nodeId: "webhook_call",
    name: "HTTP виклик",
    category: "Communication",
    replaces: [],
    inputSchema: { type: "object", properties: { url: { type: "string" }, method: { type: "string" }, headers: { type: "object" }, body: {} } },
    outputSchema: { type: "object", properties: { status: { type: "number" }, body: {}, headers: { type: "object" } } },
    executorCode: `
      const url = input.url;
      if (!url) throw new Error("URL is required");
      const method = (input.method || "GET").toUpperCase();
      const headers = input.headers || {};
      let body = undefined;
      if (input.body && method !== "GET" && method !== "HEAD") {
        body = typeof input.body === "string" ? input.body : JSON.stringify(input.body);
        if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
      }
      const response = await fetch(url, { method, headers, body });
      const contentType = response.headers.get("content-type") || "";
      const respBody = contentType.includes("json") ? await response.json() : await response.text();
      return { status: response.status, body: respBody, headers: Object.fromEntries(response.headers.entries()) };
    `,
    testCases: [{ input: { url: "https://httpbin.org/get", method: "GET" }, config: {}, expected_output: { status: 200 } }],
  },
];

async function seedNativeNodes() {
  const prisma = new PrismaClient();

  console.log(`Seeding ${nativeNodes.length} native nodes...`);

  for (const node of nativeNodes) {
    await prisma.nativeNode.upsert({
      where: { nodeId: node.nodeId },
      update: {
        name: node.name,
        category: node.category,
        replaces: node.replaces,
        inputSchema: node.inputSchema,
        outputSchema: node.outputSchema,
        executorCode: node.executorCode.trim(),
        testCases: node.testCases,
      },
      create: {
        nodeId: node.nodeId,
        name: node.name,
        category: node.category,
        replaces: node.replaces,
        inputSchema: node.inputSchema,
        outputSchema: node.outputSchema,
        executorCode: node.executorCode.trim(),
        testCases: node.testCases,
        status: "active",
        isAiGenerated: false,
      },
    });
  }

  console.log("Native nodes seeded successfully!");
  await prisma.$disconnect();
}

seedNativeNodes().catch(console.error);

export { nativeNodes, seedNativeNodes };
