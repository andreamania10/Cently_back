const validateEnv = require("./config/validateEnv");
validateEnv(); // si falta alguna variable, el servidor s'atura aquí

const app = require("./app");
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escoltant a http://localhost:${PORT}`);
});
