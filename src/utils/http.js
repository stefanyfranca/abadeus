const ID_REGEX = /^[0-9a-fA-F]{24}$/;
const idValido = (id) => ID_REGEX.test(String(id));

function tratarErro(res, err, chave = "message") {
  if (err.name === "ValidationError" || err.name === "CastError") {
    return res.status(400).json({ [chave]: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ [chave]: "Registro duplicado" });
  }
  console.error(err);
  return res.status(500).json({ [chave]: "Erro interno do servidor" });
}

module.exports = { idValido, tratarErro };