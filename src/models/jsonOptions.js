module.exports = (ocultar = []) => ({
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    ocultar.forEach((campo) => delete ret[campo]);
    return ret;
  },
});