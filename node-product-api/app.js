const fs = require("fs");
const { auth } = require("express-oauth2-jwt-bearer");
const express = require("express");
const app = express();
const port = 3001;
const bodyParser = require("body-parser");
const db = require("./db");
const checkJwt = auth({
  audience: "https://fiap/api",
  issuerBaseURL: "https://dev-zny4hpxlvmzmmxbl.us.auth0.com/",
});
var privateKey = fs.readFileSync("./sslcert/selfsigned.key", "utf8");
var certificate = fs.readFileSync("./sslcert/selfsigned.crt", "utf8");
var https = require("https");
var RateLimit = require("express-rate-limit");
var cookieParser = require("cookie-parser");
var credentials = { key: privateKey, cert: certificate };
var httpsServer = https.createServer(credentials, app);
var limiter = new RateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  delayMs: 0,
  message:
    "Too many accounts created from this IP, please try again after an hour",
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(limiter);
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, authorization");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.get("/products", checkJwt, async (req, res, next) => {
  var resp = await db.getAllProducts();
  res.status(200).json(resp);
});

app.post("/products", checkJwt, async (req, res, next) => {
  try {
    var name = req.body.name;
    var description = req.body.description;
    var value = req.body.value;

    // Validação dos campos de entrada
    if (
      !validator.isLength(name, { min: 1, max: 100 }) ||
      !validator.isLength(description, { min: 1, max: 1000 }) ||
      !validator.isNumeric(value, { no_symbols: true })
    ) {
      return res.status(400).json({ message: "Dados de entrada inválidos!" });
    }

    await db.insertProduct(name, description, value);
    return res.status(200).json({ message: "Produto cadastrado com sucesso!" });
  } catch (err) {
    return res.status(err.code).json(err);
  }
});

app.get("/products/:id", checkJwt, async (req, res, next) => {
  try {
    var id = req.params.id;
    const [rows] = await db.getProductById(id);
    if (rows) {
      return res.status(200).send(rows);
    }
    return res.status(404).send(`Produto ${id} não encontrado!`);
  } catch (err) {
    return res.status(err.code).json(err);
  }
});

app.put("/products/:id", checkJwt, async (req, res, next) => {
  try {
    var id = req.params.id;

    var name = req.body.name;
    var description = req.body.description;
    var value = req.body.value;

    const rows = await db.updateProductById(id, name, description, value);
    if (rows) {
      return res
        .status(200)
        .send({ message: "Produto atualizado com sucesso!" });
    }
    return res.status(404).send(`Produto ${id} atualizado com sucesso!`);
  } catch (err) {
    return res.status(err.code).json(err);
  }
});

app.delete("/products/:id", checkJwt, async (req, res, next) => {
  try {
    var id = req.params.id;
    await db.deleteProductById(id);
    return res
      .status(200)
      .send({ message: `Produto ${id} deletado com sucesso!` });
  } catch (err) {
    return res.status(err.code).json(err);
  }
});

httpsServer.listen(port, () => {
  console.log(`Listening at https://localhost:${port}`);
});
